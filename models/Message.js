const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  collaborationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collaboration', required: true, index: true },
  senderId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  receiverId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message:         { type: String, required: true },
  isRead:          { type: Boolean, default: false, index: true },
}, { timestamps: true });

// ✅ Composite index for faster queries
messageSchema.index({ collaborationId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, isRead: 1 });

module.exports = mongoose.model('Message', messageSchema);