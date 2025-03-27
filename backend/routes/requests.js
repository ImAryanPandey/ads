const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const AdSpace = require('../models/AdSpace');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const ChatMessage = require('../models/ChatMessage');
const { auth, role } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const { redisClient } = require('../db');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT == 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send a request and start a conversation
router.post('/send', auth, role('advertiser'), async (req, res) => {
  const { adSpaceId, duration, requirements } = req.body;
  try {
    const adSpace = await AdSpace.findById(adSpaceId);
    if (!adSpace) return res.status(404).json({ message: 'AdSpace not found' });
    if (adSpace.status === 'Booked') {
      return res.status(400).json({ message: 'This AdSpace is already booked.' });
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

    const conversation = await findOrCreateConversation(req.user.id, adSpace.owner, adSpaceId);
    const systemMessage = new ChatMessage({
      conversationId: conversation._id,
      sender: req.user.id,
      recipient: adSpace.owner,
      type: 'system',
      content: `New request sent for AdSpace: ${adSpace.title}`,
    });
    await systemMessage.save();

    const io = req.app.get('io');
    io.to(conversation._id.toString()).emit('message', {
      ...systemMessage.toObject(),
      sender: { _id: req.user.id, name: req.user.name },
      recipient: { _id: adSpace.owner },
    });

    const owner = await User.findById(adSpace.owner);
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: owner.email,
      subject: `New Request for "${adSpace.title}"`,
      text: `You have a new request for "${adSpace.title}" from ${req.user.name}. Chat: ${process.env.FRONTEND_URL}/chat/${conversation._id}`,
    };
    await transporter.sendMail(mailOptions);

    const populatedRequest = await Request.findById(request._id)
      .populate('sender', 'name businessName')
      .populate('owner', 'name businessName')
      .populate('adSpace', 'title address');
    res.status(201).json({ ...populatedRequest.toObject(), conversationId: conversation._id });
  } catch (error) {
    console.error('Error sending request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's requests (fixed for dashboard)
router.get('/my', auth, async (req, res) => {
  try {
    let requests;
    if (req.user.role === 'owner') {
      requests = await Request.find({ owner: req.user.id })
        .populate('sender', 'name businessName')
        .populate('adSpace', 'title address');
    } else {
      requests = await Request.find({ sender: req.user.id })
        .populate('owner', 'name businessName')
        .populate('adSpace', 'title address');
    }

    const requestsWithConversations = await Promise.all(requests.map(async (request) => {
      const participants = [request.sender._id.toString(), request.owner._id.toString()].sort();
      const conversation = await Conversation.findOne({
        participants: { $all: participants, $size: 2 },
      });
      return { ...request.toObject(), conversationId: conversation?._id || null };
    }));

    res.status(200).json(requestsWithConversations);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update request status
router.post('/update/:id', auth, role('owner'), async (req, res) => {
  const { status, startDate, endDate } = req.body;
  try {
    const request = await Request.findById(req.params.id).populate('adSpace');
    if (!request || request.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = status;
    if (status === 'Rejected') request.rejectedAt = new Date();
    if (status === 'Approved') {
      request.startDate = startDate;
      request.endDate = endDate;
    }
    await request.save();

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
    await redisClient.del('availableAdSpaces');

    const participants = [request.sender.toString(), request.owner.toString()].sort();
    const conversation = await Conversation.findOne({
      participants: { $all: participants, $size: 2 },
    });
    if (conversation) {
      const message = new ChatMessage({
        conversationId: conversation._id,
        sender: req.user.id,
        recipient: request.sender,
        type: 'system',
        content: `Request for AdSpace: ${adSpace.title} has been ${status.toLowerCase()}`,
      });
      await message.save();

      const io = req.app.get('io');
      io.to(conversation._id.toString()).emit('message', {
        ...message.toObject(),
        sender: { _id: req.user.id, name: req.user.name },
        recipient: { _id: request.sender },
      });
    }

    const sender = await User.findById(request.sender);
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: sender.email,
      subject: `Request ${status} for "${adSpace.title}"`,
      text: `Your request for "${adSpace.title}" has been ${status.toLowerCase()}. Chat: ${process.env.FRONTEND_URL}/chat/${conversation?._id || ''}`,
    };
    await transporter.sendMail(mailOptions);

    const populatedRequest = await Request.findById(request._id)
      .populate('sender', 'name businessName')
      .populate('owner', 'name businessName')
      .populate('adSpace', 'title address');
    res.status(200).json({ ...populatedRequest.toObject(), conversationId: conversation?._id || null });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;