const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Chat = require('../models/Chat');
const Request = require('../models/Request');
const { auth } = require('../middleware/auth');
const mongoose = require('mongoose');

router.post('/open', auth, async (req, res) => {
  const { requestId, recipientId } = req.body;
  console.log('Received /open request:', { requestId, recipientId, userId: req.user?.id });

  if (!req.user?.id) {
    return res.status(401).json({ message: 'Unauthorized: User ID missing' });
  }

  if (!requestId || !recipientId) {
    return res.status(400).json({ message: 'requestId and recipientId are required' });
  }

  try {
    const request = await Request.findById(requestId).populate('adSpace', 'title');
    if (!request || !request.adSpace) {
      return res.status(404).json({ message: 'Request or AdSpace not found' });
    }

    const participants = [req.user.id, recipientId].sort();
    let conversation = await Conversation.findOne({ participants: { $all: participants } });
    console.log('Found conversation:', conversation ? 'Yes' : 'No');

    if (!conversation) {
      conversation = new Conversation({ participants });
      await conversation.save();
      console.log('Created new conversation:', conversation._id);
    }

    let chat = await Chat.findOne({ conversationId: conversation._id });
    if (!chat) {
      chat = new Chat({ conversationId: conversation._id, messages: [] });
      await chat.save();
      console.log('Created new chat:', chat._id);
    }

    const systemMessage = {
      sender: null,
      content: `Chat opened regarding AdSpace: ${request.adSpace.title}`,
      timestamp: new Date(),
      isSystem: true,
    };
    chat.messages.push(systemMessage);
    await chat.save();
    console.log('Saved system message:', systemMessage.content);
    req.app.get('io').to(conversation._id.toString()).emit('message', systemMessage);

    res.status(200).json({ conversationId: conversation._id.toString() });
  } catch (error) {
    console.error('Error opening chat:', error.message);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

router.get('/unread', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({ participants: userId }).lean();
    let unreadCount = 0;

    for (const conv of conversations) {
      const chat = await Chat.findOne({ conversationId: conv._id }).lean();
      if (chat) {
        unreadCount += chat.messages.filter(msg => !msg.read && msg.sender?.toString() !== userId).length;
      }
    }
    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error.stack);
    res.status(500).json({ message: 'Error fetching unread count', error: error.message });
  }
});

router.get('/conversations/:conversationId', auth, async (req, res) => {
  const { conversationId } = req.params;
  const { skip = 0, limit = 50 } = req.query;
  console.log('GET /conversations request:', { conversationId, skip, limit, userId: req.user?.id });

  try {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversationId' });
    }

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    // Convert participant IDs to strings for comparison
    const userIdStr = req.user.id.toString();
    const participantIds = conversation.participants.map(p => p.toString());
    console.log('User ID:', userIdStr, 'Participants:', participantIds);

    if (!participantIds.includes(userIdStr)) {
      return res.status(403).json({ message: 'Unauthorized: User not a participant' });
    }

    const chat = await Chat.findOne({ conversationId }).lean();
    if (!chat) {
      console.log('No chat found for conversationId:', conversationId);
      return res.status(404).json({ message: 'Chat not found', conversationId, messages: [], hasMore: false });
    }

    const messages = chat.messages
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(parseInt(skip), parseInt(skip) + parseInt(limit));

    const hasMore = chat.messages.length > parseInt(skip) + parseInt(limit);
    console.log('Returning messages:', { count: messages.length, hasMore });

    res.status(200).json({
      conversationId,
      messages,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching conversation:', error.stack);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

router.post('/conversations/:conversationId', auth, async (req, res) => {
  const { conversationId } = req.params;
  const { content, image } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversationId' });
    }

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(404).json({ message: 'Conversation not found or unauthorized' });
    }

    let compressedContent = content || '';
    if (process.env.COMPRESS_MESSAGES === 'true' && content) {
      const zlib = require('zlib');
      compressedContent = zlib.deflateSync(content).toString('base64');
    }

    const chat = await Chat.findOne({ conversationId });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    const message = { sender: req.user.id, content: compressedContent, timestamp: new Date(), read: false };
    if (image && image.fileId) message.imageId = image.fileId;

    chat.messages.push(message);
    await chat.save();

    req.app.get('io').to(conversationId).emit('message', message);

    res.status(201).json({ messageId: chat.messages.length - 1 });
  } catch (error) {
    console.error('Error sending message:', error.stack);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

router.post('/attachments', auth, async (req, res) => {
  const upload = req.app.get('upload');
  upload.single('image')(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err.stack);
      return res.status(400).json({ message: 'Error uploading image', error: err.message });
    }
    try {
      const bucket = req.app.get('bucket');
      const sharp = require('sharp');
      const compressedBuffer = await sharp(req.file.buffer)
        .resize({ width: 800 })
        .jpeg({ quality: 80 })
        .toBuffer();

      const uploadStream = bucket.openUploadStream(`${Date.now()}-${req.file.originalname}`);
      uploadStream.end(compressedBuffer);

      uploadStream.on('error', (error) => {
        console.error('Upload stream error:', error.stack);
        res.status(500).json({ message: 'Server error during upload', details: error.message });
      });

      uploadStream.on('finish', () => {
        res.status(201).json({
          fileId: uploadStream.id.toString(),
          filename: req.file.originalname,
          contentType: 'image/jpeg',
        });
      });
    } catch (error) {
      console.error('Error processing attachment:', error.stack);
      res.status(500).json({ message: 'Server error', details: error.message });
    }
  });
});

module.exports = router;