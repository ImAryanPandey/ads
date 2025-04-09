const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const AdSpace = require('../models/AdSpace');
const User = require('../models/User');
const { auth, role } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const { redisClient } = require('../db');
const { ObjectId } = require('mongoose').Types;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT == 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send a request
router.post('/send', auth, role('advertiser'), async (req, res) => {
  const { adSpaceId, duration, requirements } = req.body;
  console.log('Received request:', { adSpaceId, duration, requirements, userId: req.user.id }); // Debug
  try {
    // Validate and fetch adSpace
    console.log('Fetching AdSpace with id:', adSpaceId); // Debug
    const adSpace = await AdSpace.findById(adSpaceId);
    if (!adSpace) return res.status(404).json({ message: 'AdSpace not found' });
    console.log('AdSpace found:', adSpace._id, adSpace.title); // Debug
    if (adSpace.status === 'Booked') {
      return res.status(400).json({ message: 'This AdSpace is already booked.' });
    }

    // Check for existing pending request
    console.log('Checking for existing request with sender:', req.user.id); // Debug
    const existingRequest = await Request.findOne({
      adSpace: adSpace._id,
      sender: new ObjectId(req.user.id),
      status: 'Pending',
    });
    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending request for this AdSpace' });
    }

    // Create new request
    console.log('Creating new request with sender:', req.user.id, 'and owner:', adSpace.owner); // Debug
    const request = new Request({
      adSpace: adSpace._id,
      sender: new ObjectId(req.user.id),
      owner: adSpace.owner,
      duration,
      requirements,
    });
    await request.save();
    console.log('Request saved with id:', request._id); // Debug

    // Update adSpace status
    adSpace.status = 'Requested';
    await adSpace.save();
    console.log('AdSpace status updated to Requested'); // Debug
    await redisClient.del('availableAdSpaces');

    // Send email notification
    const owner = await User.findById(adSpace.owner);
    if (!owner) throw new Error('Owner not found');
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: owner.email,
      subject: `New Request for "${adSpace.title}"`,
      text: `You have a new request for "${adSpace.title}" from ${req.user.name}.`,
    };
    await transporter.sendMail(mailOptions);
    console.log('Email sent to:', owner.email); // Debug

    // Return response
    const populatedRequest = await Request.findById(request._id)
      .populate('sender', 'name businessName')
      .populate('owner', 'name businessName')
      .populate('adSpace', 'title address');
    res.status(201).json({ ...populatedRequest.toObject() });
  } catch (error) {
    console.error('Error sending request:', error.message, error.stack); // Detailed error logging
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Get user's requests (fixed for dashboard)
router.get('/my', auth, async (req, res) => {
  console.log('Fetching requests for user:', req.user.id); // Debug
  try {
    let requests;
    if (req.user.role === 'owner') {
      requests = await Request.find({ owner: new ObjectId(req.user.id) })
        .populate('sender', 'name businessName')
        .populate('adSpace', 'title address');
    } else {
      requests = await Request.find({ sender: new ObjectId(req.user.id) })
        .populate('owner', 'name businessName')
        .populate('adSpace', 'title address');
    }
    console.log('Found requests:', requests.length); // Debug

    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update request status
router.post('/update/:id', auth, role('owner'), async (req, res) => {
  const { status, startDate, endDate } = req.body;
  console.log('Updating request with id:', req.params.id, 'to status:', status); // Debug
  try {
    const request = await Request.findById(new ObjectId(req.params.id)).populate('adSpace');
    if (!request || request.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    console.log('Request found:', request._id); // Debug

    request.status = status;
    if (status === 'Rejected') request.rejectedAt = new Date();
    if (status === 'Approved') {
      request.startDate = startDate;
      request.endDate = endDate;
    }
    await request.save();
    console.log('Request status updated'); // Debug

    const adSpace = await AdSpace.findById(request.adSpace._id);
    if (status === 'Approved') {
      if (!startDate || !endDate) return res.status(400).json({ message: 'Start and end dates required' });
      const bookingStartDate = new Date(startDate);
      const bookingEndDate = new Date(endDate);
      if (isNaN(bookingStartDate) || isNaN(bookingEndDate) || bookingEndDate <= bookingStartDate || bookingStartDate < new Date()) {
        return res.status(400).json({ message: 'Invalid dates' });
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
    console.log('AdSpace status updated:', adSpace.status); // Debug
    await redisClient.del('availableAdSpaces');

    const sender = await User.findById(request.sender);
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: sender.email,
      subject: `Request ${status} for "${adSpace.title}"`,
      text: `Your request for "${adSpace.title}" has been ${status.toLowerCase()}.`,
    };
    await transporter.sendMail(mailOptions);
    console.log('Email sent for update'); // Debug

    const populatedRequest = await Request.findById(request._id)
      .populate('sender', 'name businessName')
      .populate('owner', 'name businessName')
      .populate('adSpace', 'title address');
    res.status(200).json({ ...populatedRequest.toObject() });
  } catch (error) {
    console.error('Error updating request:', error.message, error.stack); // Detailed error logging
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

module.exports = router;