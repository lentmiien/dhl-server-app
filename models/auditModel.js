const mongoose = require('mongoose');

const AuditSchema = new mongoose.Schema({
  user: { type: String, required: true },
  transactionType: { type: String, required: true },
  details: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Audit', AuditSchema);