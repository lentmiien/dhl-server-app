/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Users table
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email', 255).unique().notNullable();
    table.string('hash', 255).notNullable();
    table.enum('role', ['GCS', 'Logistics', 'Admin']).defaultTo('GCS');
    table.timestamps(true, true);
    
    table.index('email');
    table.index('role');
  });

  // Uploads table
  await knex.schema.createTable('uploads', (table) => {
    table.increments('id').primary();
    table.integer('uploaded_by').unsigned().notNullable();
    table.string('filename', 255).notNullable();
    table.integer('total_rows').defaultTo(0);
    table.integer('processed_rows').defaultTo(0);
    table.integer('failed_rows').defaultTo(0);
    table.enum('status', ['PROCESSING', 'COMPLETED', 'FAILED']).defaultTo('PROCESSING');
    table.timestamps(true, true);
    
    table.foreign('uploaded_by').references('id').inTable('users');
    table.index('uploaded_by');
    table.index('status');
    table.index('created_at');
  });

  // Upload rows table
  await knex.schema.createTable('upload_rows', (table) => {
    table.increments('id').primary();
    table.integer('upload_id').unsigned().notNullable();
    table.integer('row_number').notNullable();
    table.json('raw_json').notNullable();
    table.string('recipient_name', 255);
    table.string('street', 500);
    table.string('city', 255);
    table.string('postal_code', 20);
    table.string('country', 10);
    table.string('phone', 50);
    table.decimal('weight', 10, 2).defaultTo(1.00);
    table.enum('status', ['NEW', 'VALIDATED', 'ERROR', 'LABELED', 'LABEL_ERROR']).defaultTo('NEW');
    table.text('error_msg');
    table.timestamps(true, true);
    
    table.foreign('upload_id').references('id').inTable('uploads').onDelete('CASCADE');
    table.index('upload_id');
    table.index('status');
    table.index(['upload_id', 'row_number']);
  });

  // Shipments table
  await knex.schema.createTable('shipments', (table) => {
    table.increments('id').primary();
    table.integer('upload_id').unsigned();
    table.integer('upload_row_id').unsigned();
    table.string('dhl_ref', 100);
    table.string('tracking_number', 100);
    table.string('label_url', 500);
    table.string('recipient_name', 255).notNullable();
    table.json('address_json').notNullable();
    table.enum('status', ['PENDING', 'LABELED', 'SHIPPED', 'DELIVERED', 'CANCELLED']).defaultTo('PENDING');
    table.timestamp('estimated_delivery').nullable();
    table.decimal('cost_amount', 10, 2);
    table.string('cost_currency', 3).defaultTo('USD');
    table.timestamps(true, true);
    
    table.foreign('upload_id').references('id').inTable('uploads');
    table.foreign('upload_row_id').references('id').inTable('upload_rows');
    table.index('upload_id');
    table.index('dhl_ref');
    table.index('tracking_number');
    table.index('status');
    table.index('created_at');
  });

  // Temporary labels table
  await knex.schema.createTable('temp_labels', (table) => {
    table.increments('id').primary();
    table.integer('shipment_id').unsigned().notNullable();
    table.specificType('pdf_blob', 'LONGBLOB');
    table.string('s3_key', 500);
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.foreign('shipment_id').references('id').inTable('shipments').onDelete('CASCADE');
    table.index('shipment_id');
    table.index('expires_at');
  });

  // App settings table
  await knex.schema.createTable('app_settings', (table) => {
    table.string('setting_key', 100).primary();
    table.json('value_json').notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('updated_at');
  });

  // Audit logs table
  await knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned();
    table.string('action', 100).notNullable();
    table.json('meta_json');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.foreign('user_id').references('id').inTable('users');
    table.index('user_id');
    table.index('action');
    table.index('created_at');
  });

  // Error logs table
  await knex.schema.createTable('error_logs', (table) => {
    table.increments('id').primary();
    table.string('level', 20).notNullable();
    table.text('message').notNullable();
    table.text('stack');
    table.json('meta_json');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index('level');
    table.index('created_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop tables in reverse order to handle foreign key constraints
  await knex.schema.dropTableIfExists('error_logs');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('app_settings');
  await knex.schema.dropTableIfExists('temp_labels');
  await knex.schema.dropTableIfExists('shipments');
  await knex.schema.dropTableIfExists('upload_rows');
  await knex.schema.dropTableIfExists('uploads');
  await knex.schema.dropTableIfExists('users');
};
