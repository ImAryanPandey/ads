// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const authMiddleware = require('../middleware/auth');

// Fetch messages for a specific request
router.get('/messages/request/:requestId', authMiddleware, async (req, res) => {
  try {
    const messages = await ChatMessage.find({ requestId: req.params.requestId })
      .populate('sender', 'name')
      .populate('recipient', 'name')
      .populate('adSpaceId', 'title')
      .sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Fetch unread message count
router.get('/unread', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await ChatMessage.countDocuments({
      recipient: userId,
      read: { $ne: true },
    });
    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

// Mark messages as read for a request
router.post('/mark-read/:requestId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    await ChatMessage.updateMany(
      { requestId: req.params.requestId, recipient: userId, read: false },
      { $set: { read: true } }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
});

module.exports = router;