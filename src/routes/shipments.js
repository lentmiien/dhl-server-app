const express = require('express');
const auth = require('../middleware/auth');
const Shipment = require('../models/Shipment');
const UploadRow = require('../models/UploadRow');
const userService = require('../services/userService');
const dhlService = require('../services/dhlService');
const logger = require('../config/logger');

const router = express.Router();

// Create labels in batch
router.post('/batch', auth(['GCS', 'Logistics', 'Admin']), async (req, res, next) => {
  try {
    const { uploadId, filters = {} } = req.body;
    
    // Get validated rows
    const rows = await UploadRow.findByUploadId(uploadId, { 
      status: filters.status || 'VALIDATED' 
    });
    
    if (rows.length === 0) {
      return res.status(400).json({ message: 'No validated rows found for label creation' });
    }
    
    let successCount = 0;
    let failedCount = 0;
    const results = [];
    
    for (const row of rows) {
      try {
        const rawData = JSON.parse(row.raw_json);
        
        // Create label via DHL
        const labelResult = await dhlService.createLabel({
          recipient: {
            name: row.recipient_name,
            street: row.street,
            city: row.city,
            postal_code: row.postal_code,
            country: row.country,
            phone: row.phone
          },
          package: {
            weight: row.weight || 1.0,
            dimensions: {
              length: rawData.length || 10,
              width: rawData.width || 10,
              height: rawData.height || 10
            }
          }
        });
        
        // Create shipment record
        const shipment = await Shipment.create({
          upload_id: uploadId,
          upload_row_id: row.id,
          dhl_ref: labelResult.dhl_ref,
          tracking_number: labelResult.trackingNumber,
          label_url: labelResult.label_url,
          recipient_name: row.recipient_name,
          address_json: JSON.stringify({
            street: row.street,
            city: row.city,
            postal_code: row.postal_code,
            country: row.country
          }),
          status: 'LABELED',
          estimated_delivery: labelResult.estimated_delivery,
          cost_amount: parseFloat(labelResult.cost.amount),
          cost_currency: labelResult.cost.currency
        });
        
        // Update row status
        await UploadRow.updateStatus(row.id, 'LABELED');
        
        results.push({
          rowId: row.id,
          shipmentId: shipment.id,
          trackingNumber: labelResult.trackingNumber,
          success: true
        });
        
        successCount++;
      } catch (error) {
        await UploadRow.updateStatus(row.id, 'LABEL_ERROR', error.message);
        
        results.push({
          rowId: row.id,
          error: error.message,
          success: false
        });
        
        failedCount++;
      }
    }
    
    // Log audit
    await userService.logAudit(req.user.id, 'BATCH_LABELS_CREATED', {
      uploadId,
      successCount,
      failedCount,
      totalRows: rows.length
    });
    
    logger.info('Batch label creation completed', {
      uploadId,
      successCount,
      failedCount,
      userId: req.user.id
    });
    
    res.json({
      message: `Batch processing completed: ${successCount} successful, ${failedCount} failed`,
      successCount,
      failedCount,
      results
    });
  } catch (error) {
    next(error);
  }
});

// Create single label
router.post('/:id/label', auth(['GCS', 'Logistics', 'Admin']), async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    if (shipment.status === 'LABELED') {
      return res.status(400).json({ message: 'Label already created for this shipment' });
    }
    
    const addressData = JSON.parse(shipment.address_json);
    
    const labelResult = await dhlService.createLabel({
      recipient: {
        name: shipment.recipient_name,
        ...addressData
      },
      package: {
        weight: 1.0 // Default weight, should come from shipment data
      }
    });
    
    await Shipment.updateLabel(shipment.id, labelResult);
    
    await userService.logAudit(req.user.id, 'LABEL_CREATED', {
      shipmentId: shipment.id,
      trackingNumber: labelResult.trackingNumber
    });
    
    res.json({
      message: 'Label created successfully',
      trackingNumber: labelResult.trackingNumber,
      dhl_ref: labelResult.dhl_ref
    });
  } catch (error) {
    next(error);
  }
});

// Get label PDF
router.get('/:id/label', auth(['GCS', 'Logistics', 'Admin']), async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    if (!shipment.dhl_ref) {
      return res.status(400).json({ message: 'No label available for this shipment' });
    }
    
    const pdfBuffer = await dhlService.getLabel(shipment.dhl_ref);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="label-${shipment.tracking_number}.pdf"`
    });
    
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// Get invoice PDF
router.get('/:id/invoice', auth(['GCS', 'Logistics', 'Admin']), async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    if (!shipment.dhl_ref) {
      return res.status(400).json({ message: 'No invoice available for this shipment' });
    }
    
    const pdfBuffer = await dhlService.getInvoice(shipment.dhl_ref);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${shipment.tracking_number}.pdf"`
    });
    
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// List shipments
router.get('/', auth(['GCS', 'Logistics', 'Admin']), async (req, res, next) => {
  try {
    const shipments = await Shipment.list(req.query);
    res.json({ shipments });
  } catch (error) {
    next(error);
  }
});

// Get shipment details
router.get('/:id', auth(['GCS', 'Logistics', 'Admin']), async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    res.json({ shipment });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
