const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  collaborationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collaboration', required: true },
  senderId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:         { type: String, required: true },
  isRead:          { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);