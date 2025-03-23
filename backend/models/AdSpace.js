const mongoose = require('mongoose');

const adSpaceSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  images: [{ type: mongoose.Schema.Types.ObjectId, ref: 'images.files' }],
  address: { type: String, required: true },
  footfall: { type: Number, required: true },
  footfallType: { type: String, enum: ['Daily', 'Weekly', 'Monthly'], required: true },
  pricing: {
    baseMonthlyRate: { type: Number, required: true },
  },
  availability: {
    startDate: { type: Date, required: true }, // Changed back to required
    endDate: { type: Date },
  },
  status: { type: String, enum: ['Available', 'Requested', 'Approved', 'Rejected'], default: 'Available' },
  terms: { type: String },
});

module.exports = mongoose.model('AdSpace', adSpaceSchema);