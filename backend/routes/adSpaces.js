const express = require('express');
const router = express.Router();
const AdSpace = require('../models/AdSpace');
const { auth, role } = require('../middleware/auth');
const { redisClient } = require('../db');
const sharp = require('sharp');

router.post('/add', auth, role('owner'), async (req, res) => {
  const upload = req.app.get('upload');
  const bucket = req.app.get('bucket');

  if (!bucket) {
    return res.status(500).json({ message: 'GridFS bucket not initialized' });
  }

  upload.array('images', 5)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'Error uploading images', error: err.message });
    }

    try {
      const imageData = [];
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const compressedBuffer = await sharp(file.buffer)
          .resize({ width: 800 })
          .jpeg({ quality: 80 })
          .toBuffer();

        const filename = `${Date.now()}-${file.originalname}`;
        const uploadStream = bucket.openUploadStream(filename);
        uploadStream.end(compressedBuffer);

        imageData.push({
          imageId: uploadStream.id,
          caption: req.body.captions[i] || '',
        });
      }

      const adSpace = new AdSpace({
        owner: req.user.id,
        title: req.body.title,
        description: req.body.description,
        images: imageData,
        address: req.body.address,
        footfall: Number(req.body.footfall),
        footfallType: req.body.footfallType,
        pricing: {
          baseMonthlyRate: Number(req.body.baseMonthlyRate),
        },
        availability: {
          startDate: new Date(req.body.availabilityStart),
          endDate: req.body.availabilityEnd ? new Date(req.body.availabilityEnd) : undefined,
        },
        terms: req.body.terms || '',
      });

      await adSpace.save();
      await redisClient.del('availableAdSpaces');
      res.status(201).json(adSpace);
    } catch (error) {
      console.error('Error adding AdSpace:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
});

router.get('/my', auth, role('owner'), async (req, res) => {
  try {
    const adSpaces = await AdSpace.find({ owner: req.user.id });
    res.status(200).json(adSpaces);
  } catch (error) {
    console.error('Error fetching my AdSpaces:', error);
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
    console.error('Error fetching available AdSpaces:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/analytics', auth, role('owner'), async (req, res) => {
  try {
    const adSpaces = await AdSpace.find({ owner: req.user.id });
    const total = adSpaces.length;
    const available = adSpaces.filter((ad) => ad.status === 'Available').length;
    const requested = adSpaces.filter((ad) => ad.status === 'Requested').length;
    res.status(200).json({ total, available, requested });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add the delete route here
router.delete('/:id', auth, role('owner'), async (req, res) => {
  const bucket = req.app.get('bucket');
  try {
    const adSpace = await AdSpace.findOne({ _id: req.params.id, owner: req.user.id });
    if (!adSpace) return res.status(404).json({ message: 'AdSpace not found' });

    // Delete associated images from GridFS
    for (const img of adSpace.images) {
      await bucket.delete(img.imageId);
    }

    await adSpace.deleteOne();
    await redisClient.del('availableAdSpaces');
    res.status(200).json({ message: 'AdSpace deleted' });
  } catch (error) {
    console.error('Error deleting AdSpace:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;