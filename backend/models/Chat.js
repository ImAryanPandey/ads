const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: function() { return !this.isSystem; } // Required only if not a system message
  },
  content: { type: String, required: true }, // Compressed if enabled
  timestamp: { type: Date, default: Date.now },
  imageId: { type: mongoose.Schema.Types.ObjectId, ref: 'images.files' }, // GridFS reference
  isSystem: { type: Boolean, default: false }, // For system messages
  read: { type: Boolean, default: false } // Added for unread tracking
});

const chatSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  messages: [messageSchema],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Chat', chatSchema);