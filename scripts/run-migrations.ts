#!/usr/bin/env ts-node

import { Pool } from 'pg';
import { DatabaseMigration } from '../src/utils/migration';
import { logger } from '../src/utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigrations() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'recruitment_crm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    logger.info('開始執行資料庫遷移...');
    
    const migration = new DatabaseMigration(pool);
    await migration.runMigrations();
    
    logger.info('資料庫遷移成功完成');
  } catch (error) {
    logger.error('資料庫遷移失敗:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };