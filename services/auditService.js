const AuditModel = require('../models/auditModel');

class AuditService {
  async logTransaction(user, transactionType, details) {
    const auditEntry = new AuditModel({
      user,
      transactionType,
      details,
      timestamp: new Date()
    });

    await auditEntry.save();
  }

  async getAuditLogs(user) {
    return await AuditModel.find({ user }).exec();
  }
}

module.exports = new AuditService();