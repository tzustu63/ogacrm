import { Request, Response } from 'express';
import { BackupService, BackupOptions } from '../services/backupService';
import { BackupScheduler, ScheduleConfig } from '../services/backupScheduler';
import { RecoveryService, RecoveryOptions } from '../services/recoveryService';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

export class BackupController {
  private backupService: BackupService;
  private backupScheduler: BackupScheduler;
  private recoveryService: RecoveryService;

  constructor(
    backupService: BackupService, 
    backupScheduler: BackupScheduler,
    recoveryService: RecoveryService
  ) {
    this.backupService = backupService;
    this.backupScheduler = backupScheduler;
    this.recoveryService = recoveryService;
  }

  /**
   * 創建手動備份
   */
  createBackup = async (req: Request, res: Response): Promise<void> => {
    try {
      const options: BackupOptions = {
        includeData: req.body.includeData !== false,
        includeTables: req.body.includeTables,
        excludeTables: req.body.excludeTables,
        compress: req.body.compress || false
      };

      const metadata = await this.backupService.createBackup(options);

      const response: ApiResponse = {
        success: true,
        data: metadata
      };

      res.status(201).json(response);
      logger.info(`手動備份創建成功: ${metadata.filename}`);

    } catch (error) {
      logger.error('創建備份失敗:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'BACKUP_CREATION_FAILED',
          message: '創建備份失敗',
          details: error instanceof Error ? error.message : '未知錯誤',
          timestamp: new Date()
        }
      };

      res.status(500).json(response);
    }
  };

  /**
   * 獲取備份列表
   */
  listBackups = async (req: Request, res: Response): Promise<void> => {
    try {
      const backups = await this.backupService.listBackups();

      const response: ApiResponse = {
        success: true,
        data: backups
      };

      res.json(response);

    } catch (error) {
      logger.error('獲取備份列表失敗:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'BACKUP_LIST_FAILED',
          message: '獲取備份列表失敗',
          details: error instanceof Error ? error.message : '未知錯誤',
          timestamp: new Date()
        }
      };

      res.status(500).json(response);
    }
  };

  /**
   * 刪除備份
   */
  deleteBackup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { backupId } = req.params;

      if (!backupId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_BACKUP_ID',
            message: '備份 ID 不能為空',
            timestamp: new Date()
          }
        };
        res.status(400).json(response);
        return;
      }

      await this.backupService.deleteBackup(backupId);

      const response: ApiResponse = {
        success: true,
        data: { message: '備份已成功刪除' }
      };

      res.json(response);
      logger.info(`備份已刪除: ${backupId}`);

    } catch (error) {
      logger.error('刪除備份失敗:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'BACKUP_DELETION_FAILED',
          message: '刪除備份失敗',
          details: error instanceof Error ? error.message : '未知錯誤',
          timestamp: new Date()
        }
      };

      res.status(500).json(response);
    }
  };

  /**
   * 驗證備份
   */
  verifyBackup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { backupId } = req.params;

      if (!backupId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_BACKUP_ID',
            message: '備份 ID 不能為空',
            timestamp: new Date()
          }
        };
        res.status(400).json(response);
        return;
      }

      const backups = await this.backupService.listBackups();
      const backup = backups.find(b => b.id === backupId);

      if (!backup) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'BACKUP_NOT_FOUND',
            message: '備份不存在',
            timestamp: new Date()
          }
        };
        res.status(404).json(response);
        return;
      }

      const backupPath = `./backups/${backup.filename}`;
      const isValid = await this.backupService.verifyBackup(backupPath, backup);

      const response: ApiResponse = {
        success: true,
        data: {
          backupId,
          isValid,
          verifiedAt: new Date()
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('驗證備份失敗:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'BACKUP_VERIFICATION_FAILED',
          message: '驗證備份失敗',
          details: error instanceof Error ? error.message : '未知錯誤',
          timestamp: new Date()
        }
      };

      res.status(500).json(response);
    }
  };

  /**
   * 獲取排程狀態
   */
  getScheduleStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = this.backupScheduler.getStatus();

      const response: ApiResponse = {
        success: true,
        data: status
      };

      res.json(response);

    } catch (error) {
      logger.error('獲取排程狀態失敗:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SCHEDULE_STATUS_FAILED',
          message: '獲取排程狀態失敗',
          details: error instanceof Error ? error.message : '未知錯誤',
          timestamp: new Date()
        }
      };

      res.status(500).json(response);
    }
  };

  /**
   * 更新排程配置
   */
  updateScheduleConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const config: Partial<ScheduleConfig> = req.body;

      this.backupScheduler.updateConfig(config);

      const response: ApiResponse = {
        success: true,
        data: { message: '排程配置已更新' }
      };

      res.json(response);
      logger.info('備份排程配置已更新');

    } catch (error) {
      logger.error('更新排程配置失敗:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SCHEDULE_CONFIG_UPDATE_FAILED',
          message: '更新排程配置失敗',
          details: error instanceof Error ? error.message : '未知錯誤',
          timestamp: new Date()
        }
      };

      res.status(500).json(response);
    }
  };

  /**
   * 清理舊備份
   */
  cleanupOldBackups = async (req: Request, res: Response): Promise<void> => {
    try {
      const retentionDays = parseInt(req.query.retentionDays as string) || 30;

      await this.backupService.cleanupOldBackups(retentionDays);

      const response: ApiResponse = {
        success: true,
        data: { message: `已清理超過 ${retentionDays} 天的舊備份` }
      };

      res.json(response);
      logger.info(`手動清理舊備份完成，保留天數: ${retentionDays}`);

    } catch (error) {
      logger.error('清理舊備份失敗:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'BACKUP_CLEANUP_FAILED',
          message: '清理舊備份失敗',
          details: error instanceof Error ? error.message : '未知錯誤',
          timestamp: new Date()
        }
      };

      res.status(500).json(response);
    }
  };

  // Recovery Methods

  /**
   * 從備份復原資料庫
   */
  restoreFromBackup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { backupId } = req.params;
      const options: RecoveryOptions = {
        dropExisting: req.body.dropExisting || false,
        selectiveTables: req.body.selectiveTables,
        excludeTables: req.body.excludeTables,
        validateBeforeRestore: req.body.validateBeforeRestore !== false,
        createBackupBeforeRestore: req.body.createBackupBeforeRestore || false
      };

      if (!backupId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_BACKUP_ID',
            message: '備份 ID 不能為空',
            timestamp: new Date()
          }
        };
        res.status(400).json(response);
        return;
      }

      const result = await this.recoveryService.restoreFromBackup(backupId, options);

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.json(response);
      logger.info(`資料庫復原成功，備份 ID: ${backupId}`);

    } catch (error) {
      logger.error('資料庫復原失敗:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'RESTORE_FAILED',
          message: '資料庫復原失敗',
          details: error instanceof Error ? error.message : '未知錯誤',
          timestamp: new Date()
        }
      };

      res.status(500).json(response);
    }
  };

  /**
   * 選擇性復原特定表格
   */
  restoreSelectiveTables = async (req: Request, res: Response): Promise<void> => {
    try {
      const { backupId } = req.params;
      const { tables, ...options } = req.body;

      if (!backupId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_BACKUP_ID',
            message: '備份 ID 不能為空',
            timestamp: new Date()
          }
        };
        res.status(400).json(response);
        return;
      }

      if (!tables || !Array.isArray(tables) || tables.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_TABLES',
            message: '必須指定要復原的表格',
            timestamp: new Date()
          }
        };
        res.status(400).json(response);
        return;
      }

      const result = await this.recoveryService.restoreSelectiveTables(
        backupId, 
        tables, 
        options
      );

      const response: ApiResponse = {
        success: true,
        data: result
      };

      res.json(response);
      logger.info(`選擇性復原成功，備份 ID: ${backupId}, 表格: ${tables.join(', ')}`);

    } catch (error) {
      logger.error('選擇性復原失敗:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SELECTIVE_RESTORE_FAILED',
          message: '選擇性復原失敗',
          details: error instanceof Error ? error.message : '未知錯誤',
          timestamp: new Date()
        }
      };

      res.status(500).json(response);
    }
  };

  /**
   * 獲取可復原的備份列表
   */
  getRestorableBackups = async (req: Request, res: Response): Promise<void> => {
    try {
      const backups = await this.recoveryService.getRestorableBackups();

      const response: ApiResponse = {
        success: true,
        data: backups
      };

      res.json(response);

    } catch (error) {
      logger.error('獲取可復原備份列表失敗:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'RESTORABLE_BACKUPS_FAILED',
          message: '獲取可復原備份列表失敗',
          details: error instanceof Error ? error.message : '未知錯誤',
          timestamp: new Date()
        }
      };

      res.status(500).json(response);
    }
  };

  /**
   * 預覽復原操作
   */
  previewRestore = async (req: Request, res: Response): Promise<void> => {
    try {
      const { backupId } = req.params;

      if (!backupId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_BACKUP_ID',
            message: '備份 ID 不能為空',
            timestamp: new Date()
          }
        };
        res.status(400).json(response);
        return;
      }

      const preview = await this.recoveryService.previewRestore(backupId);

      const response: ApiResponse = {
        success: true,
        data: preview
      };

      res.json(response);

    } catch (error) {
      logger.error('預覽復原操作失敗:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'RESTORE_PREVIEW_FAILED',
          message: '預覽復原操作失敗',
          details: error instanceof Error ? error.message : '未知錯誤',
          timestamp: new Date()
        }
      };

      res.status(500).json(response);
    }
  };

  /**
   * 測試復原操作
   */
  testRestore = async (req: Request, res: Response): Promise<void> => {
    try {
      const { backupId } = req.params;

      if (!backupId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_BACKUP_ID',
            message: '備份 ID 不能為空',
            timestamp: new Date()
          }
        };
        res.status(400).json(response);
        return;
      }

      const testResult = await this.recoveryService.testRestore(backupId);

      const response: ApiResponse = {
        success: true,
        data: testResult
      };

      res.json(response);

    } catch (error) {
      logger.error('測試復原操作失敗:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'RESTORE_TEST_FAILED',
          message: '測試復原操作失敗',
          details: error instanceof Error ? error.message : '未知錯誤',
          timestamp: new Date()
        }
      };

      res.status(500).json(response);
    }
  };
}