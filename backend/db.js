require('dotenv').config();
const mongoose = require('mongoose');
const redis = require('redis');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  password: process.env.REDIS_PASSWORD,
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

module.exports = { connectDB, redisClient };