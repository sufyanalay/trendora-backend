const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  collaborationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collaboration', required: true },
  brandId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creatorId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  raisedBy:        { type: String, enum: ['brand', 'creator'], required: true },
  reason:          { type: String, required: true },
  status:          { type: String, enum: ['open', 'reviewing', 'resolved', 'closed'], default: 'open' },
  decision:        { type: String, enum: ['release', 'refund', 'partial'] },
  resolution:      { type: String },
  resolvedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt:      { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Dispute', disputeSchema);