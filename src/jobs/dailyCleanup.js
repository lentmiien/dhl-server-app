const cron = require('node-cron');
const db = require('../config/db');
const logger = require('../config/logger');

// Run daily at 00:10
cron.schedule('10 0 * * *', async () => {
  try {
    logger.info('Starting daily cleanup job');
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    // Clean up temp labels older than 24 hours
    const tempLabelsDeleted = await db('temp_labels')
      .where('expires_at', '<', now)
      .del();
    
    logger.info(`Deleted ${tempLabelsDeleted} expired temp labels`);
    
    // Archive old completed uploads (move to archive table or S3)
    const oldUploads = await db('uploads')
      .where('status', 'COMPLETED')
      .where('created_at', '<', thirtyDaysAgo);
    
    if (oldUploads.length > 0) {
      // In a real implementation, you would backup to S3 here
      logger.info(`Found ${oldUploads.length} old uploads to archive`);
    }
    
    // Clean up old audit logs (older than 90 days)
    const auditLogsDeleted = await db('audit_logs')
      .where('created_at', '<', ninetyDaysAgo)
      .del();
    
    logger.info(`Deleted ${auditLogsDeleted} old audit log entries`);
    
    // Clean up old error logs (older than 90 days)
    const errorLogsDeleted = await db('error_logs')
      .where('created_at', '<', ninetyDaysAgo)
      .del();
    
    logger.info(`Deleted ${errorLogsDeleted} old error log entries`);
    
    logger.info('Daily cleanup job completed successfully');
  } catch (error) {
    logger.error('Daily cleanup job failed:', error);
  }
});

logger.info('Daily cleanup cron job scheduled');
