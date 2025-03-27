// backend/scripts/archiveMessages.js
const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const ArchivedChatMessage = require('../models/ArchivedChatMessage');
const { connectDB } = require('../db');

async function archiveOldMessages() {
  try {
    await connectDB();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const oldMessages = await ChatMessage.find({ timestamp: { $lt: sixMonthsAgo } });

    if (oldMessages.length === 0) {
      console.log('No messages to archive.');
      return;
    }

    await ArchivedChatMessage.insertMany(oldMessages);
    await ChatMessage.deleteMany({ timestamp: { $lt: sixMonthsAgo } });

    console.log(`Archived and deleted ${oldMessages.length} messages.`);
  } catch (error) {
    console.error('Error archiving messages:', error);
  } finally {
    mongoose.connection.close();
  }
}

archiveOldMessages();