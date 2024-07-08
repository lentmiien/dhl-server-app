const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
  status: { type: String, enum: ['processing', 'complete', 'error'], default: 'processing' },
  createdAt: { type: Date, default: Date.now },
  results: { type: [Object], default: [] },
  error: { type: String, default: '' }
});

module.exports = mongoose.model('Batch', BatchSchema);