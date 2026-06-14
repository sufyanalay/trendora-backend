const mongoose = require('mongoose');

const collaborationSchema = new mongoose.Schema({
  opportunityId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true, index: true },
  applicationId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
  brandId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  creatorId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  agreedAmount:   { type: Number, required: true },
  deadline:       { type: Number, required: true },

  status: {
    type: String,
    enum: ['payment_pending', 'active', 'submitted', 'revision', 'completed', 'cancelled', 'disputed'],
    default: 'payment_pending',
    index: true
  },

  submittedWork:  { type: String },
  submittedAt:    { type: Date },
  revisionNote:   { type: String },
  completedAt:    { type: Date },
  chatUnlocked:   { type: Boolean, default: false, index: true },

  // ✅ paid enum mein add kiya
  paymentStatus: {
    type: String,
    enum: ['pending', 'screenshot_uploaded', 'paid', 'verified', 'released', 'refunded'],
    default: 'pending',
    index: true
  },

}, { timestamps: true });

// ✅ Composite indexes for faster queries
collaborationSchema.index({ brandId: 1, createdAt: -1 });
collaborationSchema.index({ creatorId: 1, createdAt: -1 });
collaborationSchema.index({ status: 1, paymentStatus: 1 });

module.exports = mongoose.model('Collaboration', collaborationSchema);