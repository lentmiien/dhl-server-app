const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const userService = require('../services/userService');
const db = require('../config/db');

const router = express.Router();

// All admin routes require Admin role
router.use(auth(['Admin']));

// List users
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.list(req.query);
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// Create user
router.post('/users', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['GCS', 'Logistics', 'Admin'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    }
    
    const user = await userService.createUser(req.body);
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.patch('/users/:id', [
  body('role').optional().isIn(['GCS', 'Logistics', 'Admin']),
  body('password').optional().isLength({ min: 6 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    }
    
    const userId = req.params.id;
    const { role, password } = req.body;
    
    if (role) {
      await userService.updateUserRole(userId, role, req.user.id);
    }
    
    if (password) {
      await User.updatePassword(userId, password);
      await userService.logAudit(req.user.id, 'USER_PASSWORD_UPDATED', {
        targetUserId: userId
      });
    }
    
    const updatedUser = await User.findById(userId);
    
    res.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get audit logs
router.get('/logs', async (req, res, next) => {
  try {
    const { type = 'audit', from, to, userId, action } = req.query;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    let query;
    
    if (type === 'audit') {
      query = db('audit_logs')
        .select('audit_logs.*', 'users.email as user_email')
        .leftJoin('users', 'audit_logs.user_id', 'users.id');
    } else if (type === 'error') {
      query = db('error_logs').select('*');
    } else {
      return res.status(400).json({ message: 'Invalid log type' });
    }
    
    // Apply filters
    if (from) {
      query = query.where('created_at', '>=', from);
    }
    
    if (to) {
      query = query.where('created_at', '<=', to);
    }
    
    if (userId && type === 'audit') {
      query = query.where('user_id', userId);
    }
    
    if (action && type === 'audit') {
      query = query.where('action', action);
    }
    
    // Get total count
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    
    // Get paginated results
    const logs = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    res.json({
      logs,
      pagination: {
        total: parseInt(count),
        limit,
        offset,
        hasMore: offset + limit < parseInt(count)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get system stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await Promise.all([
      db('users').count('* as count').first(),
      db('uploads').count('* as count').first(),
      db('shipments').count('* as count').first(),
      db('shipments').where('status', 'LABELED').count('* as count').first(),
      db('upload_rows').where('status', 'ERROR').count('* as count').first()
    ]);
    
    res.json({
      totalUsers: parseInt(stats[0].count),
      totalUploads: parseInt(stats[1].count),
      totalShipments: parseInt(stats[2].count),
      labeledShipments: parseInt(stats[3].count),
      errorRows: parseInt(stats[4].count)
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
