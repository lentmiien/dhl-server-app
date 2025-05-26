const User = require('../models/User');
const logger = require('../config/logger');
const db = require('../config/db');

class UserService {
  async createUser(userData) {
    try {
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
      
      const user = await User.create(userData);
      
      // Log audit
      await this.logAudit(null, 'USER_CREATED', {
        targetUserId: user.id,
        email: user.email,
        role: user.role
      });
      
      return user;
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }
  
  async updateUserRole(userId, newRole, updatedBy) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const oldRole = user.role;
      await db('users').where({ id: userId }).update({
        role: newRole,
        updated_at: new Date()
      });
      
      // Log audit
      await this.logAudit(updatedBy, 'USER_ROLE_UPDATED', {
        targetUserId: userId,
        oldRole,
        newRole
      });
      
      return await User.findById(userId);
    } catch (error) {
      logger.error('Failed to update user role:', error);
      throw error;
    }
  }
  
  async logAudit(userId, action, metadata = {}) {
    try {
      await db('audit_logs').insert({
        user_id: userId,
        action,
        meta_json: JSON.stringify(metadata),
        created_at: new Date()
      });
    } catch (error) {
      logger.error('Failed to log audit:', error);
    }
  }
  
  hasPermission(user, action) {
    const permissions = {
      'Admin': ['*'],
      'Logistics': ['upload', 'create_labels', 'view_shipments', 'download_labels'],
      'GCS': ['upload', 'create_labels', 'view_own_shipments']
    };
    
    const userPermissions = permissions[user.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(action);
  }
}

module.exports = new UserService();
