const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const { emitToUser } = require('../socket');

/**
 * Check if MongoDB is connected
 */
const isDatabaseConnected = () => mongoose.connection.readyState === 1;

/**
 * Create a persistent notification in MongoDB and emit via Socket.IO
 * @param {Object} data - Notification fields
 * @returns {Promise<Object>} Created notification document
 */
async function createAndSendNotification({
  recipient,
  sender = null,
  type,
  title,
  message,
  booking = null,
  resource = null,
  link = '',
  metadata = {},
}) {
  if (!recipient) {
    throw new Error('Recipient is required for notification');
  }

  if (!type || !title || !message) {
    throw new Error('type, title, and message are required for notification');
  }

  // 1. Authoritative persistence in MongoDB first
  let notification = null;
  if (isDatabaseConnected()) {
    notification = await Notification.create({
      recipient,
      sender,
      type,
      title: String(title).trim(),
      message: String(message).trim(),
      booking,
      resource,
      link: String(link).trim(),
      metadata,
      isRead: false,
    });
  } else {
    // Graceful offline fallback in-memory representation
    notification = {
      _id: new mongoose.Types.ObjectId(),
      recipient,
      sender,
      type,
      title,
      message,
      booking,
      resource,
      link,
      metadata,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // 2. Real-time emission via Socket.IO
  const payload = typeof notification.toJSON === 'function' ? notification.toJSON() : { ...notification };
  try {
    emitToUser(recipient.toString(), 'notification:new', payload);
  } catch (err) {
    // Non-blocking: notification remains safely persisted in MongoDB
    console.error('Socket notification dispatch warning:', err.message);
  }

  return notification;
}

/**
 * Check active checked_in bookings approaching deadline and send reminders
 * Ensures idempotency: prevents duplicate reminders for the same booking.
 * @param {Object} options
 * @param {number} options.reminderWindowMinutes - Minutes before deadline to alert (default: 120 mins / 2 hours)
 * @returns {Promise<Object>} Summary of processed and sent reminders
 */
async function checkAndSendDeadlineReminders({ reminderWindowMinutes = 120 } = {}) {
  if (!isDatabaseConnected()) {
    return { processedCount: 0, sentCount: 0, reminders: [] };
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + reminderWindowMinutes * 60 * 1000);

  // 1. Find active checked-in bookings ending within the reminder window
  const eligibleBookings = await Booking.find({
    status: 'checked_in',
    endAt: { $gte: now, $lte: windowEnd },
  }).populate('resource', 'title');

  const sentReminders = [];

  for (const booking of eligibleBookings) {
    // 2. Check if a reminder has already been generated for this booking
    const alreadySent = await Notification.findOne({
      booking: booking._id,
      type: 'booking_deadline_reminder',
    });

    if (alreadySent) {
      continue; // Skip duplicate notification
    }

    // 3. Format readable time strings
    const resourceTitle = booking.resource?.title || 'Resource';
    const endFormatted = new Date(booking.endAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const notif = await createAndSendNotification({
      recipient: booking.requester,
      type: 'booking_deadline_reminder',
      title: 'Return Deadline Approaching',
      message: `Your reservation for "${resourceTitle}" ends at ${endFormatted}. Please return the item and complete check-out on time.`,
      booking: booking._id,
      resource: booking.resource?._id || booking.resource,
      link: '/dashboard?tab=my-bookings',
      metadata: {
        endAt: booking.endAt,
        reminderWindowMinutes,
      },
    });

    sentReminders.push(notif);
  }

  return {
    processedCount: eligibleBookings.length,
    sentCount: sentReminders.length,
    reminders: sentReminders,
  };
}

module.exports = {
  createAndSendNotification,
  checkAndSendDeadlineReminders,
};

