import { Pool } from 'pg';
import { connectDatabase, getPool } from '../src/config/database';
import { logger } from '../src/utils/logger';
import fs from 'fs';
import path from 'path';

async function createAuthTables() {
  try {
    await connectDatabase();
    const pool = getPool();
    
    // Read the auth schema SQL file
    const schemaPath = path.join(__dirname, '..', 'database', 'auth-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await pool.query(schemaSql);
    
    logger.info('認證系統資料表建立成功');
    
    // Create default admin user if it doesn't exist
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    
    const checkAdminQuery = 'SELECT id FROM users WHERE email = $1';
    const adminExists = await pool.query(checkAdminQuery, [adminEmail]);
    
    if (adminExists.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      
      const createAdminQuery = `
        INSERT INTO users (email, password_hash, name, role)
        VALUES ($1, $2, $3, $4)
      `;
      
      await pool.query(createAdminQuery, [
        adminEmail,
        passwordHash,
        'System Administrator',
        'admin'
      ]);
      
      logger.info(`預設管理員帳號已建立: ${adminEmail}`);
      logger.info(`預設密碼: ${adminPassword}`);
      logger.warn('請立即更改預設密碼！');
    } else {
      logger.info('管理員帳號已存在，跳過建立');
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('建立認證系統資料表失敗:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  createAuthTables();
}