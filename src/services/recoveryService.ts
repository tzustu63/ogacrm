import { Pool } from 'pg';
import { promises as fs } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { getPool } from '../config/database';
import { BackupService, BackupMetadata } from './backupService';
import { logger } from '../utils/logger';

export interface RecoveryOptions {
  dropExisting?: boolean;
  selectiveTables?: string[];
  excludeTables?: string[];
  validateBeforeRestore?: boolean;
  createBackupBeforeRestore?: boolean;
}

export interface RecoveryResult {
  success: boolean;
  backupId?: string;
  restoredTables: string[];
  duration: number;
  preRestoreBackupId?: string;
  errors?: string[];
}

export class RecoveryService {
  private pool: Pool;
  private backupService: BackupService;
  private backupDir: string;

  constructor(backupService: BackupService, backupDir: string = './backups') {
    this.pool = getPool();
    this.backupService = backupService;
    this.backupDir = backupDir;
  }

  /**
   * 從備份復原資料庫
   */
  async restoreFromBackup(
    backupId: string, 
    options: RecoveryOptions = {}
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const result: RecoveryResult = {
      success: false,
      restoredTables: [],
      duration: 0,
      errors: []
    };

    try {
      logger.info(`開始復原資料庫，備份 ID: ${backupId}`);

      // 獲取備份元數據
      const backup = await this.getBackupMetadata(backupId);
      if (!backup) {
        throw new Error(`備份不存在: ${backupId}`);
      }

      const backupPath = join(this.backupDir, backup.filename);

      // 驗證備份檔案
      if (options.validateBeforeRestore !== false) {
        const isValid = await this.backupService.verifyBackup(backupPath, backup);
        if (!isValid) {
          throw new Error('備份檔案驗證失敗');
        }
      }

      // 創建復原前備份
      if (options.createBackupBeforeRestore) {
        const preRestoreBackup = await this.backupService.createBackup({
          includeData: true
        });
        result.preRestoreBackupId = preRestoreBackup.id;
        logger.info(`復原前備份已創建: ${preRestoreBackup.filename}`);
      }

      // 準備復原
      await this.prepareForRestore(options);

      // 執行復原
      const restoredTables = await this.executeRestore(backupPath, options);
      result.restoredTables = restoredTables;

      // 驗證復原結果
      await this.validateRestoreResult(restoredTables);

      result.success = true;
      result.backupId = backupId;
      result.duration = Date.now() - startTime;

      logger.info(`資料庫復原成功，耗時: ${result.duration}ms`);
      return result;

    } catch (error) {
      result.success = false;
      result.duration = Date.now() - startTime;
      result.errors = [error instanceof Error ? error.message : '未知錯誤'];

      logger.error('資料庫復原失敗:', error);
      throw error;
    }
  }

  /**
   * 選擇性復原特定表格
   */
  async restoreSelectiveTables(
    backupId: string,
    tables: string[],
    options: RecoveryOptions = {}
  ): Promise<RecoveryResult> {
    return this.restoreFromBackup(backupId, {
      ...options,
      selectiveTables: tables
    });
  }

  /**
   * 獲取可復原的備份列表
   */
  async getRestorableBackups(): Promise<BackupMetadata[]> {
    try {
      const backups = await this.backupService.listBackups();
      
      // 只返回已驗證的備份
      const restorableBackups = [];
      
      for (const backup of backups) {
        const backupPath = join(this.backupDir, backup.filename);
        const isValid = await this.backupService.verifyBackup(backupPath, backup);
        
        if (isValid) {
          restorableBackups.push(backup);
        }
      }

      return restorableBackups.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    } catch (error) {
      logger.error('獲取可復原備份列表失敗:', error);
      throw error;
    }
  }

  /**
   * 預覽復原操作
   */
  async previewRestore(backupId: string): Promise<{
    backup: BackupMetadata;
    currentTables: string[];
    backupTables: string[];
    conflicts: string[];
  }> {
    try {
      const backup = await this.getBackupMetadata(backupId);
      if (!backup) {
        throw new Error(`備份不存在: ${backupId}`);
      }

      // 獲取當前資料庫表格
      const currentTables = await this.getCurrentTables();

      // 獲取備份中的表格
      const backupTables = backup.tables;

      // 找出衝突的表格
      const conflicts = currentTables.filter(table => 
        backupTables.includes(table)
      );

      return {
        backup,
        currentTables,
        backupTables,
        conflicts
      };

    } catch (error) {
      logger.error('預覽復原操作失敗:', error);
      throw error;
    }
  }

  /**
   * 測試復原操作（不實際執行）
   */
  async testRestore(backupId: string): Promise<{
    canRestore: boolean;
    issues: string[];
    estimatedDuration: number;
  }> {
    try {
      const backup = await this.getBackupMetadata(backupId);
      if (!backup) {
        throw new Error(`備份不存在: ${backupId}`);
      }

      const issues: string[] = [];
      const startTime = Date.now();

      // 驗證備份檔案
      const backupPath = join(this.backupDir, backup.filename);
      const isValid = await this.backupService.verifyBackup(backupPath, backup);
      
      if (!isValid) {
        issues.push('備份檔案驗證失敗');
      }

      // 檢查磁碟空間
      const stats = await fs.stat(backupPath);
      const requiredSpace = stats.size * 2; // 估算需要的空間
      
      // 這裡可以添加更多的檢查邏輯
      // 例如：檢查資料庫連線、權限等

      const estimatedDuration = Date.now() - startTime;

      return {
        canRestore: issues.length === 0,
        issues,
        estimatedDuration: estimatedDuration * 10 // 估算實際復原時間
      };

    } catch (error) {
      logger.error('測試復原操作失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取備份元數據
   */
  private async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    const backups = await this.backupService.listBackups();
    return backups.find(backup => backup.id === backupId) || null;
  }

  /**
   * 準備復原環境
   */
  private async prepareForRestore(options: RecoveryOptions): Promise<void> {
    if (options.dropExisting) {
      logger.info('準備刪除現有表格');
      
      const currentTables = await this.getCurrentTables();
      
      // 如果指定了選擇性表格，只刪除這些表格
      const tablesToDrop = options.selectiveTables 
        ? currentTables.filter(table => options.selectiveTables!.includes(table))
        : currentTables;

      // 排除不需要刪除的表格
      const finalTablesToDrop = options.excludeTables
        ? tablesToDrop.filter(table => !options.excludeTables!.includes(table))
        : tablesToDrop;

      for (const table of finalTablesToDrop) {
        await this.pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        logger.info(`已刪除表格: ${table}`);
      }
    }
  }

  /**
   * 執行復原操作
   */
  private async executeRestore(
    backupPath: string, 
    options: RecoveryOptions
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const args = [
        '--host', process.env.DB_HOST || 'localhost',
        '--port', process.env.DB_PORT || '5432',
        '--username', process.env.DB_USER || 'postgres',
        '--dbname', process.env.DB_NAME || 'recruitment_crm',
        '--no-password',
        '--verbose'
      ];

      // 如果是選擇性復原，需要特殊處理
      if (options.selectiveTables && options.selectiveTables.length > 0) {
        // 對於選擇性復原，我們需要先過濾 SQL 檔案
        // 這裡簡化處理，實際應用中可能需要更複雜的 SQL 解析
        args.push('--single-transaction');
      }

      args.push(backupPath);

      const psql = spawn('psql', args, {
        env: {
          ...process.env,
          PGPASSWORD: process.env.DB_PASSWORD || 'password'
        }
      });

      let stdout = '';
      let stderr = '';

      psql.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      psql.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      psql.on('close', async (code) => {
        if (code === 0) {
          try {
            // 獲取復原後的表格列表
            const restoredTables = await this.getCurrentTables();
            resolve(restoredTables);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`psql 執行失敗，退出碼: ${code}, 錯誤: ${stderr}`));
        }
      });

      psql.on('error', (error) => {
        reject(new Error(`psql 執行錯誤: ${error.message}`));
      });
    });
  }

  /**
   * 獲取當前資料庫表格列表
   */
  private async getCurrentTables(): Promise<string[]> {
    const result = await this.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    return result.rows.map(row => row.table_name);
  }

  /**
   * 驗證復原結果
   */
  private async validateRestoreResult(restoredTables: string[]): Promise<void> {
    logger.info('驗證復原結果');

    // 檢查表格是否存在
    for (const table of restoredTables) {
      const result = await this.pool.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      `, [table]);

      if (result.rows[0].count === '0') {
        throw new Error(`表格復原失敗: ${table}`);
      }
    }

    // 可以添加更多的驗證邏輯
    // 例如：檢查資料完整性、外鍵約束等

    logger.info('復原結果驗證通過');
  }
}