const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const AdSpace = require('../models/AdSpace');
const User = require('../models/User');
const { auth, role } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const { redisClient } = require('../db');

router.post('/send', auth, role('advertiser'), async (req, res) => {
  const { adSpaceId, duration, requirements } = req.body;
  try {
    const adSpace = await AdSpace.findById(adSpaceId);
    if (!adSpace || adSpace.status !== 'Available') {
      return res.status(400).json({ message: 'AdSpace not available' });
    }

    const request = new Request({
      sender: req.user.id,
      adSpace: adSpaceId,
      duration,
      requirements,
    });
    await request.save();

    adSpace.status = 'Requested';
    await adSpace.save();
    await redisClient.del('availableAdSpaces');

    const owner = await User.findById(adSpace.owner);
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465, // true if using port 465 (SSL)
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: owner.email,
      subject: 'New request for your AdSpace',
      text: `You have a new request for "${adSpace.title}".`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) console.error('Error sending email:', error);
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my', auth, role('owner'), async (req, res) => {
  try {
    const adSpaces = await AdSpace.find({ owner: req.user.id });
    const adSpaceIds = adSpaces.map(ad => ad._id);
    const requests = await Request.find({ adSpace: { $in: adSpaceIds } }).populate('sender', 'name');
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/update/:id', auth, role('owner'), async (req, res) => {
  const { status } = req.body;
  try {
    const request = await Request.findById(req.params.id).populate('adSpace');
    if (!request || request.adSpace.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = status;
    await request.save();

    const adSpace = await AdSpace.findById(request.adSpace._id);
    adSpace.status = status === 'Approved' ? 'Approved' : status === 'Rejected' ? 'Available' : 'Requested';
    await adSpace.save();
    await redisClient.del('availableAdSpaces');

    const sender = await User.findById(request.sender);
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465, // true if using port 465 (SSL)
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });    

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: sender.email,
      subject: `Request ${status} for "${adSpace.title}"`,
      text: `Your request for "${adSpace.title}" has been ${status.toLowerCase()}.`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) console.error('Error sending email:', error);
    });

    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;