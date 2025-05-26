const knex = require('knex');
const config = require('./index');

const db = knex({
  client: 'mysql2',
  connection: {
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    charset: 'utf8mb4'
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 600000
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations'
  }
});

module.exports = db;
