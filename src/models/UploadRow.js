const db = require('../config/db');

class UploadRow {
  static async create(rowData) {
    const [id] = await db('upload_rows').insert({
      ...rowData,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    return this.findById(id);
  }
  
  static async findById(id) {
    return await db('upload_rows').where({ id }).first();
  }
  
  static async findByUploadId(uploadId, filters = {}) {
    let query = db('upload_rows').where({ upload_id: uploadId });
    
    if (filters.status) {
      query = query.where('status', filters.status);
    }
    
    return await query.orderBy('row_number');
  }
  
  static async updateStatus(id, status, errorMsg = null) {
    return await db('upload_rows').where({ id }).update({
      status,
      error_msg: errorMsg,
      updated_at: new Date()
    });
  }
  
  static async getStatusCounts(uploadId) {
    const counts = await db('upload_rows')
      .where({ upload_id: uploadId })
      .select('status')
      .count('* as count')
      .groupBy('status');
    
    return counts.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});
  }
}

module.exports = UploadRow;
