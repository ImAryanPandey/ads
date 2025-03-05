const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adSpace: { type: mongoose.Schema.Types.ObjectId, ref: 'AdSpace', required: true },
  duration: {
    type: { type: String, enum: ['days', 'weeks', 'months'], required: true },
    value: { type: Number, required: true },
  },
  requirements: { type: String },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  comments: [{ sender: String, message: String, timestamp: Date }],
});

module.exports = mongoose.model('Request', requestSchema);