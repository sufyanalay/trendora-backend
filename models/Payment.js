const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  collaborationId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Collaboration', required: true, index: true },
  brandId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  creatorId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  totalAmount:        { type: Number, required: true },
  commissionRate:     { type: Number, default: 10 },
  platformCommission: { type: Number },
  creatorAmount:      { type: Number },

  // Brand payment proof
  screenshotUrl:      { type: String },
  brandJazzCash:      { type: String },
  paymentNote:        { type: String },
  transactionId:      { type: String, index: true },
  // Creator payment info
  creatorJazzCash:    { type: String },

  status: {
    type: String,
    enum: ['pending', 'screenshot_uploaded', 'verified', 'released', 'refunded'],
    default: 'pending',
    index: true
  },

  verifiedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt:   { type: Date },
  releasedAt:   { type: Date },

}, { timestamps: true });

// ✅ Composite indexes for faster queries
paymentSchema.index({ brandId: 1, createdAt: -1 });
paymentSchema.index({ creatorId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);