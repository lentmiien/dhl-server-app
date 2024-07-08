const express = require('express');
const router = express.Router();
const labelController = require('../controllers/labelController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/generate-label', upload.single('file'), labelController.generateLabel);
router.get('/batch-status/:batchId', labelController.checkBatchStatus);

module.exports = router;