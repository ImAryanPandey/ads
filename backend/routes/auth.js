const express = require('express');
const router = express.Router();
const User = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { auth } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  const passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: 'Password must be at least 8 characters, include one number and one special character.' });
  }

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    user = new User({ name, email, password, role });
    await user.save();

    const token = uuidv4();
    const verificationToken = new VerificationToken({ userId: user._id, token });
    await verificationToken.save();

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_PORT == 465, // true if using port 465 (SSL)
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });    

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Verify your email',
      text: `Please verify your email: http://localhost:5173/verify-email/${token}`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) return res.status(500).json({ message: 'Error sending email' });
      res.status(201).json({ message: 'User registered. Check your email to verify.' });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/verify-email/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const verificationToken = await VerificationToken.findOne({ token });
    if (!verificationToken) return res.status(400).json({ message: 'Invalid or expired token' });

    const user = await User.findById(verificationToken.userId);
    if (!user) return res.status(400).json({ message: 'User not found' });

    user.verified = true;
    await user.save();
    await VerificationToken.deleteOne({ _id: verificationToken._id });

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.verified) return res.status(400).json({ message: 'Please verify your email' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  const token = jwt.sign({ id: req.user._id, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.redirect(`http://localhost:5173/onboarding?token=${token}`);
});

router.post('/onboarding', auth, async (req, res) => {
  const { phone, location, businessName } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.profile = { phone, location, businessName };
    user.profileCompleted = true;
    await user.save();

    res.status(200).json({ message: 'Profile completed', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;