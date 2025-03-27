// backend/models/ArchivedChatMessage.js
const mongoose = require('mongoose');

const archivedChatMessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['user', 'system'], default: 'user' },
  content: { type: String },
  attachment: {
    type: { type: String, enum: ['image', 'file'], default: null },
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'images.files' },
    filename: { type: String },
  },
  timestamp: { type: Date, required: true },
  read: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
});

// Indexes for performance
archivedChatMessageSchema.index({ conversationId: 1 });

module.exports = mongoose.model('ArchivedChatMessage', archivedChatMessageSchema);