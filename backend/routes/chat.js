const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const Conversation = require('../models/Conversation');
const Request = require('../models/Request');
const User = require('../models/User');
const AdSpace = require('../models/AdSpace');
const nodemailer = require('nodemailer');
const { auth } = require('../middleware/auth');

// Nodemailer setup
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper: Find or create conversation
const findOrCreateConversation = async (user1Id, user2Id, adSpaceId = null) => {
  const participants = [user1Id.toString(), user2Id.toString()].sort();
  let conversation = await Conversation.findOne({
    participants: { $all: participants, $size: 2 },
  });

  if (!conversation) {
    try {
      conversation = new Conversation({ participants });
      if (adSpaceId) conversation.adSpaces = [adSpaceId];
      await conversation.save();
      console.log(`Created new conversation with ID: ${conversation._id}`);
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error: race condition, retry finding it
        console.log('Duplicate key error, retrying to find conversation...');
        conversation = await Conversation.findOne({
          participants: { $all: participants, $size: 2 },
        });
        if (!conversation) {
          console.error('Failed to resolve conversation after duplicate key error');
          throw new Error('Failed to resolve conversation after duplicate key error');
        }
      } else {
        console.error('Error creating conversation:', error);
        throw error;
      }
    }
  } else if (adSpaceId && !conversation.adSpaces.includes(adSpaceId)) {
    conversation.adSpaces.push(adSpaceId);
    await conversation.save();
    console.log(`Updated conversation ${conversation._id} with adSpaceId: ${adSpaceId}`);
  }

  return conversation;
};

// Start a new conversation
router.post('/conversation/start', auth, async (req, res) => {
  const { otherUserId, adSpaceId } = req.body;
  try {
    if (!otherUserId) {
      return res.status(400).json({ message: 'Other user ID is required' });
    }

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ message: 'Other user not found' });
    }

    let adSpace;
    if (adSpaceId) {
      adSpace = await AdSpace.findById(adSpaceId);
      if (!adSpace) {
        return res.status(404).json({ message: 'AdSpace not found' });
      }
    }

    const conversation = await findOrCreateConversation(req.user.id, otherUserId, adSpaceId);

    if (adSpaceId && !await ChatMessage.exists({
      conversationId: conversation._id,
      type: 'system',
      content: `This chat is regarding AdSpace: ${adSpace.title}`,
    })) {
      const systemMessage = new ChatMessage({
        conversationId: conversation._id,
        sender: req.user.id,
        recipient: otherUserId,
        type: 'system',
        content: `This chat is regarding AdSpace: ${adSpace.title}`,
      });
      await systemMessage.save();
      const io = req.app.get('io');
      io.to(conversation._id.toString()).emit('message', {
        ...systemMessage.toObject(),
        sender: { _id: req.user.id, name: req.user.name },
        recipient: { _id: otherUserId, name: otherUser.name },
      });
      console.log(`System message created for conversation ${conversation._id}`);
    }

    res.json({ conversationId: conversation._id });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ message: 'Failed to start conversation' });
  }
});

// Get conversation from request ID (for "Open Chat")
router.get('/conversation/request/:requestId', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId)
      .populate('adSpace', 'title images')
      .populate('sender', 'name')
      .populate('owner', 'name');
    if (!request) {
      console.log(`Request not found for requestId: ${req.params.requestId}`);
      return res.status(404).json({ message: 'Request not found' });
    }

    const userId = req.user.id.toString();
    const senderId = request.sender._id.toString();
    const ownerId = request.owner._id.toString();
    if (userId !== senderId && userId !== ownerId) {
      console.log(`Unauthorized access to request ${req.params.requestId} by user ${userId}`);
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const conversation = await findOrCreateConversation(request.sender._id, request.owner._id, request.adSpace._id);

    if (request.adSpace?.title && !await ChatMessage.exists({
      conversationId: conversation._id,
      type: 'system',
      content: `This chat is regarding AdSpace: ${request.adSpace.title}`,
    })) {
      const systemMessage = new ChatMessage({
        conversationId: conversation._id,
        sender: request.sender._id,
        recipient: request.owner._id,
        type: 'system',
        content: `This chat is regarding AdSpace: ${request.adSpace.title}`,
      });
      await systemMessage.save();
      const io = req.app.get('io');
      io.to(conversation._id.toString()).emit('message', {
        ...systemMessage.toObject(),
        sender: { _id: request.sender._id, name: request.sender.name },
        recipient: { _id: request.owner._id, name: request.owner.name },
      });
      console.log(`System message created for conversation ${conversation._id}`);
    }

    res.json({ conversationId: conversation._id, request });
  } catch (error) {
    console.error('Error fetching conversation from request:', error);
    res.status(500).json({ message: 'Failed to fetch conversation' });
  }
});

// Get request associated with a conversation
router.get('/conversation/:conversationId/request', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) {
      console.log(`Conversation not found for conversationId: ${req.params.conversationId}`);
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const userId = req.user.id.toString();
    if (!conversation.participants.includes(userId)) {
      console.log(`Unauthorized access to conversation ${req.params.conversationId} by user ${userId}`);
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Find a request that matches the conversation's participants and adSpace
    const adSpaceId = conversation.adSpaces[0]; // Assuming the first adSpace for simplicity
    if (!adSpaceId) {
      console.log(`No associated adSpace found for conversation ${req.params.conversationId}`);
      return res.status(404).json({ message: 'No associated adSpace found for this conversation' });
    }

    const request = await Request.findOne({
      adSpace: adSpaceId,
      $or: [
        { sender: conversation.participants[0], owner: conversation.participants[1] },
        { sender: conversation.participants[1], owner: conversation.participants[0] },
      ],
    })
      .populate('adSpace', 'title images')
      .populate('sender', 'name')
      .populate('owner', 'name');

    if (!request) {
      console.log(`Request not found for conversation ${req.params.conversationId} with adSpace ${adSpaceId}`);
      return res.status(404).json({ message: 'Request not found for this conversation' });
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching request for conversation:', error);
    res.status(500).json({ message: 'Failed to fetch request' });
  }
});

// Fetch messages for a conversation
router.get('/messages/conversation/:conversationId', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) {
      console.log(`Conversation not found for conversationId: ${req.params.conversationId}`);
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      console.log(`Unauthorized access to conversation ${req.params.conversationId} by user ${req.user.id}`);
      return res.status(403).json({ message: 'Access denied' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    console.log(`Fetching messages for conversation ${req.params.conversationId}: page=${page}, limit=${limit}, skip=${skip}`);
    const messages = await ChatMessage.find({ conversationId: req.params.conversationId })
      .populate('sender', 'name')
      .populate('recipient', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const totalMessages = await ChatMessage.countDocuments({ conversationId: req.params.conversationId });
    console.log(`Found ${messages.length} messages, total: ${totalMessages}`);

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

// Send a message
router.post('/send', auth, async (req, res) => {
  const { conversationId, content, attachment } = req.body;
  try {
    if (!conversationId) {
      return res.status(400).json({ message: 'Conversation ID is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      console.log(`Conversation not found for conversationId: ${conversationId}`);
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      console.log(`Unauthorized access to conversation ${conversationId} by user ${req.user.id}`);
      return res.status(403).json({ message: 'Access denied' });
    }

    const recipientId = conversation.participants.find(id => id.toString() !== req.user.id);
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      console.log(`Recipient not found for ID: ${recipientId}`);
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const message = new ChatMessage({
      conversationId,
      sender: req.user.id,
      recipient: recipientId,
      content,
      attachment,
    });
    await message.save();
    console.log(`Message sent in conversation ${conversationId} by user ${req.user.id}`);

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
      text: `You have a new message:\n\n${content}\n\nReply: ${process.env.FRONTEND_URL}/chat/${conversationId}`,
    };
    await transporter.sendMail(mailOptions);
    console.log(`Email notification sent to ${recipient.email}`);

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Send request within conversation
router.post('/conversation/:conversationId/request', auth, async (req, res) => {
  const { adSpaceId, duration, requirements } = req.body;
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) {
      console.log(`Conversation not found for conversationId: ${req.params.conversationId}`);
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      console.log(`Unauthorized access to conversation ${req.params.conversationId} by user ${req.user.id}`);
      return res.status(403).json({ message: 'Access denied' });
    }

    const adSpace = await AdSpace.findById(adSpaceId);
    if (!adSpace) {
      console.log(`AdSpace not found for adSpaceId: ${adSpaceId}`);
      return res.status(404).json({ message: 'AdSpace not found' });
    }

    const recipientId = conversation.participants.find(id => id.toString() !== req.user.id);
    const request = new Request({
      adSpace: adSpaceId,
      sender: req.user.id,
      owner: adSpace.owner,
      duration,
      requirements,
    });
    await request.save();
    console.log(`Request created with ID: ${request._id}`);

    if (!conversation.adSpaces.includes(adSpaceId)) {
      conversation.adSpaces.push(adSpaceId);
      await conversation.save();
      console.log(`Added adSpace ${adSpaceId} to conversation ${conversation._id}`);
    }

    const message = new ChatMessage({
      conversationId: conversation._id,
      sender: req.user.id,
      recipient: recipientId,
      type: 'system',
      content: `New request sent for AdSpace: ${adSpace.title}`,
    });
    await message.save();
    console.log(`System message created for request in conversation ${conversation._id}`);

    const io = req.app.get('io');
    io.to(conversation._id.toString()).emit('message', {
      ...message.toObject(),
      sender: { _id: req.user.id, name: req.user.name },
      recipient: { _id: recipientId },
    });

    res.status(201).json({ requestId: request._id });
  } catch (error) {
    console.error('Error sending request in conversation:', error);
    res.status(500).json({ message: 'Failed to send request' });
  }
});

// Upload attachment
router.post('/upload-attachment', auth, async (req, res) => {
  try {
    const upload = req.app.get('upload');
    upload.single('attachment')(req, res, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({ message: 'File upload failed' });
      }
      const bucket = req.app.get('bucket');
      const file = req.file;

      const uploadStream = bucket.openUploadStream(file.originalname, { contentType: file.mimetype });
      uploadStream.end(file.buffer);

      uploadStream.on('finish', () => {
        console.log(`File uploaded with ID: ${uploadStream.id}`);
        res.json({
          fileId: uploadStream.id,
          filename: file.originalname,
          type: file.mimetype.startsWith('image/') ? 'image' : 'file',
        });
      });

      uploadStream.on('error', (error) => {
        console.error('Error uploading file to GridFS:', error);
        res.status(500).json({ message: 'Failed to upload file' });
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
    if (!message) {
      console.log(`Message not found for messageId: ${req.params.messageId}`);
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user.id) {
      console.log(`Unauthorized attempt to delete message ${req.params.messageId} by user ${req.user.id}`);
      return res.status(403).json({ message: 'Access denied' });
    }

    message.deleted = true;
    await message.save();
    console.log(`Message ${req.params.messageId} marked as deleted`);

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
    if (!conversation) {
      console.log(`Conversation not found for conversationId: ${req.params.conversationId}`);
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      console.log(`Unauthorized access to conversation ${req.params.conversationId} by user ${req.user.id}`);
      return res.status(403).json({ message: 'Access denied' });
    }

    const query = req.query.q || '';
    console.log(`Searching messages in conversation ${req.params.conversationId} with query: ${query}`);
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

// Get unread message count for a conversation
router.get('/unread/:conversationId', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) {
      console.log(`Conversation not found for conversationId: ${req.params.conversationId}`);
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      console.log(`Unauthorized access to conversation ${req.params.conversationId} by user ${req.user.id}`);
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await ChatMessage.find({
      conversationId: req.params.conversationId,
      read: false,
      sender: { $ne: req.user.id },
    });

    res.json({ unreadCount: messages.length });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

// Get total unread message count across all conversations
router.get('/unread', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id });
    let totalUnread = 0;
    for (const conv of conversations) {
      const unreadMessages = await ChatMessage.find({
        conversationId: conv._id,
        read: false,
        sender: { $ne: req.user.id },
      });
      totalUnread += unreadMessages.length;
    }
    console.log(`Total unread messages for user ${req.user.id}: ${totalUnread}`);
    res.json({ unreadCount: totalUnread });
  } catch (error) {
    console.error('Error fetching total unread count:', error);
    res.status(500).json({ message: 'Failed to fetch total unread count' });
  }
});

// Mark messages as read
router.post('/mark-read/:conversationId', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) {
      console.log(`Conversation not found for conversationId: ${req.params.conversationId}`);
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      console.log(`Unauthorized access to conversation ${req.params.conversationId} by user ${req.user.id}`);
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedCount = await ChatMessage.updateMany(
      { conversationId: req.params.conversationId, recipient: req.user.id, read: false },
      { $set: { read: true } }
    );
    console.log(`Marked ${updatedCount.modifiedCount} messages as read in conversation ${req.params.conversationId}`);

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
});

// Get all conversations for the authenticated user
router.get('/conversations/my', auth, async (req, res) => {
  try {
    console.log(`Fetching conversations for user: ${req.user.id}`);
    const conversations = await Conversation.find({ participants: req.user.id })
      .populate('participants', 'name')
      .populate('adSpaces', 'title');
    console.log(`Found ${conversations.length} conversations for user ${req.user.id}`);
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

module.exports = router;