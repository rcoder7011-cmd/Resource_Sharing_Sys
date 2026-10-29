const chatService = require('../services/chatService');

/**
 * GET /api/chat/conversations
 * Fetch all conversations for authenticated user
 */
async function getConversations(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const conversations = await chatService.getUserConversations(userId);
    return res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations,
    });
  } catch (err) {
    console.error('getConversations error:', err.message);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to retrieve conversations',
    });
  }
}

/**
 * GET /api/chat/booking/:bookingId
 * Fetch or initialize conversation for a specific booking
 */
async function getConversation(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { bookingId } = req.params;
    const conversation = await chatService.getOrCreateConversation(bookingId, userId);
    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (err) {
    console.error('getConversation error:', err.message);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to retrieve conversation',
    });
  }
}

/**
 * GET /api/chat/booking/:bookingId/messages
 * Fetch messages for a booking conversation (marks incoming as read)
 */
async function getMessages(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { bookingId } = req.params;
    const messages = await chatService.getMessages(bookingId, userId);
    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (err) {
    console.error('getMessages error:', err.message);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to retrieve messages',
    });
  }
}

/**
 * POST /api/chat/booking/:bookingId/messages
 * Send a message within a booking conversation
 */
async function sendMessage(req, res) {
  try {
    const senderId = req.user._id || req.user.id;
    const { bookingId } = req.params;
    const { text } = req.body;

    const message = await chatService.sendMessage(bookingId, senderId, text);
    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (err) {
    console.error('sendMessage error:', err.message);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to send message',
    });
  }
}

/**
 * GET /api/chat/unread-count
 * Get total unread messages count for current user
 */
async function getUnreadCount(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const count = await chatService.getTotalUnreadCount(userId);
    return res.status(200).json({
      success: true,
      count,
    });
  } catch (err) {
    console.error('getUnreadCount error:', err.message);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to retrieve unread count',
    });
  }
}

/**
 * GET /api/chat/booking/:bookingId/pickup
 * Get pickup coordination details (only for approved bookings)
 */
async function getPickupCoordination(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { bookingId } = req.params;
    const coordination = await chatService.getPickupCoordination(bookingId, userId);
    return res.status(200).json({
      success: true,
      data: coordination,
    });
  } catch (err) {
    console.error('getPickupCoordination error:', err.message);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to retrieve pickup coordination details',
    });
  }
}

/**
 * PUT /api/chat/booking/:bookingId/pickup
 * Update pickup coordination details
 */
async function updatePickupCoordination(req, res) {
  try {
    const userId = req.user._id || req.user.id;
    const { bookingId } = req.params;
    const coordination = await chatService.updatePickupCoordination(bookingId, userId, req.body);
    return res.status(200).json({
      success: true,
      data: coordination,
    });
  } catch (err) {
    console.error('updatePickupCoordination error:', err.message);
    const status = err.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to update pickup coordination details',
    });
  }
}

module.exports = {
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  getUnreadCount,
  getPickupCoordination,
  updatePickupCoordination,
};

