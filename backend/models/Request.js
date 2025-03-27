// backend/models/Request.js
const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  adSpace: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AdSpace', 
    required: true 
  },
  duration: {
    type: { 
      type: String, 
      enum: ['days', 'weeks', 'months'], 
      required: true 
    },
    value: { 
      type: Number, 
      required: true,
      min: 1 
    },
  },
  requirements: { 
    type: String, 
    trim: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  rejectedAt: { type: Date }, // Track rejection timestamp
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('Request', requestSchema);