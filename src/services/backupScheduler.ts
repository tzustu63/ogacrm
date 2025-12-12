import { BackupService, BackupOptions } from './backupService';
import { logger } from '../utils/logger';

export interface ScheduleConfig {
  enabled: boolean;
  interval: number; // 間隔時間（毫秒）
  retentionDays: number; // 保留天數
  backupOptions: BackupOptions;
}

export class BackupScheduler {
  private backupService: BackupService;
  private config: ScheduleConfig;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(backupService: BackupService, config: ScheduleConfig) {
    this.backupService = backupService;
    this.config = config;
  }

  /**
   * 啟動自動備份排程
   */
  start(): void {
    if (!this.config.enabled) {
      logger.info('自動備份已停用');
      return;
    }

    if (this.intervalId) {
      logger.warn('自動備份排程已在運行中');
      return;
    }

    logger.info(`啟動自動備份排程，間隔: ${this.config.interval}ms`);
    
    this.intervalId = setInterval(async () => {
      try {
        await this.performScheduledBackup();
      } catch (error) {
        logger.error('排程備份執行失敗:', error);
      }
    }, this.config.interval);

    // 立即執行一次備份
    this.performScheduledBackup().catch(error => {
      logger.error('初始備份執行失敗:', error);
    });
  }

  /**
   * 停止自動備份排程
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('自動備份排程已停止');
    }
  }

  /**
   * 更新排程配置
   */
  updateConfig(config: Partial<ScheduleConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }

  /**
   * 執行排程備份
   */
  private async performScheduledBackup(): Promise<void> {
    try {
      logger.info('開始執行排程備份');

      // 創建備份
      const metadata = await this.backupService.createBackup(this.config.backupOptions);
      logger.info(`排程備份完成: ${metadata.filename}`);

      // 清理舊備份
      await this.backupService.cleanupOldBackups(this.config.retentionDays);

    } catch (error) {
      logger.error('排程備份失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取排程狀態
   */
  getStatus(): { isRunning: boolean; config: ScheduleConfig } {
    return {
      isRunning: this.intervalId !== null,
      config: this.config
    };
  }
}

// 預設配置
export const defaultScheduleConfig: ScheduleConfig = {
  enabled: process.env.NODE_ENV === 'production',
  interval: 24 * 60 * 60 * 1000, // 每天一次
  retentionDays: 30, // 保留30天
  backupOptions: {
    includeData: true,
    compress: false
  }
};