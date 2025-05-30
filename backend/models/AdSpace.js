// backend/models/AdSpace.js
const mongoose = require('mongoose');

const adSpaceSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  images: [
    {
      imageId: { type: mongoose.Schema.Types.ObjectId, ref: 'images.files' },
      caption: { type: String, default: '' },
    },
  ],
  address: { type: String, required: true },
  footfall: { type: Number, required: true },
  footfallType: { type: String, enum: ['Daily', 'Weekly', 'Monthly'], required: true },
  pricing: {
    baseMonthlyRate: { type: Number, required: true },
  },
  availability: {
    startDate: { type: Date, required: true },
    endDate: { type: Date },
  },
  status: { type: String, enum: ['Available', 'Requested', 'Booked', 'Rejected'], default: 'Available' },
  booking: {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
    endDate: { type: Date },
    duration: {
      type: { type: String, enum: ['days', 'weeks', 'months'] },
      value: { type: Number },
    },
  },
  bookings: [
    {
      requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      duration: {
        type: { type: String, enum: ['days', 'weeks', 'months'], required: true },
        value: { type: Number, required: true },
      },
      status: { type: String, enum: ['Completed', 'Cancelled'], default: 'Completed' },
    },
  ],
  terms: { type: String },
});

module.exports = mongoose.model('AdSpace', adSpaceSchema);