const express = require('express');
const router = express.Router();
const AdSpace = require('../models/AdSpace');
const { auth, role } = require('../middleware/auth');
const { redisClient } = require('../db');

router.post('/add', auth, role('owner'), async (req, res) => {
  const { title, description, images, address, footfall, footfallType, pricing, availability, terms } = req.body;
  try {
    const adSpace = new AdSpace({
      owner: req.user.id,
      title,
      description,
      images,
      address,
      footfall,
      footfallType,
      pricing,
      availability,
      terms,
    });
    await adSpace.save();
    await redisClient.del('availableAdSpaces');
    res.status(201).json(adSpace);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my', auth, role('owner'), async (req, res) => {
  try {
    const adSpaces = await AdSpace.find({ owner: req.user.id });
    res.status(200).json(adSpaces);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/available', async (req, res) => {
  try {
    const cached = await redisClient.get('availableAdSpaces');
    if (cached) return res.status(200).json(JSON.parse(cached));
    const adSpaces = await AdSpace.find({ status: 'Available' });
    await redisClient.set('availableAdSpaces', JSON.stringify(adSpaces), { EX: 60 });
    res.status(200).json(adSpaces);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/analytics', auth, role('owner'), async (req, res) => {
  try {
    const adSpaces = await AdSpace.find({ owner: req.user.id });
    const total = adSpaces.length;
    const available = adSpaces.filter(ad => ad.status === 'Available').length;
    const requested = adSpaces.filter(ad => ad.status === 'Requested').length;
    res.status(200).json({ total, available, requested });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;