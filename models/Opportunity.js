const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema({
  brandId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brandName:   { type: String, required: true },
  title:       { type: String, required: true },
  description: { type: String, required: true },
  category:    { type: String, required: true },
  budget:      { type: Number, required: true },
  deadline:    { type: Number, required: true },
  platform:    { type: String, required: true },
  status:      { type: String, enum: ['active', 'closed', 'completed'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Opportunity', opportunitySchema);