import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from './logger';

export class DatabaseMigration {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async runMigrations(): Promise<void> {
    try {
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();

      // Run schema migration
      await this.runSchemaMigration();

      logger.info('資料庫遷移完成');
    } catch (error) {
      logger.error('資料庫遷移失敗:', error);
      throw error;
    }
  }

  private async createMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await this.pool.query(query);
  }

  private async runSchemaMigration(): Promise<void> {
    const migrationName = 'initial_schema';
    
    // Check if migration already executed
    const existingMigration = await this.pool.query(
      'SELECT id FROM migrations WHERE name = $1',
      [migrationName]
    );

    if (existingMigration.rows.length > 0) {
      logger.info('初始架構遷移已存在，跳過');
      return;
    }

    // Check if schema already exists by checking for schools table
    const existingSchema = await this.pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schools'"
    );

    if (existingSchema.rows.length > 0) {
      logger.info('資料庫架構已存在，記錄遷移狀態');
      // Just record the migration without running the schema
      await this.pool.query(
        'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [migrationName]
      );
      return;
    }

    // Read and execute schema file
    const schemaPath = join(__dirname, '../../database/schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf8');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Execute schema
      await client.query(schemaSQL);
      
      // Record migration
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migrationName]
      );
      
      await client.query('COMMIT');
      logger.info('初始資料庫架構遷移完成');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async dropAllTables(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Drop all tables in correct order (reverse of creation)
      const dropQueries = [
        'DROP TABLE IF EXISTS preferences CASCADE',
        'DROP TABLE IF EXISTS partnerships CASCADE',
        'DROP TABLE IF EXISTS interactions CASCADE',
        'DROP TABLE IF EXISTS contacts CASCADE',
        'DROP TABLE IF EXISTS schools CASCADE',
        'DROP TABLE IF EXISTS migrations CASCADE',
        'DROP TYPE IF EXISTS mou_status CASCADE',
        'DROP TYPE IF EXISTS contact_method CASCADE',
        'DROP TYPE IF EXISTS relationship_status CASCADE',
        'DROP TYPE IF EXISTS school_type CASCADE'
      ];

      for (const query of dropQueries) {
        await client.query(query);
      }
      
      await client.query('COMMIT');
      logger.info('所有資料表已刪除');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}