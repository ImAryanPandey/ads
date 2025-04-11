const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  title: { type: String, default: 'General Chat' }, // Default title, can be overridden by system message
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Unique index on participants to fetch existing conversations
conversationSchema.index({ participants: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);