// models/User.js
const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String },
  phone: { type: String },
  password: { type: String, required: true },
  loginMethod: { type: String, enum: ['email', 'phone'], required: true },
  loginDate: { type: String },
  loginTime: { type: String },
  createdAt: { type: Date, default: Date.now },
  loginHistory: [{
    date: { type: String },
    time: { type: String },
    method: { type: String },
    device: { type: String, default: 'Web Browser' }
  }]
});

const User = mongoose.model('User', userSchema);

module.exports = User;