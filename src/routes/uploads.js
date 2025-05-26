const express = require('express');
const multer = require('multer');
const csv = require('csv-parse');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Upload = require('../models/Upload');
const UploadRow = require('../models/UploadRow');
const userService = require('../services/userService');
const dhlService = require('../services/dhlService');
const config = require('../config');
const logger = require('../config/logger');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: config.MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Upload CSV file
router.post('/', auth(['GCS', 'Logistics', 'Admin']), upload.single('csvFile'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file provided' });
    }
    
    const csvContent = req.file.buffer.toString();
    const rows = [];
    
    // Parse CSV
    csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    })
    .on('data', (row) => {
      rows.push(row);
    })
    .on('error', (error) => {
      throw new Error(`CSV parsing failed: ${error.message}`);
    })
    .on('end', async () => {
      try {
        // Create upload record
        const uploadRecord = await Upload.create({
          uploaded_by: req.user.id,
          filename: req.file.originalname,
          total_rows: rows.length
        });
        
        // Process rows
        let processedCount = 0;
        let failedCount = 0;
        
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            // Validate required fields
            const requiredFields = ['recipient_name', 'street', 'city', 'postal_code', 'country'];
            const missingFields = requiredFields.filter(field => !row[field]);
            
            if (missingFields.length > 0) {
              throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }
            
            // Create upload row record
            await UploadRow.create({
              upload_id: uploadRecord.id,
              row_number: i + 1,
              raw_json: JSON.stringify(row),
              recipient_name: row.recipient_name,
              street: row.street,
              city: row.city,
              postal_code: row.postal_code,
              country: row.country,
              phone: row.phone || null,
              weight: parseFloat(row.weight) || 1.0,
              status: 'NEW'
            });
            
            processedCount++;
          } catch (error) {
            // Create failed row record
            await UploadRow.create({
              upload_id: uploadRecord.id,
              row_number: i + 1,
              raw_json: JSON.stringify(row),
              status: 'ERROR',
              error_msg: error.message
            });
            
            failedCount++;
          }
        }
        
        // Update upload status
        await Upload.updateStatus(uploadRecord.id, 'COMPLETED', {
          processed_rows: processedCount,
          failed_rows: failedCount
        });
        
        // Log audit
        await userService.logAudit(req.user.id, 'CSV_UPLOADED', {
          uploadId: uploadRecord.id,
          filename: req.file.originalname,
          totalRows: rows.length,
          processedRows: processedCount,
          failedRows: failedCount
        });
        
        logger.info(`CSV uploaded successfully: ${req.file.originalname}`, {
          uploadId: uploadRecord.id,
          userId: req.user.id
        });
        
        res.status(201).json({
          uploadId: uploadRecord.id,
          filename: req.file.originalname,
          totalRows: rows.length,
          processedRows: processedCount,
          failedRows: failedCount
        });
      } catch (error) {
        next(error);
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get upload details
router.get('/:id', auth(['GCS', 'Logistics', 'Admin']), async (req, res, next) => {
  try {
    const upload = await Upload.findById(req.params.id);
    if (!upload) {
      return res.status(404).json({ message: 'Upload not found' });
    }
    
    // Check permissions (users can only see their own uploads unless Admin)
    if (req.user.role !== 'Admin' && upload.uploaded_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const rows = await UploadRow.findByUploadId(upload.id);
    const statusCounts = await UploadRow.getStatusCounts(upload.id);
    
    res.json({
      upload,
      rows,
      statusCounts
    });
  } catch (error) {
    next(error);
  }
});

// List user uploads
router.get('/', auth(['GCS', 'Logistics', 'Admin']), async (req, res, next) => {
  try {
    const userId = req.user.role === 'Admin' ? req.query.userId : req.user.id;
    const uploads = await Upload.list(userId, req.query);
    
    res.json({ uploads });
  } catch (error) {
    next(error);
  }
});

// Retry failed rows
router.patch('/:id/retry', auth(['GCS', 'Logistics', 'Admin']), async (req, res, next) => {
  try {
    const upload = await Upload.findById(req.params.id);
    if (!upload) {
      return res.status(404).json({ message: 'Upload not found' });
    }
    
    // Check permissions
    if (req.user.role !== 'Admin' && upload.uploaded_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get failed rows
    const failedRows = await UploadRow.findByUploadId(upload.id, { status: 'ERROR' });
    
    let retriedCount = 0;
    for (const row of failedRows) {
      try {
        // Validate address with DHL
        const rawData = JSON.parse(row.raw_json);
        const validationResult = await dhlService.validateAddress({
          street: rawData.street,
          city: rawData.city,
          postal_code: rawData.postal_code,
          country: rawData.country
        });
        
        if (validationResult.isValid) {
          await UploadRow.updateStatus(row.id, 'VALIDATED');
          retriedCount++;
        } else {
          await UploadRow.updateStatus(row.id, 'ERROR', 'Address validation failed');
        }
      } catch (error) {
        await UploadRow.updateStatus(row.id, 'ERROR', error.message);
      }
    }
    
    // Log audit
    await userService.logAudit(req.user.id, 'UPLOAD_RETRY', {
      uploadId: upload.id,
      retriedCount
    });
    
    res.json({
      message: `Retried ${retriedCount} rows`,
      retriedCount
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
