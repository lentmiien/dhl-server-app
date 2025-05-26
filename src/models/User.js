const db = require('../config/db');
const bcrypt = require('bcrypt');

class User {
  static async create(userData) {
    const { email, password, role = 'GCS' } = userData;
    const hash = await bcrypt.hash(password, 12);
    
    const [id] = await db('users').insert({
      email,
      hash,
      role,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    return this.findById(id);
  }
  
  static async findById(id) {
    return await db('users').where({ id }).first();
  }
  
  static async findByEmail(email) {
    return await db('users').where({ email }).first();
  }
  
  static async validatePassword(user, password) {
    return await bcrypt.compare(password, user.hash);
  }
  
  static async updatePassword(id, newPassword) {
    const hash = await bcrypt.hash(newPassword, 12);
    return await db('users').where({ id }).update({
      hash,
      updated_at: new Date()
    });
  }
  
  static async list(filters = {}) {
    let query = db('users').select('id', 'email', 'role', 'created_at', 'updated_at');
    
    if (filters.role) {
      query = query.where('role', filters.role);
    }
    
    return await query.orderBy('created_at', 'desc');
  }
}

module.exports = User;
