const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:    { type: String, required: true },
  message:  { type: String, required: true },
  type:     { type: String, enum: ['application', 'collaboration', 'payment', 'message', 'system'], default: 'system' },
  isRead:   { type: Boolean, default: false },
  link:     { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);