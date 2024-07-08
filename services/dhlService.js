const axios = require('axios');
const config = require('../config/config');
const PQueue = require('p-queue').default;

class DHLService {
  constructor() {
    this.baseURL = "https://api.dhl.com/";
    this.apiKey = config.dhlApiKey;
    this.queue = new PQueue({ intervalCap: 300, interval: 60000 }); // Max 300 requests per minute
  }

  async generateShippingLabel(shipmentData) {
    try {
      const response = await axios.post(`${this.baseURL}/shipments`, shipmentData, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error generating label: ', error);
      throw new Error('Error generating shipping label');
    }
  }

  async addToQueue(shipmentData) {
    return this.queue.add(() => this.generateShippingLabel(shipmentData));
  }

  async processBatch(shipmentDataArray) {
    const promises = shipmentDataArray.map(data => this.addToQueue(data));
    return Promise.all(promises);
  }
}

module.exports = new DHLService();