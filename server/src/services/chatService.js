const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Booking = require('../models/Booking');
const { emitToUser } = require('../socket');
const { createAndSendNotification } = require('./notificationService');

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

/**
 * Verify if a user is an authorized participant (requester or owner) of a booking
 * @param {Object} booking - Populated or unpopulated booking document
 * @param {string|mongoose.Types.ObjectId} userId - Current user ID
 * @returns {boolean}
 */
function isParticipant(booking, userId) {
  if (!booking || !userId) return false;
  const uid = userId.toString();
  const requesterId = booking.requester?._id ? booking.requester._id.toString() : booking.requester?.toString();
  const ownerId = booking.owner?._id ? booking.owner._id.toString() : booking.owner?.toString();
  return requesterId === uid || ownerId === uid;
}

/**
 * Get or initialize conversation for a specific booking
 * Strictly verifies participation
 */
async function getOrCreateConversation(bookingId, userId) {
  if (!isDatabaseConnected()) {
    throw new Error('Database is offline. Chat is unavailable.');
  }

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error('Invalid booking ID format');
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findById(bookingId).populate('resource', 'title images category location status');
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  if (!isParticipant(booking, userId)) {
    const error = new Error('You are not an authorized participant in this booking');
    error.statusCode = 403;
    throw error;
  }

  let conversation = await Conversation.findOne({ booking: booking._id })
    .populate('resource', 'title images category location status')
    .populate('participants', 'name email department role avatar');

  if (!conversation) {
    conversation = await Conversation.create({
      booking: booking._id,
      resource: booking.resource?._id || booking.resource,
      participants: [booking.requester, booking.owner],
      lastMessage: {
        text: '',
        sentAt: new Date(),
      },
    });

    conversation = await Conversation.findById(conversation._id)
      .populate('resource', 'title images category location status')
      .populate('participants', 'name email department role avatar');
  }

  const convObj = conversation.toObject ? conversation.toObject() : conversation;
  const isRequester = booking.requester.toString() === userId.toString();
  convObj.unreadCount = isRequester ? conversation.unreadRequester || 0 : conversation.unreadOwner || 0;
  convObj.bookingStatus = booking.status;

  return convObj;
}

/**
 * Retrieve all conversations for the authenticated user
 */
async function getUserConversations(userId) {
  if (!isDatabaseConnected()) {
    return [];
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const conversations = await Conversation.find({ participants: userObjectId })
    .populate('resource', 'title images category location status')
    .populate('participants', 'name email department role avatar')
    .populate('booking', 'status startAt endAt quantity')
    .sort({ updatedAt: -1 });

  return conversations.map((conv) => {
    const obj = conv.toObject ? conv.toObject() : conv;
    const isRequester = conv.booking?.requester
      ? conv.booking.requester.toString() === userId.toString()
      : conv.participants[0]?._id?.toString() === userId.toString();

    obj.unreadCount = isRequester ? conv.unreadRequester || 0 : conv.unreadOwner || 0;
    return obj;
  });
}

/**
 * Retrieve messages for a booking conversation and mark incoming messages as read
 */
async function getMessages(bookingId, userId) {
  if (!isDatabaseConnected()) {
    throw new Error('Database is offline');
  }

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error('Invalid booking ID format');
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  if (!isParticipant(booking, userId)) {
    const error = new Error('You are not an authorized participant in this booking');
    error.statusCode = 403;
    throw error;
  }

  const conversation = await Conversation.findOne({ booking: booking._id });
  if (!conversation) {
    return [];
  }

  // Fetch messages
  const messages = await Message.find({ conversation: conversation._id })
    .populate('sender', 'name email avatar')
    .populate('recipient', 'name email avatar')
    .sort({ createdAt: 1 });

  // Mark unread messages addressed to current user as read
  const unreadCount = await Message.countDocuments({
    conversation: conversation._id,
    recipient: userId,
    isRead: false,
  });

  if (unreadCount > 0) {
    await Message.updateMany(
      { conversation: conversation._id, recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    const isRequester = booking.requester.toString() === userId.toString();
    if (isRequester) {
      conversation.unreadRequester = 0;
    } else {
      conversation.unreadOwner = 0;
    }
    await conversation.save();

    // Notify other participant of read status in real-time
    const otherParticipantId = isRequester ? booking.owner.toString() : booking.requester.toString();
    emitToUser(otherParticipantId, 'chat:read', {
      bookingId: booking._id.toString(),
      conversationId: conversation._id.toString(),
      readBy: userId.toString(),
    });

    // Notify current user's unread counter update
    const totalUnread = await getTotalUnreadCount(userId);
    emitToUser(userId, 'chat:unread_update', { count: totalUnread });
  }

  return messages;
}

/**
 * Send a message within a booking conversation
 */
async function sendMessage(bookingId, senderId, text) {
  if (!isDatabaseConnected()) {
    throw new Error('Database is offline');
  }

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error('Invalid booking ID format');
    error.statusCode = 400;
    throw error;
  }

  const cleanText = typeof text === 'string' ? text.trim() : '';
  if (!cleanText || cleanText.length === 0) {
    const error = new Error('Message text cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  if (cleanText.length > 2000) {
    const error = new Error('Message cannot exceed 2000 characters');
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findById(bookingId).populate('resource', 'title');
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  if (!isParticipant(booking, senderId)) {
    const error = new Error('You are not an authorized participant in this booking');
    error.statusCode = 403;
    throw error;
  }

  const isRequester = booking.requester.toString() === senderId.toString();
  const recipientId = isRequester ? booking.owner : booking.requester;

  let conversation = await Conversation.findOne({ booking: booking._id });
  if (!conversation) {
    conversation = await Conversation.create({
      booking: booking._id,
      resource: booking.resource?._id || booking.resource,
      participants: [booking.requester, booking.owner],
    });
  }

  // Create message
  const message = await Message.create({
    conversation: conversation._id,
    booking: booking._id,
    sender: senderId,
    recipient: recipientId,
    text: cleanText,
    isRead: false,
  });

  // Update conversation lastMessage & unread count
  conversation.lastMessage = {
    text: cleanText,
    sender: senderId,
    sentAt: new Date(),
  };

  if (isRequester) {
    conversation.unreadOwner = (conversation.unreadOwner || 0) + 1;
  } else {
    conversation.unreadRequester = (conversation.unreadRequester || 0) + 1;
  }
  await conversation.save();

  // Populate sender details for immediate socket dispatch
  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'name email avatar')
    .populate('recipient', 'name email avatar');

  const messagePayload = populatedMessage.toObject ? populatedMessage.toObject() : populatedMessage;

  // Real-time socket emission to recipient and sender
  emitToUser(recipientId.toString(), 'chat:message', messagePayload);
  emitToUser(senderId.toString(), 'chat:message', messagePayload);

  // Emit unread counter update to recipient
  const recipientUnread = await getTotalUnreadCount(recipientId);
  emitToUser(recipientId.toString(), 'chat:unread_update', { count: recipientUnread });

  // Create standard in-app Notification for recipient
  try {
    const resourceTitle = booking.resource?.title || 'Resource';
    await createAndSendNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'chat_message',
      title: `New message: ${resourceTitle}`,
      message: cleanText.length > 80 ? cleanText.substring(0, 77) + '...' : cleanText,
      booking: booking._id,
      resource: booking.resource?._id || booking.resource,
      link: `/chat?booking=${booking._id}`,
      metadata: {
        bookingId: booking._id.toString(),
        conversationId: conversation._id.toString(),
      },
    });
  } catch (notifErr) {
    console.error('Failed to dispatch notification for chat message:', notifErr.message);
  }

  return messagePayload;
}

/**
 * Get total unread message count for a user across all conversations
 */
async function getTotalUnreadCount(userId) {
  if (!isDatabaseConnected() || !userId) {
    return 0;
  }
  return Message.countDocuments({
    recipient: new mongoose.Types.ObjectId(userId),
    isRead: false,
  });
}

/**
 * Get Pickup Coordination details for an approved booking
 */
async function getPickupCoordination(bookingId, userId) {
  if (!isDatabaseConnected()) {
    throw new Error('Database is offline');
  }

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error('Invalid booking ID format');
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findById(bookingId).populate('resource', 'title location');
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  if (!isParticipant(booking, userId)) {
    const error = new Error('You are not an authorized participant in this booking');
    error.statusCode = 403;
    throw error;
  }

  const isRequester = booking.requester.toString() === userId.toString();
  const isApproved = ['approved', 'checked_in', 'completed'].includes(booking.status);

  if (!isApproved) {
    return {
      isLocked: true,
      bookingStatus: booking.status,
      message: 'Pickup coordination details are unlocked once the booking is approved by the custodian.',
      exactLocation: '',
      instructions: '',
      targetTime: null,
      sharedContactPhone: null,
    };
  }

  const coord = booking.pickupCoordination || {};

  // Phone privacy rule:
  // If requester is viewing, only show owner's phone if owner enabled sharePhoneWithRequester
  // If owner is viewing, only show requester's phone if requester enabled sharePhoneWithOwner
  let contactPhone = null;
  if (isRequester) {
    if (coord.sharePhoneWithRequester && coord.ownerPhone) {
      contactPhone = coord.ownerPhone;
    }
  } else {
    if (coord.sharePhoneWithOwner && coord.requesterPhone) {
      contactPhone = coord.requesterPhone;
    }
  }

  return {
    isLocked: false,
    bookingStatus: booking.status,
    exactLocation: coord.exactLocation || '',
    instructions: coord.instructions || '',
    targetTime: coord.targetTime || null,
    sharedContactPhone: contactPhone,
    myPhone: isRequester ? coord.requesterPhone || '' : coord.ownerPhone || '',
    myPhoneShared: isRequester ? Boolean(coord.sharePhoneWithOwner) : Boolean(coord.sharePhoneWithRequester),
    lastUpdatedAt: coord.lastUpdatedAt || null,
    lastUpdatedBy: coord.lastUpdatedBy || null,
  };
}

/**
 * Update Pickup Coordination details
 */
async function updatePickupCoordination(bookingId, userId, payload) {
  if (!isDatabaseConnected()) {
    throw new Error('Database is offline');
  }

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error('Invalid booking ID format');
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  if (!isParticipant(booking, userId)) {
    const error = new Error('You are not an authorized participant in this booking');
    error.statusCode = 403;
    throw error;
  }

  const isApproved = ['approved', 'checked_in', 'completed'].includes(booking.status);
  if (!isApproved) {
    const error = new Error('Pickup coordination can only be updated for approved bookings');
    error.statusCode = 400;
    throw error;
  }

  const isRequester = booking.requester.toString() === userId.toString();
  if (!booking.pickupCoordination) {
    booking.pickupCoordination = {};
  }

  // Owner specific updates
  if (!isRequester) {
    if (payload.exactLocation !== undefined) {
      booking.pickupCoordination.exactLocation = String(payload.exactLocation).trim().slice(0, 300);
    }
    if (payload.instructions !== undefined) {
      booking.pickupCoordination.instructions = String(payload.instructions).trim().slice(0, 1000);
    }
    if (payload.ownerPhone !== undefined) {
      booking.pickupCoordination.ownerPhone = String(payload.ownerPhone).trim().slice(0, 30);
    }
    if (payload.sharePhoneWithRequester !== undefined) {
      booking.pickupCoordination.sharePhoneWithRequester = Boolean(payload.sharePhoneWithRequester);
    }
  }

  // Requester specific updates
  if (isRequester) {
    if (payload.requesterPhone !== undefined) {
      booking.pickupCoordination.requesterPhone = String(payload.requesterPhone).trim().slice(0, 30);
    }
    if (payload.sharePhoneWithOwner !== undefined) {
      booking.pickupCoordination.sharePhoneWithOwner = Boolean(payload.sharePhoneWithOwner);
    }
  }

  // Both can propose or adjust target pickup time
  if (payload.targetTime !== undefined) {
    booking.pickupCoordination.targetTime = payload.targetTime ? new Date(payload.targetTime) : null;
  }

  booking.pickupCoordination.lastUpdatedAt = new Date();
  booking.pickupCoordination.lastUpdatedBy = userId;

  await booking.save();

  // Real-time socket notification to other participant
  const otherParticipantId = isRequester ? booking.owner.toString() : booking.requester.toString();
  emitToUser(otherParticipantId, 'chat:pickup_updated', {
    bookingId: booking._id.toString(),
    updatedBy: userId.toString(),
  });

  return getPickupCoordination(bookingId, userId);
}

module.exports = {
  isParticipant,
  getOrCreateConversation,
  getUserConversations,
  getMessages,
  sendMessage,
  getTotalUnreadCount,
  getPickupCoordination,
  updatePickupCoordination,
};
