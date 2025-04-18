const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const http = require('http');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { connectDB, redisClient } = require('./db');
const authRoutes = require('./routes/auth');
const adSpaceRoutes = require('./routes/adSpaces');
const requestRoutes = require('./routes/requests');
const chatRoutes = require('./routes/chat');
const User = require('./models/User');
const AdSpace = require('./models/AdSpace');
const Request = require('./models/Request');
const Conversation = require('./models/Conversation');
const Chat = require('./models/Chat');
const multer = require('multer');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

dotenv.config();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: frontendUrl, methods: ['GET', 'POST'], credentials: true },
  path: '/socket.io',
});

// MongoDB Connection
connectDB();
const conn = mongoose.createConnection(process.env.MONGO_URI);

// Multer Setup
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cookieParser());
app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(express.json());
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
// REMOVED: app.use(upload.any()); // Removed global multer to match old behavior
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  handler: (req, res) => res.status(429).json({ message: 'Too many requests' }),
}));
app.use(passport.initialize());

// GridFS Bucket
let gridfsBucket;
conn.once('open', () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'images' });
  app.set('bucket', gridfsBucket);
  app.set('upload', upload);
  app.set('io', io);
  console.log('GridFS initialized');
}).on('error', (err) => {
  console.error('GridFS connection error:', err.stack);
  process.exit(1);
});

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT == 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
app.set('transporter', transporter);

// Socket.IO Configuration
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinRoom', (conversationId) => {
    if (mongoose.Types.ObjectId.isValid(conversationId)) {
      socket.join(conversationId);
      console.log(`Joined room: ${conversationId}`);
      socket.emit('roomJoined', { conversationId, message: 'Successfully joined chat room' });
    } else {
      console.warn('Invalid conversationId:', conversationId);
      socket.emit('error', { message: 'Invalid conversation ID' });
    }
  });

  socket.on('sendMessage', async ({ conversationId, content, image }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) throw new Error('Invalid conversationId');
      const chat = await Chat.findOne({ conversationId }).lean();
      if (!chat) throw new Error('Chat not found');

      let compressedContent = content || '';
      if (process.env.COMPRESS_MESSAGES === 'true' && content) {
        const zlib = require('zlib');
        compressedContent = zlib.deflateSync(content).toString('base64');
      }

      const message = { sender: socket.userId, content: compressedContent, timestamp: new Date(), read: false };
      if (image && image.fileId) message.imageId = image.fileId;

      const chatDoc = await Chat.findOne({ conversationId });
      chatDoc.messages.push(message);
      await chatDoc.save();

      io.to(conversationId).emit('message', message);
      console.log(`Message sent in room ${conversationId}`);
    } catch (error) {
      console.error('Error sending message:', error.stack);
      socket.emit('error', { message: 'Failed to send message', details: error.message });
    }
  });

  socket.on('typing', ({ conversationId, userId }) => {
    if (mongoose.Types.ObjectId.isValid(conversationId) && mongoose.Types.ObjectId.isValid(userId)) {
      socket.to(conversationId).emit('typing', userId);
    }
  });

  socket.on('stopTyping', ({ conversationId, userId }) => {
    if (mongoose.Types.ObjectId.isValid(conversationId) && mongoose.Types.ObjectId.isValid(userId)) {
      socket.to(conversationId).emit('stopTyping', userId);
    }
  });

  socket.on('deleteMessage', async ({ conversationId, messageIndex }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(conversationId) || messageIndex < 0) throw new Error('Invalid input');
      const chat = await Chat.findOne({ conversationId });
      if (chat && chat.messages[messageIndex]) {
        const message = chat.messages[messageIndex];
        if (message.imageId) {
          const bucket = app.get('bucket');
          await bucket.delete(message.imageId).catch(err => console.error('Image delete error:', err.stack));
        }
        chat.messages.splice(messageIndex, 1);
        await chat.save();
        io.to(conversationId).emit('messageDeleted', messageIndex);
      }
    } catch (error) {
      console.error('Error deleting message:', error.stack);
      socket.emit('error', { message: 'Failed to delete message', details: error.message });
    }
  });

  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value });
    if (!user) {
      user = new User({ name: profile.displayName, email: profile.emails[0].value, password: '', verified: true, role: '' });
      await user.save();
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.token = token;
    done(null, user);
  } catch (error) {
    console.error('OAuth error:', error.stack);
    done(error, null);
  }
}));

// 6-Month Cleanup
cron.schedule('0 0 * * *', async () => {
  console.log('Starting 6-month cleanup...');
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const chats = await Chat.find();
  for (const chat of chats) {
    const initialLength = chat.messages.length;
    chat.messages = chat.messages.filter(msg => new Date(msg.timestamp) > sixMonthsAgo);
    const deletedCount = initialLength - chat.messages.length;
    if (deletedCount > 0) {
      const bucket = app.get('bucket');
      for (const msg of chat.messages.slice(initialLength - deletedCount)) {
        if (msg.imageId) await bucket.delete(msg.imageId).catch(err => console.error('Image delete failed:', err.stack));
      }
      await chat.save();
      console.log(`Deleted ${deletedCount} messages from ${chat.conversationId}`);
    }
  }

  const conversations = await Conversation.find().lean();
  for (const conv of conversations) {
    const chat = await Chat.findOne({ conversationId: conv._id });
    if (chat && chat.messages.length === 0) {
      await Conversation.deleteOne({ _id: conv._id });
      await Chat.deleteOne({ conversationId: conv._id });
      console.log(`Deleted empty conversation ${conv._id}`);
    }
  }
  console.log('Cleanup completed.');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/adSpaces', adSpaceRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/chat', chatRoutes);

// Serve Images
app.get('/api/images/:id', async (req, res) => {
  try {
    const bucket = app.get('bucket');
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files.length) return res.status(404).json({ message: 'Image not found' });

    res.set('Content-Type', files[0].contentType || 'image/jpeg');
    bucket.openDownloadStream(fileId).pipe(res);
  } catch (error) {
    console.error('Error serving image:', error.stack);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(500).json({ message: 'Something went wrong!', details: err.message });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server on ${PORT}`));