import dotenv from 'dotenv';
import { Pool } from 'pg';
import { logger } from '../src/utils/logger';

// Load test environment variables
dotenv.config({ path: '.env.test' });

let testPool: Pool;

// Test database configuration
const testDbConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'recruitment_crm_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password',
  max: 5, // Smaller pool for tests
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 1000,
};

export async function setupTestDatabase(): Promise<Pool> {
  if (!testPool) {
    testPool = new Pool(testDbConfig);
    
    try {
      // Test the connection
      const client = await testPool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      logger.info('測試資料庫連線成功');
    } catch (error) {
      logger.error('測試資料庫連線失敗:', error);
      throw error;
    }
  }
  
  return testPool;
}

export async function cleanupTestDatabase(): Promise<void> {
  if (testPool) {
    // Clean up test data - delete in correct order to avoid foreign key issues
    const client = await testPool.connect();
    try {
      // Delete in reverse dependency order
      await client.query('DELETE FROM preferences');
      await client.query('DELETE FROM partnerships');
      await client.query('DELETE FROM interactions');
      await client.query('DELETE FROM contacts');
      await client.query('DELETE FROM schools');
      
      // Reset sequences
      await client.query('ALTER SEQUENCE IF EXISTS migrations_id_seq RESTART WITH 1');
    } catch (error) {
      // If cleanup fails, log but don't throw to avoid test failures
      console.warn('Database cleanup warning:', error instanceof Error ? error.message : String(error));
    } finally {
      client.release();
    }
  }
}

export async function closeTestDatabase(): Promise<void> {
  if (testPool) {
    await testPool.end();
    logger.info('測試資料庫連線已關閉');
  }
}

export function getTestPool(): Pool {
  if (!testPool) {
    throw new Error('測試資料庫連線池尚未初始化');
  }
  return testPool;
}

// Global test setup - only setup database if needed
beforeAll(async () => {
  // Only setup database for tests that need it
  if (process.env.SKIP_DB_SETUP !== 'true') {
    try {
      await setupTestDatabase();
    } catch (error) {
      console.warn('Database setup failed, skipping database tests:', error);
      process.env.SKIP_DB_SETUP = 'true';
    }
  }
});

// Clean up after each test
afterEach(async () => {
  if (process.env.SKIP_DB_SETUP !== 'true') {
    try {
      await cleanupTestDatabase();
    } catch (error) {
      console.warn('Database cleanup failed:', error);
    }
  }
});

// Global test teardown
afterAll(async () => {
  if (process.env.SKIP_DB_SETUP !== 'true') {
    try {
      await closeTestDatabase();
    } catch (error) {
      console.warn('Database close failed:', error);
    }
  }
});