import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { SchoolRepository } from '../repositories/schoolRepository';
import { InteractionRepository } from '../repositories/interactionRepository';
import { logger } from '../utils/logger';

export class DashboardController {
  private pool: Pool;
  private schoolRepository: SchoolRepository;
  private interactionRepository: InteractionRepository;

  constructor(pool: Pool) {
    this.pool = pool;
    this.schoolRepository = new SchoolRepository(pool);
    this.interactionRepository = new InteractionRepository(pool);
  }

  /**
   * 獲取儀表板統計數據
   * GET /api/dashboard/stats
   */
  async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 計算本週的開始和結束日期（週一到週日）
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 距離週一的天數
      
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - daysToMonday);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // 1. 總學校數
      const totalSchoolsResult = await this.pool.query(
        'SELECT COUNT(*) as count FROM schools'
      );
      const totalSchools = parseInt(totalSchoolsResult.rows[0].count, 10);

      // 2. 已聯繫學校數（從 interactions 統計不重複的 school_id）
      const contactedSchoolsResult = await this.pool.query(
        'SELECT COUNT(DISTINCT school_id) as count FROM interactions'
      );
      const contactedSchools = parseInt(contactedSchoolsResult.rows[0].count, 10);

      // 3. 本週互動（最近一週週一到週日，按慈大聯絡人分組）
      const weeklyInteractionsResult = await this.pool.query(
        `SELECT 
          tzu_contact as "tzuContact",
          COUNT(*) as count
        FROM interactions
        WHERE date >= $1 AND date <= $2
        GROUP BY tzu_contact
        ORDER BY count DESC`,
        [weekStart, weekEnd]
      );
      
      const weeklyInteractionsByContact = weeklyInteractionsResult.rows.map(row => ({
        tzuContact: row.tzuContact,
        count: parseInt(row.count, 10)
      }));
      
      const totalWeeklyInteractions = weeklyInteractionsByContact.reduce(
        (sum, item) => sum + item.count,
        0
      );

      // 4. 待追蹤學校（最近一週需要再聯繫的學校）
      const followUpSchoolsResult = await this.pool.query(
        `SELECT DISTINCT
          i.school_id as "schoolId",
          s.name as "schoolName",
          i.follow_up_date as "followUpDate",
          i.tzu_contact as "tzuContact"
        FROM interactions i
        INNER JOIN schools s ON i.school_id = s.id
        WHERE i.follow_up_required = true
          AND i.follow_up_date IS NOT NULL
          AND i.follow_up_date >= $1
          AND i.follow_up_date <= $2
        ORDER BY i.follow_up_date ASC`,
        [weekStart, weekEnd]
      );

      const followUpSchools = followUpSchoolsResult.rows.map(row => ({
        schoolId: row.schoolId,
        schoolName: row.schoolName,
        followUpDate: row.followUpDate,
        tzuContact: row.tzuContact
      }));

      res.status(200).json({
        success: true,
        data: {
          totalSchools,
          contactedSchools,
          weeklyInteractions: {
            total: totalWeeklyInteractions,
            byContact: weeklyInteractionsByContact
          },
          followUpSchools
        },
        message: '儀表板統計數據獲取成功'
      });
    } catch (error) {
      logger.error('獲取儀表板統計數據失敗:', error);
      next(error);
    }
  }
}

