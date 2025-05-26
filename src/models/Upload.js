const db = require('../config/db');

class Upload {
  static async create(uploadData) {
    const { uploaded_by, filename, total_rows } = uploadData;
    
    const [id] = await db('uploads').insert({
      uploaded_by,
      filename,
      total_rows,
      processed_rows: 0,
      failed_rows: 0,
      status: 'PROCESSING',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    return this.findById(id);
  }
  
  static async findById(id) {
    return await db('uploads').where({ id }).first();
  }
  
  static async updateStatus(id, status, stats = {}) {
    const updateData = {
      status,
      updated_at: new Date(),
      ...stats
    };
    
    return await db('uploads').where({ id }).update(updateData);
  }
  
  static async list(userId, filters = {}) {
    let query = db('uploads').where({ uploaded_by: userId });
    
    if (filters.status) {
      query = query.where('status', filters.status);
    }
    
    return await query.orderBy('created_at', 'desc');
  }
}

module.exports = Upload;
