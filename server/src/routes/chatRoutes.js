const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// All chat and pickup coordination endpoints require authentication
router.use(protect);

// Conversation listing & unread badge
router.get('/conversations', chatController.getConversations);
router.get('/unread-count', chatController.getUnreadCount);

// Specific booking chat and messages
router.get('/booking/:bookingId', chatController.getConversation);
router.get('/booking/:bookingId/messages', chatController.getMessages);
router.post('/booking/:bookingId/messages', chatController.sendMessage);

// Pickup and contact coordination
router.get('/booking/:bookingId/pickup', chatController.getPickupCoordination);
router.put('/booking/:bookingId/pickup', chatController.updatePickupCoordination);

module.exports = router;

