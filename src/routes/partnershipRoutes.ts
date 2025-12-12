import { Router } from 'express';
import { Pool } from 'pg';
import { PartnershipRepository } from '../repositories/partnershipRepository';
import { ReminderService, ReminderScheduler, defaultReminderScheduleConfig } from '../services';
import { authMiddleware } from '../middleware/auth';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// 初始化合作管理服務
let partnershipRepository: PartnershipRepository;
let reminderService: ReminderService;
let reminderScheduler: ReminderScheduler;

function initializePartnershipServices(pool: Pool): void {
  partnershipRepository = new PartnershipRepository(pool);
  reminderService = new ReminderService(pool);
  reminderScheduler = new ReminderScheduler(reminderService, defaultReminderScheduleConfig);
  
  // 啟動提醒排程器
  reminderScheduler.start();
  
  logger.info('合作管理服務和MOU到期提醒排程器已初始化');
}

/**
 * @swagger
 * /api/partnerships/reminders/check:
 *   get:
 *     summary: 檢查即將到期的MOU
 *     tags: [Partnerships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: daysAhead
 *         schema:
 *           type: integer
 *           default: 30
 *         description: 提前檢查天數
 *     responses:
 *       200:
 *         description: 成功獲取到期提醒列表
 *       401:
 *         description: 未授權
 *       500:
 *         description: 伺服器錯誤
 */
router.get('/reminders/check', authMiddleware, async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.daysAhead as string) || 30;
    
    const reminders = await reminderService.checkExpiringMOUs(daysAhead);
    
    const response: ApiResponse = {
      success: true,
      data: reminders,
      message: `找到 ${reminders.length} 個即將到期的MOU`
    };
    
    res.json(response);
  } catch (error) {
    logger.error('檢查MOU到期提醒失敗:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '檢查MOU到期提醒失敗'
    };
    
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/partnerships/reminders/statistics:
 *   get:
 *     summary: 獲取MOU到期提醒統計
 *     tags: [Partnerships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: daysAhead
 *         schema:
 *           type: integer
 *           default: 30
 *         description: 提前檢查天數
 *     responses:
 *       200:
 *         description: 成功獲取統計資料
 *       401:
 *         description: 未授權
 *       500:
 *         description: 伺服器錯誤
 */
router.get('/reminders/statistics', authMiddleware, async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.daysAhead as string) || 30;
    
    const statistics = await reminderService.getReminderStatistics(daysAhead);
    
    const response: ApiResponse = {
      success: true,
      data: statistics,
      message: '成功獲取MOU到期統計'
    };
    
    res.json(response);
  } catch (error) {
    logger.error('獲取MOU到期統計失敗:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '獲取MOU到期統計失敗'
    };
    
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/partnerships/reminders/school/{schoolId}:
 *   get:
 *     summary: 獲取特定學校的MOU到期提醒
 *     tags: [Partnerships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: schoolId
 *         required: true
 *         schema:
 *           type: string
 *         description: 學校ID
 *     responses:
 *       200:
 *         description: 成功獲取學校提醒
 *       404:
 *         description: 學校沒有即將到期的MOU
 *       401:
 *         description: 未授權
 *       500:
 *         description: 伺服器錯誤
 */
router.get('/reminders/school/:schoolId', authMiddleware, async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SCHOOL_ID',
          message: '缺少學校ID',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const reminder = await reminderService.getSchoolExpiryReminder(schoolId);
    
    if (!reminder) {
      const response: ApiResponse = {
        success: true,
        data: null,
        message: '該學校沒有即將到期的MOU'
      };
      
      return res.json(response);
    }
    
    const response: ApiResponse = {
      success: true,
      data: reminder,
      message: '成功獲取學校MOU到期提醒'
    };
    
    return res.json(response);
  } catch (error) {
    logger.error('獲取學校MOU到期提醒失敗:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '獲取學校MOU到期提醒失敗'
    };
    
    return res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/partnerships/reminders/trigger:
 *   post:
 *     summary: 手動觸發MOU到期提醒檢查
 *     tags: [Partnerships]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功觸發提醒檢查
 *       401:
 *         description: 未授權
 *       500:
 *         description: 伺服器錯誤
 */
router.post('/reminders/trigger', authMiddleware, async (req, res) => {
  try {
    await reminderScheduler.triggerManualCheck();
    
    const response: ApiResponse = {
      success: true,
      message: '成功觸發MOU到期提醒檢查'
    };
    
    res.json(response);
  } catch (error) {
    logger.error('觸發MOU到期提醒檢查失敗:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '觸發MOU到期提醒檢查失敗'
    };
    
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/partnerships/reminders/schedule/status:
 *   get:
 *     summary: 獲取提醒排程狀態
 *     tags: [Partnerships]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功獲取排程狀態
 *       401:
 *         description: 未授權
 *       500:
 *         description: 伺服器錯誤
 */
router.get('/reminders/schedule/status', authMiddleware, async (req, res) => {
  try {
    const status = reminderScheduler.getStatus();
    
    const response: ApiResponse = {
      success: true,
      data: status,
      message: '成功獲取提醒排程狀態'
    };
    
    res.json(response);
  } catch (error) {
    logger.error('獲取提醒排程狀態失敗:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '獲取提醒排程狀態失敗'
    };
    
    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/partnerships/reminders/schedule/config:
 *   put:
 *     summary: 更新提醒排程配置
 *     tags: [Partnerships]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *               interval:
 *                 type: integer
 *               daysAhead:
 *                 type: integer
 *               notificationMethods:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [log, email, webhook]
 *     responses:
 *       200:
 *         description: 成功更新排程配置
 *       401:
 *         description: 未授權
 *       500:
 *         description: 伺服器錯誤
 */
router.put('/reminders/schedule/config', authMiddleware, async (req, res) => {
  try {
    const config = req.body;
    
    reminderScheduler.updateConfig(config);
    
    const response: ApiResponse = {
      success: true,
      message: '成功更新提醒排程配置'
    };
    
    res.json(response);
  } catch (error) {
    logger.error('更新提醒排程配置失敗:', error);
    
    const response: ApiResponse = {
      success: false,
      message: '更新提醒排程配置失敗'
    };
    
    res.status(500).json(response);
  }
});

export { router as partnershipRoutes, initializePartnershipServices };