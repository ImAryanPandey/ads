// backend/models/ChatMessage.js
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
  adSpaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdSpace', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }, // Add read field
});

// Add TTL index to delete messages after 6 months
chatMessageSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 6 * 30 * 24 * 60 * 60 } // 6 months
);

// Indexes for performance
chatMessageSchema.index({ requestId: 1 });
chatMessageSchema.index({ adSpaceId: 1 });
chatMessageSchema.index({ sender: 1, recipient: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);