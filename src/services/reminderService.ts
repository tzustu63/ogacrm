import { Pool } from 'pg';
import { PartnershipRepository } from '../repositories/partnershipRepository';
import { Partnership } from '../types';
import { logger } from '../utils/logger';

export interface ExpiryReminder {
  partnership: Partnership;
  daysUntilExpiry: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ReminderNotification {
  id: string;
  partnershipId: string;
  schoolId: string;
  reminderType: 'mou_expiry';
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  scheduledDate: Date;
  sentDate?: Date;
  isRead: boolean;
  createdAt: Date;
}

export class ReminderService {
  private partnershipRepository: PartnershipRepository;

  constructor(pool: Pool) {
    this.partnershipRepository = new PartnershipRepository(pool);
  }

  /**
   * 檢查即將到期的MOU並生成提醒
   * @param daysAhead 提前多少天檢查到期
   * @returns 到期提醒列表
   */
  async checkExpiringMOUs(daysAhead: number = 30): Promise<ExpiryReminder[]> {
    try {
      const expiringPartnerships = await this.partnershipRepository.findExpiringMOUs(daysAhead);
      const reminders: ExpiryReminder[] = [];

      for (const partnership of expiringPartnerships) {
        if (!partnership.mouExpiryDate) {
          continue;
        }

        const daysUntilExpiry = this.calculateDaysUntilExpiry(partnership.mouExpiryDate);
        const urgencyLevel = this.determineUrgencyLevel(daysUntilExpiry);

        reminders.push({
          partnership,
          daysUntilExpiry,
          urgencyLevel
        });
      }

      logger.info(`檢查到 ${reminders.length} 個即將到期的MOU`);
      return reminders;
    } catch (error) {
      logger.error('檢查MOU到期時發生錯誤:', error);
      throw error;
    }
  }

  /**
   * 獲取特定學校的MOU到期提醒
   * @param schoolId 學校ID
   * @returns 該學校的到期提醒，如果沒有則返回null
   */
  async getSchoolExpiryReminder(schoolId: string): Promise<ExpiryReminder | null> {
    try {
      const partnership = await this.partnershipRepository.findBySchoolId(schoolId);
      
      if (!partnership || !partnership.mouExpiryDate) {
        return null;
      }

      const daysUntilExpiry = this.calculateDaysUntilExpiry(partnership.mouExpiryDate);
      
      // 只有在30天內到期才返回提醒
      if (daysUntilExpiry > 30) {
        return null;
      }

      const urgencyLevel = this.determineUrgencyLevel(daysUntilExpiry);

      return {
        partnership,
        daysUntilExpiry,
        urgencyLevel
      };
    } catch (error) {
      logger.error(`獲取學校 ${schoolId} 的MOU到期提醒時發生錯誤:`, error);
      throw error;
    }
  }

  /**
   * 生成到期提醒訊息
   * @param reminder 到期提醒物件
   * @returns 格式化的提醒訊息
   */
  generateReminderMessage(reminder: ExpiryReminder): string {
    const { partnership, daysUntilExpiry, urgencyLevel } = reminder;
    
    let message = '';
    
    if (daysUntilExpiry <= 0) {
      message = `學校 ${partnership.schoolId} 的MOU已經到期`;
    } else if (daysUntilExpiry === 1) {
      message = `學校 ${partnership.schoolId} 的MOU將在明天到期`;
    } else {
      message = `學校 ${partnership.schoolId} 的MOU將在 ${daysUntilExpiry} 天後到期`;
    }

    // 根據緊急程度添加額外資訊
    switch (urgencyLevel) {
      case 'critical':
        message += ' - 緊急處理！';
        break;
      case 'high':
        message += ' - 請盡快處理';
        break;
      case 'medium':
        message += ' - 建議開始準備續約';
        break;
      case 'low':
        message += ' - 請注意到期時間';
        break;
    }

    return message;
  }

  /**
   * 批量處理到期提醒
   * @param daysAhead 提前檢查天數
   * @returns 處理的提醒數量
   */
  async processExpiryReminders(daysAhead: number = 30): Promise<number> {
    try {
      const reminders = await this.checkExpiringMOUs(daysAhead);
      
      for (const reminder of reminders) {
        const message = this.generateReminderMessage(reminder);
        logger.info(`MOU到期提醒: ${message}`);
        
        // 這裡可以擴展為發送郵件、推送通知等
        // 目前只記錄到日誌中
      }

      return reminders.length;
    } catch (error) {
      logger.error('處理MOU到期提醒時發生錯誤:', error);
      throw error;
    }
  }

  /**
   * 計算距離到期的天數
   * @param expiryDate 到期日期
   * @returns 距離到期的天數（負數表示已過期）
   */
  private calculateDaysUntilExpiry(expiryDate: Date): number {
    const now = new Date();
    const expiry = new Date(expiryDate);
    
    // 設定為當天的開始時間進行比較
    now.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * 根據剩餘天數決定緊急程度
   * @param daysUntilExpiry 距離到期的天數
   * @returns 緊急程度等級
   */
  private determineUrgencyLevel(daysUntilExpiry: number): 'low' | 'medium' | 'high' | 'critical' {
    if (daysUntilExpiry <= 0) {
      return 'critical'; // 已過期
    } else if (daysUntilExpiry <= 7) {
      return 'high'; // 一週內
    } else if (daysUntilExpiry <= 14) {
      return 'medium'; // 兩週內
    } else {
      return 'low'; // 一個月內
    }
  }

  /**
   * 獲取按緊急程度分組的提醒統計
   * @param daysAhead 提前檢查天數
   * @returns 按緊急程度分組的統計資料
   */
  async getReminderStatistics(daysAhead: number = 30): Promise<Record<string, number>> {
    try {
      const reminders = await this.checkExpiringMOUs(daysAhead);
      
      const statistics = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: reminders.length
      };

      for (const reminder of reminders) {
        statistics[reminder.urgencyLevel]++;
      }

      return statistics;
    } catch (error) {
      logger.error('獲取提醒統計時發生錯誤:', error);
      throw error;
    }
  }
}