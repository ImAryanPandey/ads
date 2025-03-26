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
const { connectDB } = require('./db');
const authRoutes = require('./routes/auth');
const adSpaceRoutes = require('./routes/adSpaces');
const requestRoutes = require('./routes/requests');
const User = require('./models/User');
const multer = require('multer');

dotenv.config();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: frontendUrl } });

// MongoDB Connection
connectDB();
const mongoURI = process.env.MONGO_URI;
const conn = mongoose.createConnection(mongoURI);

// Multer Setup with Memory Storage
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cookieParser());
app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(express.json());
app.use(helmet());

// Rate Limiting - Increased max to 1000 for testing
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased to 1000 requests per 15 minutes
  handler: (req, res) => {
    console.log(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ message: 'Too many requests, please try again later' });
  }
}));
app.use(passport.initialize());

// GridFS Bucket Initialization
let gridfsBucket;
conn.once('open', () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'images' });
  app.set('bucket', gridfsBucket); // Set bucket after initialization
  console.log('GridFS bucket initialized');
}).on('error', (err) => {
  console.error('GridFS connection error:', err);
  process.exit(1);
});

// Make upload available to routes
app.set('upload', upload);

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('joinRoom', (room) => socket.join(room));
  socket.on('sendMessage', ({ room, message, sender }) => {
    io.to(room).emit('message', { sender, message, timestamp: new Date() });
  });
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });
        if (!user) {
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            password: '',
            verified: true,
            role: '',
            profile: { phone: '' },
          });
          await user.save();
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        user.token = token;
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/adSpaces', adSpaceRoutes);
app.use('/api/requests', requestRoutes);

// Serve Images - Updated endpoint without gridfs-stream
app.get('/api/images/:id', async (req, res) => {
  try {
    const bucket = req.app.get('bucket');
    if (!bucket) {
      console.error('GridFS bucket not initialized');
      return res.status(500).json({ message: 'GridFS bucket not initialized' });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      console.log(`Image not found for ID: ${fileId}`);
      return res.status(404).json({ message: 'Image not found' });
    }

    const file = files[0];
    const contentType = file.contentType || (file.filename.endsWith('.jpg') || file.filename.endsWith('.jpeg')
      ? 'image/jpeg'
      : file.filename.endsWith('.png')
      ? 'image/png'
      : 'application/octet-stream');
    res.set('Content-Type', contentType);
    res.status(200); // Explicitly set the status code to 200

    console.log(`Starting to stream image with ID: ${fileId}, Content-Type: ${contentType}`);
    const stream = bucket.openDownloadStream(fileId);
    stream.on('error', (err) => {
      console.error(`Stream error for file ID ${fileId}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming image' });
      }
    });
    stream.on('end', () => {
      console.log(`Finished streaming file ID: ${fileId}`);
      if (!res.headersSent) {
        res.end();
      }
    });
    stream.pipe(res);
  } catch (error) {
    console.error(`Error in /api/images/:id endpoint:`, error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});