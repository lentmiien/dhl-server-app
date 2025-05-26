const db = require('../config/db');

class Shipment {
  static async create(shipmentData) {
    const [id] = await db('shipments').insert({
      ...shipmentData,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    return this.findById(id);
  }
  
  static async findById(id) {
    return await db('shipments').where({ id }).first();
  }
  
  static async findByUploadId(uploadId) {
    return await db('shipments').where({ upload_id: uploadId }).orderBy('created_at');
  }
  
  static async updateLabel(id, labelData) {
    return await db('shipments').where({ id }).update({
      dhl_ref: labelData.dhl_ref,
      tracking_number: labelData.tracking_number,
      label_url: labelData.label_url,
      status: 'LABELED',
      updated_at: new Date()
    });
  }
  
  static async list(filters = {}) {
    let query = db('shipments');
    
    if (filters.status) {
      query = query.where('status', filters.status);
    }
    
    if (filters.upload_id) {
      query = query.where('upload_id', filters.upload_id);
    }
    
    return await query.orderBy('created_at', 'desc');
  }
}

module.exports = Shipment;
