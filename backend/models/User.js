const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['owner', 'advertiser', ''], default: '' },
  verified: { type: Boolean, default: false },
  profile: {
    phone: { type: String, default: '' },
    location: { type: String }, // for owners
    businessName: { type: String }, // for advertisers
  },
  profileCompleted: { type: Boolean, default: false },
});

// Single pre('save') hook to handle password hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  // Skip if already a bcrypt hash
  if (this.password.startsWith('$2a$')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Define the comparePassword method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);