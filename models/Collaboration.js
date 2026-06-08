const mongoose = require('mongoose');

const collaborationSchema = new mongoose.Schema({
  opportunityId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
  applicationId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  brandId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creatorId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  agreedAmount:   { type: Number, required: true },
  deadline:       { type: Number, required: true },

  status: {
    type: String,
    enum: ['payment_pending', 'active', 'submitted', 'revision', 'completed', 'cancelled', 'disputed'],
    default: 'payment_pending' // ← Pehle payment pending
  },

  submittedWork:  { type: String },
  submittedAt:    { type: Date },
  revisionNote:   { type: String },
  completedAt:    { type: Date },

  chatUnlocked:   { type: Boolean, default: false },

  paymentStatus: {
    type: String,
    enum: ['pending', 'screenshot_uploaded', 'verified', 'released', 'refunded'],
    default: 'pending'
  },

}, { timestamps: true });

module.exports = mongoose.model('Collaboration', collaborationSchema);