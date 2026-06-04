const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
  creatorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brandId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Offer details
  offerType:     { type: String, enum: ['accept', 'counter'], default: 'accept' },
  counterAmount: { type: Number },
  note:          { type: String },

  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'countered', 'withdrawn'],
    default: 'pending'
  },

  // Counter offer chain
  lastCounterBy:     { type: String, enum: ['creator', 'brand'] },
  lastCounterAmount: { type: Number },
  lastCounterNote:   { type: String },

}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);