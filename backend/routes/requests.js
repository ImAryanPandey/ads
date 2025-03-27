// backend/routes/requests.js
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
    if (!adSpace) return res.status(404).json({ message: 'AdSpace not found' });

    if (adSpace.status === 'Booked') {
      return res.status(400).json({ message: 'This AdSpace is already booked. Please wait until it becomes available.' });
    }

    const existingRequest = await Request.findOne({
      adSpace: adSpaceId,
      sender: req.user.id,
      status: 'Pending',
    });
    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending request for this AdSpace' });
    }

    const request = new Request({
      adSpace: adSpaceId,
      sender: req.user.id,
      owner: adSpace.owner,
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
      secure: process.env.EMAIL_PORT == 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: owner.email,
      subject: `New Request for "${adSpace.title}"`,
      text: `You have a new request for your AdSpace "${adSpace.title}" from ${req.user.name}.`,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) console.error('Error sending email:', error);
    });

    // Populate the response
    const populatedRequest = await Request.findById(request._id)
      .populate('sender', 'name businessName')
      .populate('owner', 'name businessName')
      .populate('adSpace', 'title address');
    res.status(201).json(populatedRequest);
  } catch (error) {
    console.error('Error sending request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    let requests;
    if (req.user.role === 'owner') {
      requests = await Request.find({ owner: req.user.id })
        .populate('sender', 'name businessName')
        .populate('adSpace', 'title address'); // Added address for more detail
    } else {
      requests = await Request.find({ sender: req.user.id })
        .populate('owner', 'name businessName')
        .populate('adSpace', 'title address');
    }
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/update/:id', auth, role('owner'), async (req, res) => {
  const { status, startDate, endDate } = req.body;
  try {
    const request = await Request.findById(req.params.id).populate('adSpace');
    if (!request || request.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = status;
    if (status === 'Rejected') {
      request.rejectedAt = new Date();
    }
    if (status === 'Approved') {
      request.startDate = startDate;
      request.endDate = endDate;
    }
    await request.save();

    const adSpace = await AdSpace.findById(request.adSpace._id);
    if (status === 'Approved') {
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required for approval. Please agree on dates with the requester via chat.' });
      }

      const bookingStartDate = new Date(startDate);
      const bookingEndDate = new Date(endDate);

      if (isNaN(bookingStartDate) || isNaN(bookingEndDate)) {
        return res.status(400).json({ message: 'Invalid date format' });
      }
      if (bookingEndDate <= bookingStartDate) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
      if (bookingStartDate < new Date()) {
        return res.status(400).json({ message: 'Start date cannot be in the past' });
      }

      adSpace.status = 'Booked';
      adSpace.booking = {
        requestId: request._id,
        duration: request.duration,
        startDate: bookingStartDate,
        endDate: bookingEndDate,
      };
      adSpace.bookings.push({
        requestId: request._id,
        startDate: bookingStartDate,
        endDate: bookingEndDate,
        duration: request.duration,
      });
    } else if (status === 'Rejected') {
      adSpace.status = 'Available';
      adSpace.booking = null;
    } else {
      adSpace.status = 'Requested';
    }
    await adSpace.save();
    await redisClient.del('availableAdSpaces');

    const sender = await User.findById(request.sender);
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465,
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

    // Populate the response
    const populatedRequest = await Request.findById(request._id)
      .populate('sender', 'name businessName')
      .populate('owner', 'name businessName')
      .populate('adSpace', 'title address');
    res.status(200).json(populatedRequest);
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;