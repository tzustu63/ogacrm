/**
 * **Feature: recruitment-crm, Property 13: 資料備份復原**
 * **Validates: Requirements 7.4**
 * 
 * 對於任何資料異常情況，系統應該提供有效的資料備份和復原機制
 */

import * as fc from 'fast-check';
import { Pool } from 'pg';
import { promises as fs } from 'fs';
import { join } from 'path';
import { BackupService } from '../../src/services/backupService';
import { RecoveryService } from '../../src/services/recoveryService';
import { connectDatabase, closeDatabase, getPool } from '../../src/config/database';

describe('Backup and Recovery Property Tests', () => {
  let pool: Pool;
  let backupService: BackupService;
  let recoveryService: RecoveryService;
  let testBackupDir: string;
  let dbAvailable = false;

  beforeAll(async () => {
    // 檢查資料庫是否可用
    try {
      process.env.DB_NAME = 'recruitment_crm_test';
      await connectDatabase();
      pool = getPool();
      dbAvailable = true;
      
      // 創建測試備份目錄
      testBackupDir = './test-backups';
      await fs.mkdir(testBackupDir, { recursive: true });
      
      backupService = new BackupService(testBackupDir);
      recoveryService = new RecoveryService(backupService, testBackupDir);
      
      await backupService.initialize();
    } catch (error) {
      console.warn('Database not available, skipping backup/recovery tests');
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      // 清理測試備份目錄
      try {
        await fs.rmdir(testBackupDir, { recursive: true });
      } catch (error) {
        // 忽略清理錯誤
      }
      
      await closeDatabase();
    }
  });

  beforeEach(async () => {
    if (dbAvailable) {
      // 確保測試表格存在
      await createTestTables();
    }
  });

  afterEach(async () => {
    if (dbAvailable) {
      // 清理測試資料
      await cleanupTestData();
    }
  });

  /**
   * 屬性 13.1: 備份完整性
   * 對於任何有效的資料庫狀態，創建的備份應該包含所有必要的資訊並通過驗證
   */
  test('Property 13.1: Backup integrity - any valid database state should create verifiable backup', async () => {
    if (!dbAvailable) {
      console.log('Skipping test: Database not available');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        // 生成測試資料
        fc.array(
          fc.record({
            tableName: fc.constantFrom('test_schools', 'test_contacts', 'test_interactions'),
            recordCount: fc.integer({ min: 0, max: 10 })
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (testData) => {
          // 插入測試資料
          for (const data of testData) {
            await insertTestData(data.tableName, data.recordCount);
          }

          // 創建備份
          const backup = await backupService.createBackup({
            includeData: true
          });

          // 驗證備份
          expect(backup).toBeDefined();
          expect(backup.id).toBeTruthy();
          expect(backup.filename).toBeTruthy();
          expect(backup.size).toBeGreaterThan(0);
          expect(backup.checksum).toBeTruthy();
          expect(backup.isVerified).toBe(true);

          // 驗證備份檔案存在
          const backupPath = join(testBackupDir, backup.filename);
          await expect(fs.access(backupPath)).resolves.not.toThrow();

          // 驗證備份內容
          const isValid = await backupService.verifyBackup(backupPath, backup);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * 屬性 13.2: 復原一致性
   * 對於任何有效的備份，復原操作應該重建相同的資料庫狀態
   */
  test('Property 13.2: Recovery consistency - any valid backup should restore identical database state', async () => {
    if (!dbAvailable) {
      console.log('Skipping test: Database not available');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        // 生成初始資料
        fc.array(
          fc.record({
            tableName: fc.constantFrom('test_schools', 'test_contacts'),
            records: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }),
                value: fc.string({ minLength: 1, maxLength: 100 })
              }),
              { minLength: 1, maxLength: 5 }
            )
          }),
          { minLength: 1, maxLength: 2 }
        ),
        async (initialData) => {
          // 插入初始資料
          const originalCounts: Record<string, number> = {};
          for (const tableData of initialData) {
            await insertSpecificTestData(tableData.tableName, tableData.records);
            originalCounts[tableData.tableName] = tableData.records.length;
          }

          // 創建備份
          const backup = await backupService.createBackup({
            includeData: true
          });

          // 修改資料庫（模擬資料異常）
          await modifyTestData();

          // 復原資料庫
          const recoveryResult = await recoveryService.restoreFromBackup(backup.id, {
            dropExisting: true,
            validateBeforeRestore: true
          });

          // 驗證復原結果
          expect(recoveryResult.success).toBe(true);
          expect(recoveryResult.restoredTables.length).toBeGreaterThan(0);

          // 驗證資料一致性
          for (const tableData of initialData) {
            const count = await getTableRecordCount(tableData.tableName);
            expect(count).toBe(originalCounts[tableData.tableName]);
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * 屬性 13.3: 選擇性復原正確性
   * 對於任何表格子集的選擇性復原，只有指定的表格應該被復原
   */
  test('Property 13.3: Selective recovery correctness - only specified tables should be restored', async () => {
    if (!dbAvailable) {
      console.log('Skipping test: Database not available');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        // 生成表格選擇
        fc.subarray(['test_schools', 'test_contacts', 'test_interactions'], {
          minLength: 1,
          maxLength: 2
        }),
        fc.integer({ min: 1, max: 5 }), // 每個表格的記錄數
        async (selectedTables, recordCount) => {
          // 為所有表格插入資料
          const allTables = ['test_schools', 'test_contacts', 'test_interactions'];
          for (const table of allTables) {
            await insertTestData(table, recordCount);
          }

          // 創建備份
          const backup = await backupService.createBackup({
            includeData: true
          });

          // 清空所有表格
          for (const table of allTables) {
            await pool.query(`DELETE FROM ${table}`);
          }

          // 選擇性復原
          const recoveryResult = await recoveryService.restoreSelectiveTables(
            backup.id,
            selectedTables,
            {
              validateBeforeRestore: true
            }
          );

          // 驗證復原結果
          expect(recoveryResult.success).toBe(true);

          // 驗證只有選定的表格有資料
          for (const table of allTables) {
            const count = await getTableRecordCount(table);
            if (selectedTables.includes(table)) {
              expect(count).toBeGreaterThan(0);
            } else {
              expect(count).toBe(0);
            }
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * 屬性 13.4: 備份驗證可靠性
   * 對於任何損壞的備份檔案，驗證機制應該正確識別問題
   */
  test('Property 13.4: Backup validation reliability - corrupted backups should be detected', async () => {
    if (!dbAvailable) {
      console.log('Skipping test: Database not available');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // 記錄數
        async (recordCount) => {
          // 插入測試資料
          await insertTestData('test_schools', recordCount);

          // 創建備份
          const backup = await backupService.createBackup({
            includeData: true
          });

          // 驗證原始備份是有效的
          const backupPath = join(testBackupDir, backup.filename);
          const isValidOriginal = await backupService.verifyBackup(backupPath, backup);
          expect(isValidOriginal).toBe(true);

          // 損壞備份檔案（修改檔案內容）
          const originalContent = await fs.readFile(backupPath, 'utf-8');
          const corruptedContent = originalContent.replace(/CREATE TABLE/g, 'CREATE TABL');
          await fs.writeFile(backupPath, corruptedContent);

          // 驗證損壞的備份應該被檢測出來
          const isValidCorrupted = await backupService.verifyBackup(backupPath, backup);
          expect(isValidCorrupted).toBe(false);

          // 恢復原始內容以避免影響其他測試
          await fs.writeFile(backupPath, originalContent);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * 屬性 13.5: 備份元數據一致性
   * 對於任何備份操作，元數據應該準確反映備份的實際內容
   */
  test('Property 13.5: Backup metadata consistency - metadata should accurately reflect backup content', async () => {
    if (!dbAvailable) {
      console.log('Skipping test: Database not available');
      return;
    }
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          includeData: fc.boolean(),
          tables: fc.subarray(['test_schools', 'test_contacts'], { minLength: 1 })
        }),
        async (options) => {
          // 插入測試資料
          for (const table of options.tables) {
            await insertTestData(table, 3);
          }

          // 創建備份
          const backup = await backupService.createBackup({
            includeData: options.includeData,
            includeTables: options.tables
          });

          // 驗證元數據
          expect(backup.tables).toEqual(expect.arrayContaining(options.tables));
          expect(backup.size).toBeGreaterThan(0);
          expect(backup.checksum).toBeTruthy();
          expect(backup.createdAt).toBeInstanceOf(Date);

          // 驗證檔案實際存在且大小匹配
          const backupPath = join(testBackupDir, backup.filename);
          const stats = await fs.stat(backupPath);
          expect(stats.size).toBe(backup.size);
        }
      ),
      { numRuns: 15 }
    );
  });

  // 輔助函數

  async function createTestTables(): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_schools (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        country VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_contacts (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_interactions (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async function insertTestData(tableName: string, count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      switch (tableName) {
        case 'test_schools':
          await pool.query(
            'INSERT INTO test_schools (name, country) VALUES ($1, $2)',
            [`Test School ${i}`, `Country ${i % 3}`]
          );
          break;
        case 'test_contacts':
          await pool.query(
            'INSERT INTO test_contacts (school_id, name, email) VALUES ($1, $2, $3)',
            [1, `Contact ${i}`, `contact${i}@test.com`]
          );
          break;
        case 'test_interactions':
          await pool.query(
            'INSERT INTO test_interactions (school_id, notes) VALUES ($1, $2)',
            [1, `Interaction note ${i}`]
          );
          break;
      }
    }
  }

  async function insertSpecificTestData(
    tableName: string, 
    records: Array<{ name: string; value: string }>
  ): Promise<void> {
    for (const record of records) {
      switch (tableName) {
        case 'test_schools':
          await pool.query(
            'INSERT INTO test_schools (name, country) VALUES ($1, $2)',
            [record.name, record.value]
          );
          break;
        case 'test_contacts':
          await pool.query(
            'INSERT INTO test_contacts (school_id, name, email) VALUES ($1, $2, $3)',
            [1, record.name, record.value]
          );
          break;
      }
    }
  }

  async function modifyTestData(): Promise<void> {
    // 修改現有資料以模擬資料異常
    await pool.query('UPDATE test_schools SET name = name || \'_modified\'');
    await pool.query('DELETE FROM test_contacts WHERE id % 2 = 0');
  }

  async function getTableRecordCount(tableName: string): Promise<number> {
    const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  }

  async function cleanupTestData(): Promise<void> {
    const tables = ['test_schools', 'test_contacts', 'test_interactions'];
    for (const table of tables) {
      try {
        await pool.query(`DELETE FROM ${table}`);
      } catch (error) {
        // 忽略清理錯誤
      }
    }

    // 清理測試備份檔案
    try {
      const backups = await backupService.listBackups();
      for (const backup of backups) {
        await backupService.deleteBackup(backup.id);
      }
    } catch (error) {
      // 忽略清理錯誤
    }
  }
});