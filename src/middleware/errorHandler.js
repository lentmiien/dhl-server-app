const logger = require('../config/logger');
const db = require('../config/db');

const errorHandler = async (err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Log to database
  try {
    await db('error_logs').insert({
      level: 'error',
      message: err.message,
      stack: err.stack,
      meta_json: JSON.stringify({
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }),
      created_at: new Date()
    });
  } catch (dbError) {
    logger.error('Failed to log error to database:', dbError);
  }
  
  // Don't leak error details in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack })
  });
};

module.exports = errorHandler;
