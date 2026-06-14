const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  collaborationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collaboration', required: true },
  brandId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creatorId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating:          { type: Number, required: true, min: 1, max: 5 },
  review:          { type: String, required: true },
}, { timestamps: true });

// Ek collaboration pe sirf ek review
reviewSchema.index({ collaborationId: true, brandId: true }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);