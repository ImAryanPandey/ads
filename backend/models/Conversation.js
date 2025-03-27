// backend/models/Conversation.js
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  adSpaces: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AdSpace' }], // AdSpaces discussed in this conversation
  createdAt: { type: Date, default: Date.now },
});

// Ensure unique conversation between two participants
conversationSchema.index({ participants: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);