require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  
  // Database
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 3306,
  DB_NAME: process.env.DB_NAME || 'dhl_shipping',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  
  // Encryption
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'fallback-32-character-key-here!!',
  
  // MyDHL API
  DHL_API_URL: process.env.DHL_API_URL || 'https://api.dhl.com/v1',
  DHL_API_KEY: process.env.DHL_API_KEY || 'test-api-key',
  DHL_CLIENT_ID: process.env.DHL_CLIENT_ID || 'test-client-id',
  DHL_CLIENT_SECRET: process.env.DHL_CLIENT_SECRET || 'test-client-secret',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60,
  
  // File Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
};
