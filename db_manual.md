# Database Migration Management Guide

This guide explains how to manage database migrations for the DHL Shipping Web System.

## Prerequisites

- Node.js 18+ installed
- MySQL 8.0+ running
- Environment variables configured in `.env`

## Quick Start

```bash
# Install dependencies and set up database
npm run setup

# Or do it step by step:
npm install
npm run db:migrate
npm run db:seed
```

## Migration Commands

### Running Migrations

```bash
# Apply all pending migrations
npm run db:migrate

# Check migration status
npm run db:status
```

### Rolling Back Migrations

```bash
# Rollback the last migration batch
npm run db:rollback

# Rollback all migrations (WARNING: This will delete all data)
npm run db:rollback:all
```

### Creating New Migrations

```bash
# Create a new migration file
npm run db:make:migration add_new_table

# This creates: migrations/YYYYMMDDHHMMSS_add_new_table.js
```

### Database Reset & Fresh Start

```bash
# Reset database (rollback all + migrate + seed)
npm run db:reset

# Fresh migration (rollback all + migrate only)
npm run db:fresh
```

## Seed Data

### Running Seeds

```bash
# Run all seed files
npm run db:seed
```

### Creating New Seeds

```bash
# Create a new seed file
npm run db:make:seed add_sample_data

# This creates: seeds/add_sample_data.js
```

## Migration File Structure

Migration files follow this naming pattern: `YYYYMMDDHHMMSS_description.js`

### Basic Migration Template

```javascript
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create or modify database schema
  await knex.schema.createTable('example_table', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Reverse the changes made in up()
  await knex.schema.dropTableIfExists('example_table');
};
```

## Best Practices

### 1. Migration Naming

Use descriptive names that explain what the migration does:
- ✅ `add_invoice_number_to_shipments`
- ✅ `create_payment_methods_table`
- ❌ `update_table`
- ❌ `fix_stuff`

### 2. Always Include Down Migration

Every migration should have a corresponding `down()` function that reverses the changes.

### 3. Test Migrations

Always test both up and down migrations:

```bash
npm run db:migrate
npm run db:rollback
npm run db:migrate
```

### 4. Data Migrations

For data transformations, create separate migration files:

```javascript
exports.up = async function(knex) {
  // First, add the new column
  await knex.schema.table('users', (table) => {
    table.string('full_name');
  });
  
  // Then, populate it with data
  const users = await knex('users').select('*');
  for (const user of users) {
    await knex('users')
      .where('id', user.id)
      .update({
        full_name: `${user.first_name} ${user.last_name}`
      });
  }
  
  // Finally, drop old columns if needed
  await knex.schema.table('users', (table) => {
    table.dropColumn('first_name');
    table.dropColumn('last_name');
  });
};
```

### 5. Environment-Specific Migrations

Use environment checks when needed:

```javascript
exports.up = async function(knex) {
  await knex.schema.createTable('example', (table) => {
    table.increments('id');
    table.string('name');
    
    // Only add this index in production
    if (process.env.NODE_ENV === 'production') {
      table.index('name');
    }
  });
};
```

## Troubleshooting

### Migration Stuck/Failed

If a migration fails partway through:

```bash
# Check current migration status
npm run db:status

# Manually rollback if needed
npm run db:rollback

# Fix the migration file and try again
npm run db:migrate
```

### Database Connection Issues

Verify your `.env` configuration:

```bash
# Test database connection
node -e "
  require('dotenv').config();
  const db = require('./src/config/db');
  db.raw('SELECT 1').then(() => {
    console.log('✅ Database connected');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
"
```

### Foreign Key Constraints

When dropping tables with foreign keys, drop in the correct order:

```javascript
exports.down = async function(knex) {
  // Drop child tables first
  await knex.schema.dropTableIfExists('upload_rows');
  await knex.schema.dropTableIfExists('uploads');
  // Drop parent tables last
  await knex.schema.dropTableIfExists('users');
};
```

## Production Deployment

### 1. Backup Before Migration

```bash
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Run Migration

```bash
NODE_ENV=production npm run db:migrate
```

### 3. Verify Migration

```bash
NODE_ENV=production npm run db:status
```

## Default Users

After running seeds, these test users are available:

| Email | Password | Role |
|-------|----------|------|
| admin@dhl-shipping.com | admin123 | Admin |
| gcs@dhl-shipping.com | gcs123 | GCS |
| logistics@dhl-shipping.com | logistics123 | Logistics |

**⚠️ Change these passwords before production deployment!**
