import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool;

const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'recruitment_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
};

export async function connectDatabase(): Promise<void> {
  try {
    pool = new Pool(dbConfig);
    
    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    logger.info('資料庫連線成功');
  } catch (error) {
    logger.error('資料庫連線失敗:', error);
    throw error;
  }
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('資料庫連線池尚未初始化');
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    logger.info('資料庫連線已關閉');
  }
}