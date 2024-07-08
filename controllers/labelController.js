const dhlService = require('../services/dhlService');
const { parseCSV } = require('../utils/fileHandler');
const mappingService = require('../services/mappingService');

const generateLabel = async (req, res) => {
  try {
    const csvData = await parseCSV(req.file.path);
    const shipmentDataArray = csvData.map(record => mappingService.mapCSVtoDHLRequest(record));

    // Background processing start
    const batchId = await queueBatchForProcessing(shipmentDataArray);

    res.status(200).json({ message: 'Batch processing started', batchId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const checkBatchStatus = async (req, res) => {
  try {
    const { batchId } = req.params;
    const status = await getBatchStatus(batchId);
    
    res.status(200).json({ status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

async function queueBatchForProcessing(shipmentDataArray) {
  // Add your batch to the DB and initiate the processing
  const newBatch = await BatchModel.create({ status: 'processing', createdAt: new Date() });

  process.nextTick(async () => {
    try {
      const results = await dhlService.processBatch(shipmentDataArray);
      // Save results and update the batch status
      await saveBatchResults(newBatch._id, results);
      await BatchModel.findByIdAndUpdate(newBatch._id, { status: 'complete', results });
    } catch (error) {
      await BatchModel.findByIdAndUpdate(newBatch._id, { status: 'error', error });
    }
  });

  return newBatch._id;
}

async function getBatchStatus(batchId) {
  const batch = await BatchModel.findById(batchId);
  if (!batch) throw new Error('Batch not found');
  return batch;
}

module.exports = {
  generateLabel,
  checkBatchStatus,
};