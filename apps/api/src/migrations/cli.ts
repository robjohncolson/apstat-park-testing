#!/usr/bin/env ts-node
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import MigrationRunner from './migrationRunner';
import { appLogger } from '../logger';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const migrationRunner = new MigrationRunner(pool);

/**
 * Generate a timestamp for migration files
 */
function generateTimestamp(): string {
  const now = new Date();
  return now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');
}

/**
 * Create a new migration file
 */
async function createMigration(name: string): Promise<void> {
  if (!name) {
    console.error('❌ Migration name is required');
    console.log('Usage: npm run migrate:create <migration_name>');
    process.exit(1);
  }

  // Clean the name - remove spaces and special characters
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const timestamp = generateTimestamp();
  const fileName = `${timestamp}_${cleanName}.ts`;
  const filePath = path.join(__dirname, fileName);

  const template = `// Migration: ${cleanName}
// Created: ${new Date().toISOString()}

export const up = \`
  -- Add your migration SQL here
  -- Example:
  -- CREATE TABLE example_table (
  --   id SERIAL PRIMARY KEY,
  --   name VARCHAR(255) NOT NULL,
  --   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- );
\`;

export const down = \`
  -- Add your rollback SQL here
  -- Example:
  -- DROP TABLE IF EXISTS example_table;
\`;
`;

  try {
    fs.writeFileSync(filePath, template);
    console.log(`✅ Created migration: ${fileName}`);
    console.log(`📝 Edit the file to add your SQL: ${filePath}`);
  } catch (error) {
    console.error('❌ Failed to create migration file:', error);
    process.exit(1);
  }
}

/**
 * Run pending migrations
 */
async function runMigrations(): Promise<void> {
  try {
    console.log('🚀 Running database migrations...');
    await migrationRunner.runMigrations();
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Rollback the last migration
 */
async function rollbackMigration(): Promise<void> {
  try {
    console.log('⏪ Rolling back last migration...');
    await migrationRunner.rollbackLastMigration();
    console.log('✅ Rollback completed successfully');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

/**
 * Show migration status
 */
async function showStatus(): Promise<void> {
  try {
    console.log('📊 Migration Status\n');
    const status = await migrationRunner.getMigrationStatus();
    
    if (status.applied.length > 0) {
      console.log('✅ Applied Migrations:');
      status.applied.forEach(migration => {
        console.log(`  • ${migration.id}_${migration.name} (${migration.appliedAt?.toISOString()})`);
      });
      console.log('');
    }
    
    if (status.pending.length > 0) {
      console.log('⏳ Pending Migrations:');
      status.pending.forEach(migration => {
        console.log(`  • ${migration.id}_${migration.name}`);
      });
      console.log('');
    }
    
    if (status.applied.length === 0 && status.pending.length === 0) {
      console.log('📝 No migrations found. Create your first migration with:');
      console.log('  npm run migrate:create <migration_name>');
    }
    
    console.log(`📈 Database Schema Version: ${status.applied.length} migrations applied`);
    
  } catch (error) {
    console.error('❌ Failed to get migration status:', error);
    process.exit(1);
  }
}

/**
 * Reset database (drop all tables and rerun migrations)
 */
async function resetDatabase(): Promise<void> {
  console.log('⚠️  WARNING: This will drop all tables and data!');
  console.log('⚠️  This action cannot be undone!');
  
  // In a real CLI, you'd want to add a confirmation prompt here
  console.log('🗑️  Dropping all tables...');
  
  try {
    const client = await pool.connect();
    
    // Drop all tables (be very careful with this!)
    await client.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `);
    
    client.release();
    console.log('✅ Database reset completed');
    
    // Re-run all migrations
    await runMigrations();
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  }
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'create':
      await createMigration(arg);
      break;
    
    case 'up':
    case 'run':
      await runMigrations();
      break;
    
    case 'down':
    case 'rollback':
      await rollbackMigration();
      break;
    
    case 'status':
      await showStatus();
      break;
    
    case 'reset':
      await resetDatabase();
      break;
    
    default:
      console.log('🛠️  APStat Park Migration CLI\n');
      console.log('Available commands:');
      console.log('  create <name>  - Create a new migration');
      console.log('  run           - Run pending migrations');
      console.log('  rollback      - Rollback the last migration');
      console.log('  status        - Show migration status');
      console.log('  reset         - Reset database (dangerous!)');
      console.log('\nExamples:');
      console.log('  npm run migrate:create create_users_table');
      console.log('  npm run migrate:run');
      console.log('  npm run migrate:status');
      break;
  }
  
  await pool.end();
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
  process.exit(1);
});

// Run the CLI
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ CLI Error:', error);
    process.exit(1);
  });
} 