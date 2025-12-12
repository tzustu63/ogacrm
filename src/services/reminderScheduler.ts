import { ReminderService } from './reminderService';
import { logger } from '../utils/logger';

export interface ReminderScheduleConfig {
  enabled: boolean;
  interval: number; // 間隔時間（毫秒）
  daysAhead: number; // 提前檢查天數
  notificationMethods: ('log' | 'email' | 'webhook')[]; // 通知方式
}

export class ReminderScheduler {
  private reminderService: ReminderService;
  private config: ReminderScheduleConfig;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(reminderService: ReminderService, config: ReminderScheduleConfig) {
    this.reminderService = reminderService;
    this.config = config;
  }

  /**
   * 啟動MOU到期提醒排程
   */
  start(): void {
    if (!this.config.enabled) {
      logger.info('MOU到期提醒排程已停用');
      return;
    }

    if (this.intervalId) {
      logger.warn('MOU到期提醒排程已在運行中');
      return;
    }

    logger.info(`啟動MOU到期提醒排程，間隔: ${this.config.interval}ms，提前檢查: ${this.config.daysAhead}天`);
    
    this.intervalId = setInterval(async () => {
      try {
        await this.performScheduledReminderCheck();
      } catch (error) {
        logger.error('排程提醒檢查執行失敗:', error);
      }
    }, this.config.interval);

    // 立即執行一次檢查
    this.performScheduledReminderCheck().catch(error => {
      logger.error('初始提醒檢查執行失敗:', error);
    });
  }

  /**
   * 停止MOU到期提醒排程
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('MOU到期提醒排程已停止');
    }
  }

  /**
   * 更新排程配置
   */
  updateConfig(config: Partial<ReminderScheduleConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }

  /**
   * 執行排程提醒檢查
   */
  private async performScheduledReminderCheck(): Promise<void> {
    try {
      logger.info('開始執行MOU到期提醒檢查');

      // 獲取統計資料
      const statistics = await this.reminderService.getReminderStatistics(this.config.daysAhead);
      
      if (statistics.total === 0) {
        logger.info('沒有即將到期的MOU');
        return;
      }

      logger.info(`發現 ${statistics.total} 個即將到期的MOU: 緊急 ${statistics.critical}，高 ${statistics.high}，中 ${statistics.medium}，低 ${statistics.low}`);

      // 處理提醒
      const processedCount = await this.reminderService.processExpiryReminders(this.config.daysAhead);
      logger.info(`已處理 ${processedCount} 個MOU到期提醒`);

      // 發送通知（根據配置的通知方式）
      await this.sendNotifications(statistics);

    } catch (error) {
      logger.error('排程提醒檢查失敗:', error);
      throw error;
    }
  }

  /**
   * 發送通知
   */
  private async sendNotifications(statistics: Record<string, number>): Promise<void> {
    for (const method of this.config.notificationMethods) {
      try {
        switch (method) {
          case 'log':
            await this.sendLogNotification(statistics);
            break;
          case 'email':
            await this.sendEmailNotification(statistics);
            break;
          case 'webhook':
            await this.sendWebhookNotification(statistics);
            break;
        }
      } catch (error) {
        logger.error(`發送 ${method} 通知失敗:`, error);
      }
    }
  }

  /**
   * 發送日誌通知
   */
  private async sendLogNotification(statistics: Record<string, number>): Promise<void> {
    const message = this.formatStatisticsMessage(statistics);
    logger.info(`MOU到期提醒摘要: ${message}`);
  }

  /**
   * 發送郵件通知（預留介面）
   */
  private async sendEmailNotification(statistics: Record<string, number>): Promise<void> {
    // 這裡可以整合郵件服務
    logger.info('郵件通知功能尚未實作');
  }

  /**
   * 發送Webhook通知（預留介面）
   */
  private async sendWebhookNotification(statistics: Record<string, number>): Promise<void> {
    // 這裡可以整合Webhook服務
    logger.info('Webhook通知功能尚未實作');
  }

  /**
   * 格式化統計訊息
   */
  private formatStatisticsMessage(statistics: Record<string, number>): string {
    const parts = [];
    
    if (statistics.critical && statistics.critical > 0) {
      parts.push(`緊急 ${statistics.critical} 個`);
    }
    if (statistics.high && statistics.high > 0) {
      parts.push(`高優先級 ${statistics.high} 個`);
    }
    if (statistics.medium && statistics.medium > 0) {
      parts.push(`中優先級 ${statistics.medium} 個`);
    }
    if (statistics.low && statistics.low > 0) {
      parts.push(`低優先級 ${statistics.low} 個`);
    }

    return parts.length > 0 ? parts.join('，') : '無即將到期的MOU';
  }

  /**
   * 手動觸發提醒檢查
   */
  async triggerManualCheck(): Promise<void> {
    logger.info('手動觸發MOU到期提醒檢查');
    await this.performScheduledReminderCheck();
  }

  /**
   * 獲取排程狀態
   */
  getStatus(): { isRunning: boolean; config: ReminderScheduleConfig; nextCheck?: Date } {
    const status = {
      isRunning: this.intervalId !== null,
      config: this.config
    };

    if (this.intervalId) {
      // 估算下次檢查時間（這是近似值）
      const nextCheck = new Date(Date.now() + this.config.interval);
      return { ...status, nextCheck };
    }

    return status;
  }
}

// 預設配置
export const defaultReminderScheduleConfig: ReminderScheduleConfig = {
  enabled: true,
  interval: 24 * 60 * 60 * 1000, // 每天檢查一次
  daysAhead: 30, // 提前30天檢查
  notificationMethods: ['log'] // 預設只記錄到日誌
};