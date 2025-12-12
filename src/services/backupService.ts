import { Pool } from 'pg';
import { promises as fs } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';

export interface BackupMetadata {
  id: string;
  filename: string;
  size: number;
  checksum: string;
  createdAt: Date;
  isVerified: boolean;
  tables: string[];
}

export interface BackupOptions {
  includeData?: boolean;
  includeTables?: string[];
  excludeTables?: string[];
  compress?: boolean;
}

export class BackupService {
  private backupDir: string;
  private pool: Pool;

  constructor(backupDir: string = './backups', pool?: Pool) {
    this.backupDir = backupDir;
    // 需要外部傳入已初始化的 pool；若未提供再嘗試從全域取得
    this.pool = pool ?? getPool();
  }

  /**
   * 初始化備份目錄
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      logger.info(`備份目錄已初始化: ${this.backupDir}`);
    } catch (error) {
      logger.error('初始化備份目錄失敗:', error);
      throw error;
    }
  }

  /**
   * 創建資料庫備份
   */
  async createBackup(options: BackupOptions = {}): Promise<BackupMetadata> {
    const backupId = this.generateBackupId();
    const filename = `backup_${backupId}.sql`;
    const filepath = join(this.backupDir, filename);

    try {
      logger.info(`開始創建備份: ${filename}`);

      // 獲取要備份的表格列表
      const tables = await this.getTablesList(options);
      
      // 執行 pg_dump
      await this.executePgDump(filepath, options, tables);

      // 計算檔案大小和校驗和
      const stats = await fs.stat(filepath);
      const checksum = await this.calculateChecksum(filepath);

      const metadata: BackupMetadata = {
        id: backupId,
        filename,
        size: stats.size,
        checksum,
        createdAt: new Date(),
        isVerified: false,
        tables
      };

      // 驗證備份
      metadata.isVerified = await this.verifyBackup(filepath, metadata);

      // 儲存備份元數據
      await this.saveBackupMetadata(metadata);

      logger.info(`備份創建成功: ${filename}, 大小: ${stats.size} bytes`);
      return metadata;

    } catch (error) {
      logger.error(`創建備份失敗: ${filename}`, error);
      // 清理失敗的備份檔案
      try {
        await fs.unlink(filepath);
      } catch (cleanupError) {
        logger.warn('清理失敗備份檔案時發生錯誤:', cleanupError);
      }
      throw error;
    }
  }

  /**
   * 獲取所有備份列表
   */
  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const metadataFile = join(this.backupDir, 'metadata.json');
      
      try {
        const content = await fs.readFile(metadataFile, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        // 如果元數據檔案不存在，返回空陣列
        return [];
      }
    } catch (error) {
      logger.error('讀取備份列表失敗:', error);
      throw error;
    }
  }

  /**
   * 刪除備份
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      const backups = await this.listBackups();
      const backup = backups.find(b => b.id === backupId);
      
      if (!backup) {
        throw new Error(`備份不存在: ${backupId}`);
      }

      const filepath = join(this.backupDir, backup.filename);
      
      // 刪除備份檔案
      await fs.unlink(filepath);
      
      // 更新元數據
      const updatedBackups = backups.filter(b => b.id !== backupId);
      await this.saveBackupsList(updatedBackups);

      logger.info(`備份已刪除: ${backup.filename}`);
    } catch (error) {
      logger.error(`刪除備份失敗: ${backupId}`, error);
      throw error;
    }
  }

  /**
   * 驗證備份檔案完整性
   */
  async verifyBackup(filepath: string, metadata: BackupMetadata): Promise<boolean> {
    try {
      // 檢查檔案是否存在
      await fs.access(filepath);

      // 驗證檔案大小
      const stats = await fs.stat(filepath);
      if (stats.size !== metadata.size) {
        logger.warn(`備份檔案大小不符: 預期 ${metadata.size}, 實際 ${stats.size}`);
        return false;
      }

      // 驗證校驗和
      const checksum = await this.calculateChecksum(filepath);
      if (checksum !== metadata.checksum) {
        logger.warn(`備份檔案校驗和不符: 預期 ${metadata.checksum}, 實際 ${checksum}`);
        return false;
      }

      // 驗證 SQL 檔案格式
      const isValidSql = await this.validateSqlFile(filepath);
      if (!isValidSql) {
        logger.warn('備份檔案 SQL 格式無效');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('驗證備份失敗:', error);
      return false;
    }
  }

  /**
   * 清理舊備份
   */
  async cleanupOldBackups(retentionDays: number = 30): Promise<void> {
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const backupsToDelete = backups.filter(backup => 
        new Date(backup.createdAt) < cutoffDate
      );

      for (const backup of backupsToDelete) {
        await this.deleteBackup(backup.id);
      }

      logger.info(`清理了 ${backupsToDelete.length} 個舊備份`);
    } catch (error) {
      logger.error('清理舊備份失敗:', error);
      throw error;
    }
  }

  /**
   * 生成備份 ID
   */
  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}_${random}`;
  }

  /**
   * 獲取要備份的表格列表
   */
  private async getTablesList(options: BackupOptions): Promise<string[]> {
    if (options.includeTables) {
      return options.includeTables;
    }

    // 獲取所有表格
    const result = await this.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

    let tables = result.rows.map(row => row.table_name);

    // 排除指定的表格
    if (options.excludeTables) {
      tables = tables.filter(table => !options.excludeTables!.includes(table));
    }

    return tables;
  }

  /**
   * 執行 pg_dump
   */
  private async executePgDump(
    filepath: string, 
    options: BackupOptions, 
    tables: string[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '--host', process.env.DB_HOST || 'localhost',
        '--port', process.env.DB_PORT || '5432',
        '--username', process.env.DB_USER || 'postgres',
        '--dbname', process.env.DB_NAME || 'recruitment_crm',
        '--no-password',
        '--verbose',
        '--clean',
        '--if-exists',
        '--file', filepath
      ];

      // 添加表格選項
      if (tables.length > 0) {
        tables.forEach(table => {
          args.push('--table', table);
        });
      }

      // 添加其他選項
      if (options.includeData === false) {
        args.push('--schema-only');
      }

      const pgDump = spawn('pg_dump', args, {
        env: {
          ...process.env,
          PGPASSWORD: process.env.DB_PASSWORD || 'password'
        }
      });

      let stderr = '';

      pgDump.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump 執行失敗，退出碼: ${code}, 錯誤: ${stderr}`));
        }
      });

      pgDump.on('error', (error) => {
        reject(new Error(`pg_dump 執行錯誤: ${error.message}`));
      });
    });
  }

  /**
   * 計算檔案校驗和
   */
  private async calculateChecksum(filepath: string): Promise<string> {
    const content = await fs.readFile(filepath);
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * 驗證 SQL 檔案格式
   */
  private async validateSqlFile(filepath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      
      // 基本的 SQL 檔案驗證
      const hasHeader = content.includes('-- PostgreSQL database dump');
      const hasFooter = content.includes('-- PostgreSQL database dump complete');
      
      return hasHeader && hasFooter && content.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 儲存備份元數據
   */
  private async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
    const backups = await this.listBackups();
    backups.push(metadata);
    await this.saveBackupsList(backups);
  }

  /**
   * 儲存備份列表
   */
  private async saveBackupsList(backups: BackupMetadata[]): Promise<void> {
    const metadataFile = join(this.backupDir, 'metadata.json');
    await fs.writeFile(metadataFile, JSON.stringify(backups, null, 2));
  }
}