const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  collaborationId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Collaboration', required: true },
  brandId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creatorId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  totalAmount:        { type: Number, required: true },
  commissionRate:     { type: Number, default: 10 },
  platformCommission: { type: Number },
  creatorAmount:      { type: Number },

  // Brand payment proof
  screenshotUrl:      { type: String },
  brandJazzCash:      { type: String },
  paymentNote:        { type: String },
  transactionId: { type: String },
  // Creator payment info
  creatorJazzCash:    { type: String },

  status: {
    type: String,
    enum: ['pending', 'screenshot_uploaded', 'verified', 'released', 'refunded'],
    default: 'pending'
  },

  verifiedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt:   { type: Date },
  releasedAt:   { type: Date },

}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);