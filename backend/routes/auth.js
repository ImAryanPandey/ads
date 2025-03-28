const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { redisClient } = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const passport = require('passport');
const { auth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

require('dotenv').config();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const OTP_EXPIRATION = 300; // 5 minutes
const JWT_EXPIRATION = '1h';
const REFRESH_TOKEN_EXPIRATION = '7d';

// ✅ Rate limiting for OTP requests (per IP & per email)
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // 3 OTP requests per 15 minutes per IP
  message: 'Too many OTP requests. Try again later.',
});

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT == 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // logger: true,  // Enable detailed logging
  // debug: true,   // Enable debug output
});


// ✅ Securely store JWT in HTTP-only cookies
const sendAuthCookies = (res, user) => {
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRATION });
  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRATION });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'Strict' : 'Lax',
  };

  res.cookie('token', token, cookieOptions);
  res.cookie('refreshToken', refreshToken, cookieOptions);
};

// ✅ Generate OTP & Save in Redis
const generateAndSendOTP = async (email) => {
  await redisClient.del(`otp:${email}`); // Clear old OTP before generating a new one
  const otp = Math.floor(100000 + Math.random() * 900000);
  const hashedOtp = await bcrypt.hash(otp.toString(), 10);
  await redisClient.setEx(`otp:${email}`, OTP_EXPIRATION, hashedOtp);

  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to: email,
    subject: 'Your OTP for Account Verification',
    text: `Your OTP code is: ${otp}. It expires in 5 minutes.`,
  };

  await transporter.sendMail(mailOptions);
};

// ✅ Registration (Stores OTP, Not User)
router.post('/register', otpRequestLimiter, async (req, res) => {
  const { name, email, password } = req.body;
  const passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z]).{8,}$/;
  
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: 'Password must include at least 8 characters, one number, and one special character.' });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists. Try logging in or resending OTP.' });

    const existingTempData = await redisClient.get(`reg:${email}`);
    if (existingTempData) {
      return res.status(400).json({ message: 'OTP already sent. Please verify your email.' });
    }

    // Store user details temporarily in Redis
    const tempData = {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10) // Hash password before storing
    };

    await redisClient.setEx(`reg:${email}`, 300, JSON.stringify(tempData)); // Expiry: 5 mins

    await generateAndSendOTP(email);
    res.status(201).json({ message: 'OTP sent to your email. Please verify.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Verify OTP & Create User (Only if OTP is correct)
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body; // Only expect email & otp from frontend

  try {
    // Retrieve OTP & temp user data from Redis
    const [storedOtpHash, tempData] = await Promise.all([
      redisClient.get(`otp:${email}`),
      redisClient.get(`reg:${email}`)
    ]);

    if (!storedOtpHash || !tempData) {
      return res.status(400).json({ message: 'OTP expired or registration session not found. Please restart registration.' });
    }

    // Verify OTP
    const isMatch = await bcrypt.compare(otp.toString(), storedOtpHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid OTP' });

    // Extract user details from Redis (name, email, password)
    const { name, email: storedEmail, passwordHash } = JSON.parse(tempData);

    // Create user only after successful OTP verification
    const user = new User({
      name,
      email: storedEmail,
      password: passwordHash, // Already hashed
      verified: true,
      profileCompleted: false
    });

    await user.save();

    // Cleanup Redis data
    await Promise.all([
      redisClient.del(`otp:${email}`),
      redisClient.del(`reg:${email}`)
    ]);

    sendAuthCookies(res, user);
    res.status(200).json({ message: 'Email verified. Registration complete.', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


// ✅ Resend OTP (Checks for existing user first)
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;

  try {
    // const existingUser = await User.findOne({ email });
    // if (!existingUser) return res.status(400).json({ message: 'User not found' });

    await generateAndSendOTP(email);
    res.status(200).json({ message: 'OTP resent to your email.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Google Authentication (Stores token in cookie & redirects to onboarding if new user)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), async (req, res) => {
  let user = await User.findOne({ email: req.user.email });
  if (!user) {
    user = new User({ name: req.user.name, email: req.user.email, verified: true, profileCompleted: false });
    await user.save();
  }
  sendAuthCookies(res, user);
  res.redirect(`${frontendUrl}${user.profileCompleted ? '/dashboard' : '/onboarding'}`);
});

// manual Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt - Email: ${email}, Password: ${password}`);
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`No user found for email: ${email}`);
      return res.status(400).json({ message: 'No account found with this email.' });
    }
    if (!user.password) {
      console.log(`User ${email} has no password (Google user)`);
      return res.status(400).json({ message: 'This account was created with Google. Please log in using Google.' });
    }
    const isMatch = await user.comparePassword(password);
    console.log(`Password match for ${email}: ${isMatch}`);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password. Please try again.' });
    }
    if (!user.verified) {
      console.log(`User ${email} not verified`);
      return res.status(400).json({ message: 'Please verify your email before logging in.' });
    }
    sendAuthCookies(res, user);
    res.json({ user });
  } catch (error) {
    console.error(`Error during login for ${email}:`, error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Onboarding Route: Now only requires 'role' to complete profile
router.post('/onboarding', auth, async (req, res) => {
  const { phone, location, businessName, role } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!role) return res.status(400).json({ message: 'Role selection is required' });

    // Phone number validation: ensure exactly 10 digits
    let formattedPhone = phone ? phone.replace(/\D/g, '') : ''; // Remove all non-digits
    if (formattedPhone.length === 11 && formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.slice(1); // Remove leading zero
    }
    if (formattedPhone.length !== 10) {
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits.' });
    }

    user.role = role;
    user.profile.phone = formattedPhone;
    user.profileCompleted = true;

    if (role === 'owner') {
      user.profile.location = location || user.profile.location;
    } else if (role === 'advertiser') {
      user.profile.businessName = businessName || user.profile.businessName;
    }

    await user.save();
    res.status(200).json({ message: 'Profile completed', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.status(200).json({ message: 'Logged out successfully' });
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
