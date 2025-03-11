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
  host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_PORT == 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Securely store JWT in HTTP-only cookies
const sendAuthCookies = (res, user) => {
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRATION });
  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRATION });

  res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'Strict' });
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'Strict' });
};

// ✅ Generate OTP & Save in Redis
const generateAndSendOTP = async (email) => {
  await redisClient.del(`otp:${email}`); // Clear old OTP before generating a new one
  const otp = Math.floor(100000 + Math.random() * 900000);
  const hashedOtp = await bcrypt.hash(otp.toString(), 10);
  await redisClient.setEx(`otp:${email}`, OTP_EXPIRATION, hashedOtp);

  const mailOptions = {
    from: process.env.EMAIL_USER,
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

    await generateAndSendOTP(email);
    res.status(201).json({ message: 'OTP sent to your email. Please verify.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Verify OTP & Create User (Only if OTP is correct)
router.post('/verify-otp', async (req, res) => {
  const { name, email, password, otp } = req.body;

  try {
    const storedOtpHash = await redisClient.get(`otp:${email}`);
    if (!storedOtpHash) return res.status(400).json({ message: 'OTP expired or not found. Request a new one.' });

    const isMatch = await bcrypt.compare(otp.toString(), storedOtpHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid OTP' });

    await redisClient.del(`otp:${email}`);
    const user = new User({ name, email, password, verified: true, profileCompleted: false });
    await user.save();

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
    const existingUser = await User.findOne({ email });
    if (!existingUser) return res.status(400).json({ message: 'User not found' });

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
  res.redirect(user.profileCompleted ? '/dashboard' : '/onboarding');
});

// ✅ Onboarding Route: Now only requires 'role' to complete profile
router.post('/onboarding', auth, async (req, res) => {
  const { phone, location, businessName, role } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Ensure role is provided
    if (!role) return res.status(400).json({ message: 'Role selection is required' });

    // Set profile details based on role
    user.role = role;
    user.profile.phone = phone || user.profile.phone; // Optional phone update
    user.profileCompleted = true; // ✅ Mark profile as complete after role selection

    // Role-specific fields (Only update if provided)
    if (role === 'owner') {
      user.profile.location = location || user.profile.location; // Optional for Owners
    } else if (role === 'advertiser') {
      user.profile.businessName = businessName || user.profile.businessName; // Optional for Advertisers
    }

    await user.save();

    res.status(200).json({ message: 'Profile completed', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
