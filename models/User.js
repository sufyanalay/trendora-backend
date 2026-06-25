const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName:         { type: String, required: true },
  email:            { type: String, required: true, unique: true },
  password:         { type: String, required: true },
  role:             { type: String, enum: ['creator', 'brand', 'admin'], default: 'creator' },
  socialPlatform:   { type: String },
  socialProfileUrl: { type: String },
  address:          { type: String },
  brandName:        { type: String },
  websiteUrl:       { type: String },
  brandAddress:     { type: String },
  isBanned:         { type: Boolean, default: false },

  // ✅ Payment fields
  jazzCashNumber:   { type: String },
  easypaisaNumber:  { type: String },
  bankName:         { type: String },
  bankAccountNumber:{ type: String },
  bankAccountTitle: { type: String },
  isVerified:         { type: Boolean, default: false },
  verificationCode:   { type: String },
  verificationExpire: { type: Date },
  averageRating: { type: Number, default: 0 },
totalReviews:  { type: Number, default: 0 },
withdrawCount:    { type: Number, default: 0 },
withdrawBannedUntil: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);