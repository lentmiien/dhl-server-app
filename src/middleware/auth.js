const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const logger = require('../config/logger');

const auth = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
      }
      
      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid token.' });
      }
      
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      }
      
      req.user = user;
      next();
    } catch (error) {
      logger.error('Auth middleware error:', error);
      res.status(401).json({ message: 'Invalid token.' });
    }
  };
};

module.exports = auth;
