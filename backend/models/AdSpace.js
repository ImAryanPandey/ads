const mongoose = require('mongoose');

const adSpaceSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  images: [{ type: String }],
  address: { type: String, required: true },
  footfall: { type: Number, required: true },
  footfallType: { type: String, enum: ['Daily', 'Weekly', 'Monthly'], required: true },
  pricing: {
    daily: { type: Number },
    weekly: { type: Number },
    monthly: { type: Number, required: true },
  },
  availability: {
    startDate: { type: Date },
    endDate: { type: Date },
  },
  status: { type: String, enum: ['Available', 'Requested', 'Approved', 'Rejected'], default: 'Available' },
  terms: { type: String },
});

module.exports = mongoose.model('AdSpace', adSpaceSchema);