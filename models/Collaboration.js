const mongoose = require('mongoose');

const collaborationSchema = new mongoose.Schema({
  opportunityId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
  applicationId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  brandId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creatorId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  agreedAmount:   { type: Number, required: true },
  deadline:       { type: Number, required: true }, // days

  status: {
    type: String,
    enum: ['active', 'submitted', 'revision', 'completed', 'cancelled', 'disputed'],
    default: 'active'
  },

  // Work submission
  submittedWork:  { type: String },  // link or description
  submittedAt:    { type: Date },
  revisionNote:   { type: String },
  completedAt:    { type: Date },

  // Chat
  chatUnlocked:   { type: Boolean, default: true }, // unlock on creation

  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'released', 'refunded'],
    default: 'pending'
  },

}, { timestamps: true });

module.exports = mongoose.model('Collaboration', collaborationSchema);