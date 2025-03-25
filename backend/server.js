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
const propertyRoutes = require('./routes/properties');
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
let bucket;
conn.once('open', () => {
  bucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'images' });
  console.log('GridFS bucket initialized');
});

// Multer Setup with Memory Storage
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cookieParser());
app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(express.json());
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(passport.initialize());

// Make bucket and upload available to routes
app.set('bucket', bucket);
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
app.use('/api/properties', propertyRoutes);
app.use('/api/requests', requestRoutes);

// Serve Images
app.get('/api/images/:id', (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    bucket.openDownloadStream(fileId).pipe(res).on('error', () => {
      res.status(404).json({ message: 'Image not found' });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
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