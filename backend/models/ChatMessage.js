// backend/models/ChatMessage.js
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['user', 'system'], default: 'user' }, // 'user' for regular messages, 'system' for AdSpace tags
  content: { type: String },
  attachment: {
    type: { type: String, enum: ['image', 'file'], default: null },
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'images.files' },
    filename: { type: String },
  },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
});

// Indexes for performance
chatMessageSchema.index({ conversationId: 1 });
chatMessageSchema.index({ sender: 1, recipient: 1 });
chatMessageSchema.index({ timestamp: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);