// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const Conversation = require('../models/Conversation');
const Request = require('../models/Request');
const User = require('../models/User');
const AdSpace = require('../models/AdSpace');
const nodemailer = require('nodemailer');
const { auth } = require('../middleware/auth');

// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper function to find or create a conversation
const findOrCreateConversation = async (user1Id, user2Id, adSpaceId = null) => {
  const participants = [user1Id, user2Id].sort();
  let conversation = await Conversation.findOne({
    participants: { $all: participants, $size: 2 },
  });

  if (!conversation) {
    conversation = new Conversation({ participants });
    if (adSpaceId) {
      conversation.adSpaces = [adSpaceId];
    }
    await conversation.save();
  } else if (adSpaceId && !conversation.adSpaces.includes(adSpaceId)) {
    conversation.adSpaces.push(adSpaceId);
    await conversation.save();
  }

  return conversation;
};

// Fetch messages for a conversation with pagination
router.get('/messages/conversation/:conversationId', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await ChatMessage.find({ conversationId: req.params.conversationId })
      .populate('sender', 'name')
      .populate('recipient', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const totalMessages = await ChatMessage.countDocuments({ conversationId: req.params.conversationId });

    res.json({
      messages: messages.reverse(),
      totalPages: Math.ceil(totalMessages / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Fetch or create conversation by request ID
router.get('/conversation/request/:requestId', auth, async (req, res) => {
  try {
    console.log(`Fetching request with ID: ${req.params.requestId}`);

    // Check if req.user is set by auth middleware
    if (!req.user || !req.user._id) {
      console.error('Auth middleware failed: req.user is undefined or missing _id');
      return res.status(401).json({ message: 'Unauthorized: No user authenticated' });
    }

    const request = await Request.findById(req.params.requestId)
      .populate('sender', 'name email')
      .populate('owner', 'name email')
      .populate('adSpace', 'title images');

    if (!request) {
      console.error(`Request ${req.params.requestId} not found`);
      return res.status(404).json({ message: 'Request not found' });
    }
    console.log('Request found:', {
      id: request._id.toString(),
      senderId: request.sender?._id?.toString(),
      ownerId: request.owner?._id?.toString(),
      adSpaceId: request.adSpace?._id?.toString(),
      adSpaceTitle: request.adSpace?.title,
    });

    // Validate sender and owner
    if (!request.sender?._id || !request.owner?._id) {
      console.error('Request missing sender or owner:', {
        sender: request.sender,
        owner: request.owner,
      });
      return res.status(400).json({ message: 'Invalid request: missing sender or owner' });
    }

    // Authorization check
    const userId = req.user._id.toString();
    const senderId = request.sender._id.toString();
    const ownerId = request.owner._id.toString();
    if (userId !== senderId && userId !== ownerId) {
      console.error(`Unauthorized access by user ${userId} for request ${req.params.requestId}`);
      return res.status(403).json({ message: 'Unauthorized: You are not a participant' });
    }

    // Find or create conversation based on participants
    const participants = [request.sender._id, request.owner._id].sort();
    let conversation = await Conversation.findOne({
      participants: { $all: participants, $size: 2 },
    });

    if (!conversation) {
      console.log(`No existing conversation found for participants ${participants}, creating new one`);
      conversation = new Conversation({
        participants,
        adSpaces: request.adSpace?._id ? [request.adSpace._id] : [],
      });
      await conversation.save();
      console.log(`New conversation created with ID: ${conversation._id}`);

      // Add system message if adSpace exists
      if (request.adSpace?.title) {
        const systemMessage = new ChatMessage({
          conversationId: conversation._id,
          sender: request.sender._id,
          recipient: request.owner._id,
          type: 'system',
          content: `This chat is regarding AdSpace: ${request.adSpace.title}`,
        });
        await systemMessage.save();
        console.log(`System message added to conversation ${conversation._id}`);
      }
    } else {
      // Update adSpaces if not already included
      if (request.adSpace?._id && !conversation.adSpaces.includes(request.adSpace._id)) {
        conversation.adSpaces.push(request.adSpace._id);
        await conversation.save();
        console.log(`Added adSpace ${request.adSpace._id} to conversation ${conversation._id}`);
      }
      console.log(`Existing conversation found with ID: ${conversation._id}`);
    }

    res.json({ conversationId: conversation._id });
  } catch (error) {
    console.error('Error in /conversation/request/:requestId:', {
      message: error.message,
      stack: error.stack,
      requestId: req.params.requestId,
    });
    res.status(500).json({ message: 'Failed to fetch conversation', error: error.message });
  }
});

// Send a new message
router.post('/send', auth, async (req, res) => {
  const { conversationId, content, attachment } = req.body;

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const recipientId = conversation.participants.find((id) => id.toString() !== req.user.id);
    const recipient = await User.findById(recipientId);

    const message = new ChatMessage({
      conversationId,
      sender: req.user.id,
      recipient: recipientId,
      content,
      attachment,
    });
    await message.save();

    const io = req.app.get('io');
    io.to(conversationId.toString()).emit('message', {
      ...message.toObject(),
      sender: { _id: req.user.id, name: req.user.name },
      recipient: { _id: recipientId, name: recipient.name },
    });

    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: recipient.email,
      subject: `New Message from ${req.user.name}`,
      text: `You have a new message:\n\n${content}\n\nLog in to reply: http://localhost:5173/chat/${conversationId}`,
    };
    await transporter.sendMail(mailOptions);

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Upload attachment
router.post('/upload-attachment', auth, async (req, res) => {
  try {
    const upload = req.app.get('upload');
    upload.single('attachment')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: 'File upload failed' });
      }
      const bucket = req.app.get('bucket');
      const file = req.file;

      const uploadStream = bucket.openUploadStream(file.originalname, {
        contentType: file.mimetype,
      });
      uploadStream.end(file.buffer);

      uploadStream.on('finish', () => {
        res.json({
          fileId: uploadStream.id,
          filename: file.originalname,
          type: file.mimetype.startsWith('image/') ? 'image' : 'file',
        });
      });
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ message: 'Failed to upload attachment' });
  }
});

// Delete a message
router.delete('/message/:messageId', auth, async (req, res) => {
  try {
    const message = await ChatMessage.findById(req.params.messageId);
    if (!message || message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    message.deleted = true;
    await message.save();

    const io = req.app.get('io');
    io.to(message.conversationId.toString()).emit('messageDeleted', message._id);

    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

// Search messages in a conversation
router.get('/messages/conversation/:conversationId/search', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const query = req.query.q || '';
    const messages = await ChatMessage.find({
      conversationId: req.params.conversationId,
      content: { $regex: query, $options: 'i' },
      deleted: false,
    })
      .populate('sender', 'name')
      .populate('recipient', 'name')
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ message: 'Failed to search messages' });
  }
});

// Unread route for a specific conversation
router.get('/unread/:conversationId', auth, async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const messages = await ChatMessage.find({
      conversationId: conversationId,
      read: false,
      sender: { $ne: req.user._id },
    });

    const unreadCount = messages.length;
    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Total unread count across all conversations
router.get('/unread', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      $or: [
        { 'request.sender': req.user._id },
        { 'request.owner': req.user._id },
      ],
    });

    let totalUnread = 0;
    for (const conv of conversations) {
      const unreadMessages = await ChatMessage.find({
        conversationId: conv._id,
        read: false,
        sender: { $ne: req.user._id },
      });
      totalUnread += unreadMessages.length;
    }

    res.json({ unreadCount: totalUnread });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark messages as read
router.post('/mark-read/:conversationId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    await ChatMessage.updateMany(
      { conversationId: req.params.conversationId, recipient: userId, read: false },
      { $set: { read: true } }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
});

module.exports = router;