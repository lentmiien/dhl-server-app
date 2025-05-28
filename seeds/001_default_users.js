const bcrypt = require('bcrypt');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del();
  
  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 12);
  const gcsPassword = await bcrypt.hash('gcs123', 12);
  const logisticsPassword = await bcrypt.hash('logistics123', 12);
  
  // Inserts seed entries
  await knex('users').insert([
    {
      email: 'admin@dhl-shipping.com',
      hash: adminPassword,
      role: 'Admin'
    },
    {
      email: 'gcs@dhl-shipping.com',
      hash: gcsPassword,
      role: 'GCS'
    },
    {
      email: 'logistics@dhl-shipping.com',
      hash: logisticsPassword,
      role: 'Logistics'
    }
  ]);
};
