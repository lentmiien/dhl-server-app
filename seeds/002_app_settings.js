/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('app_settings').del();
  
  // Inserts seed entries
  await knex('app_settings').insert([
    {
      setting_key: 'dhl_api_config',
      value_json: JSON.stringify({
        base_url: 'https://api.dhl.com/v1',
        timeout: 30000,
        retry_attempts: 3
      })
    },
    {
      setting_key: 'file_upload_limits',
      value_json: JSON.stringify({
        max_file_size: 10485760,
        allowed_extensions: ['.csv'],
        max_rows_per_upload: 1000
      })
    },
    {
      setting_key: 'label_retention',
      value_json: JSON.stringify({
        temp_label_expiry_hours: 24,
        archive_after_days: 30,
        permanent_delete_after_days: 90
      })
    }
  ]);
};
