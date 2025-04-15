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
  try {
    const adSpace = await AdSpace.findById(adSpaceId);
    if (!adSpace) return res.status(404).json({ message: 'AdSpace not found' });
    if (adSpace.status === 'Booked') return res.status(400).json({ message: 'AdSpace is booked' });

    const existingRequest = await Request.findOne({ adSpace: adSpace._id, sender: req.user.id, status: 'Pending' });
    if (existingRequest) return res.status(400).json({ message: 'Pending request exists' });

    const request = new Request({ adSpace: adSpace._id, sender: req.user.id, owner: adSpace.owner, duration, requirements });
    await request.save();

    adSpace.status = 'Requested';
    await adSpace.save();
    await redisClient.del('availableAdSpaces');

    const owner = await User.findById(adSpace.owner);
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: owner.email,
      subject: `New Request for "${adSpace.title}"`,
      text: `Request from ${req.user.name}. Click 'Open Chat' to respond.`,
    });

    const populatedRequest = await Request.findById(request._id)
      .populate('sender', 'name businessName')
      .populate('owner', 'name businessName')
      .populate('adSpace', 'title address');
    res.status(201).json({ ...populatedRequest.toObject(), chatEnabled: true });
  } catch (error) {
    console.error('Error sending request:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

// Get user's requests (fixed for dashboard)
router.get('/my', auth, async (req, res) => {
  console.log('Authenticated user:', req.user);
  try {
    let requests;
    if (req.user.role === 'owner') {
      requests = await Request.find({ owner: new ObjectId(req.user.id) })
        .populate('sender', 'name businessName')
        .populate('adSpace', 'title address');
    } else if (req.user.role === 'advertiser') {
      requests = await Request.find({ sender: new ObjectId(req.user.id) })
        .populate('owner', 'name businessName')
        .populate('adSpace', 'title address');
    } else {
      requests = await Request.find({
        $or: [
          { sender: new ObjectId(req.user.id) },
          { owner: new ObjectId(req.user.id) },
        ],
      })
        .populate('sender', 'name businessName')
        .populate('owner', 'name businessName')
        .populate('adSpace', 'title address');
      console.warn(`Role not found for user ${req.user.id}, using fallback query`);
    }
    console.log('Found requests:', requests.length);

    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update request status
router.post('/update/:id', auth, role('owner'), async (req, res) => {
  const { status, startDate, endDate } = req.body;
  console.log('Updating request with id:', req.params.id, 'to status:', status);
  try {
    const request = await Request.findById(new ObjectId(req.params.id)).populate('adSpace');
    if (!request || request.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    console.log('Request found:', request._id);

    request.status = status;
    if (status === 'Rejected') request.rejectedAt = new Date();
    if (status === 'Approved') {
      request.startDate = startDate;
      request.endDate = endDate;
    }
    await request.save();
    console.log('Request status updated');

    const adSpace = await AdSpace.findById(request.adSpace._id);
    if (status === 'Approved') {
      if (!startDate || !endDate) return res.status(400).json({ message: 'Start and end dates required' });
      const bookingStartDate = new Date(startDate);
      const bookingEndDate = new Date(endDate);
      if (isNaN(bookingStartDate) || isNaN(bookingEndDate)) {
        return res.status(400).json({ message: 'Invalid date format for start or end date' });
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
    console.log('AdSpace status updated:', adSpace.status);
    await redisClient.del('availableAdSpaces');

    const sender = await User.findById(request.sender);
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: sender.email,
      subject: `Request ${status} for "${adSpace.title}"`,
      text: `Your request for "${adSpace.title}" has been ${status.toLowerCase()}.`,
    };
    await transporter.sendMail(mailOptions);
    console.log('Email sent for update');

    const populatedRequest = await Request.findById(request._id)
      .populate('sender', 'name businessName')
      .populate('owner', 'name businessName')
      .populate('adSpace', 'title address');
    res.status(200).json({ ...populatedRequest.toObject() });
  } catch (error) {
    console.error('Error updating request:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

module.exports = router;