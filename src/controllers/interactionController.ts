import { Request, Response, NextFunction } from 'express';
import { InteractionRepository, CreateInteractionData, UpdateInteractionData, InteractionFilters } from '../repositories/interactionRepository';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';
import Joi from 'joi';
import { ContactMethod, RelationshipStatus } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

// Validation schemas
const createInteractionSchema = Joi.object({
  schoolId: Joi.string().uuid().required(),
  contactId: Joi.string().uuid().optional().allow(''),
  subject: Joi.string().trim().min(1).max(255).required(),
  contactMethod: Joi.string().valid(...Object.values(ContactMethod)).required(),
  date: Joi.date().max('now').required(),
  notes: Joi.string().trim().min(1).max(5000).required(),
  tzuContact: Joi.string().trim().min(1).max(255).required(),
  followUpRequired: Joi.boolean().optional(),
  followUpDate: Joi.date().min(Joi.ref('date')).optional(),
  followUpReport: Joi.string().trim().max(5000).optional().allow('')
});

const updateInteractionSchema = Joi.object({
  contactId: Joi.string().uuid().optional().allow(''),
  subject: Joi.string().trim().min(1).max(255).optional(),
  contactMethod: Joi.string().valid(...Object.values(ContactMethod)).optional(),
  date: Joi.date().max('now').optional(),
  notes: Joi.string().trim().min(1).max(5000).optional(),
  tzuContact: Joi.string().trim().min(1).max(255).optional(),
  followUpRequired: Joi.boolean().optional(),
  followUpDate: Joi.date().optional(),
  followUpReport: Joi.string().trim().max(5000).optional().allow('')
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  schoolId: Joi.string().uuid().optional(),
  contactMethod: Joi.string().valid(...Object.values(ContactMethod)).optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  followUpRequired: Joi.boolean().optional(),
  createdBy: Joi.string().optional(),
  query: Joi.string().trim().optional(),
  sortBy: Joi.string().valid('date', 'contactMethod', 'createdBy', 'createdAt').default('date'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const updateRelationshipStatusSchema = Joi.object({
  relationshipStatus: Joi.string().valid(...Object.values(RelationshipStatus)).required()
});

export class InteractionController {
  private interactionRepository: InteractionRepository;

  constructor() {
    this.interactionRepository = new InteractionRepository(getPool());
  }

  /**
   * 創建新互動記錄
   * POST /api/interactions
   */
  async createInteraction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = createInteractionSchema.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '輸入資料驗證失敗',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      // Validate school exists
      const schoolExists = await this.interactionRepository.validateSchoolExists(value.schoolId);
      if (!schoolExists) {
        res.status(400).json({
          success: false,
          error: {
            code: 'SCHOOL_NOT_FOUND',
            message: '指定的學校不存在'
          }
        });
        return;
      }

      const interactionData: CreateInteractionData = {
        schoolId: value.schoolId,
        contactId: value.contactId || undefined,
        subject: value.subject,
        contactMethod: value.contactMethod,
        date: value.date,
        notes: value.notes,
        tzuContact: value.tzuContact,
        followUpRequired: value.followUpRequired || false,
        followUpDate: value.followUpDate || undefined,
        followUpReport: value.followUpReport || undefined,
        createdBy: req.user?.email || 'system'
      };

      const interaction = await this.interactionRepository.create(interactionData);
      
      logger.info(`互動記錄已創建: ${interaction.id} - 學校 ${interaction.schoolId}`);
      
      res.status(201).json({
        success: true,
        data: interaction,
        message: '互動記錄創建成功'
      });
    } catch (error) {
      logger.error('創建互動記錄失敗:', error);
      next(error);
    }
  }

  /**
   * 獲取互動記錄列表
   * GET /api/interactions
   */
  async getInteractions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = querySchema.validate(req.query);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '查詢參數驗證失敗',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      const filters: InteractionFilters = {
        schoolId: value.schoolId,
        contactMethod: value.contactMethod,
        dateFrom: value.dateFrom,
        dateTo: value.dateTo,
        followUpRequired: value.followUpRequired,
        createdBy: value.createdBy,
        query: value.query
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof InteractionFilters] === undefined) {
          delete filters[key as keyof InteractionFilters];
        }
      });

      const interactions = await this.interactionRepository.findAll(Object.keys(filters).length > 0 ? filters : undefined);
      
      res.status(200).json({
        success: true,
        data: interactions,
        pagination: {
          currentPage: value.page,
          limit: value.limit,
          totalCount: interactions.length
        },
        message: '互動記錄列表獲取成功'
      });
    } catch (error) {
      logger.error('獲取互動記錄列表失敗:', error);
      next(error);
    }
  }

  /**
   * 獲取學校的互動歷史
   * GET /api/schools/:schoolId/interactions
   */
  async getInteractionsBySchool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { schoolId } = req.params;
      
      if (!schoolId || !this.isValidUUID(schoolId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: '無效的學校ID格式'
          }
        });
        return;
      }

      // Validate school exists
      const schoolExists = await this.interactionRepository.validateSchoolExists(schoolId);
      if (!schoolExists) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SCHOOL_NOT_FOUND',
            message: '找不到指定的學校記錄'
          }
        });
        return;
      }

      const interactions = await this.interactionRepository.findInteractionHistory(schoolId);
      
      res.status(200).json({
        success: true,
        data: interactions,
        message: '學校互動歷史獲取成功'
      });
    } catch (error) {
      logger.error('獲取學校互動歷史失敗:', error);
      next(error);
    }
  }

  /**
   * 獲取學校聯繫日期統計
   * GET /api/schools/:schoolId/interactions/stats
   */
  async getSchoolInteractionStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { schoolId } = req.params;
      
      if (!schoolId || !this.isValidUUID(schoolId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: '無效的學校ID格式'
          }
        });
        return;
      }

      // Validate school exists
      const schoolExists = await this.interactionRepository.validateSchoolExists(schoolId);
      if (!schoolExists) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SCHOOL_NOT_FOUND',
            message: '找不到指定的學校記錄'
          }
        });
        return;
      }

      const contactDates = await this.interactionRepository.getSchoolContactDates(schoolId);
      const totalInteractions = await this.interactionRepository.countBySchoolId(schoolId);
      
      res.status(200).json({
        success: true,
        data: {
          ...contactDates,
          totalInteractions
        },
        message: '學校互動統計獲取成功'
      });
    } catch (error) {
      logger.error('獲取學校互動統計失敗:', error);
      next(error);
    }
  }

  /**
   * 獲取待跟進的互動記錄
   * GET /api/interactions/follow-ups
   */
  async getPendingFollowUps(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { beforeDate } = req.query;
      let cutoffDate: Date | undefined;
      
      if (beforeDate) {
        cutoffDate = new Date(beforeDate as string);
        if (isNaN(cutoffDate.getTime())) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DATE',
              message: '無效的日期格式'
            }
          });
          return;
        }
      }

      const pendingFollowUps = await this.interactionRepository.findPendingFollowUps(cutoffDate);
      
      res.status(200).json({
        success: true,
        data: pendingFollowUps,
        message: '待跟進互動記錄獲取成功'
      });
    } catch (error) {
      logger.error('獲取待跟進互動記錄失敗:', error);
      next(error);
    }
  }

  /**
   * 獲取單一互動記錄詳情
   * GET /api/interactions/:id
   */
  async getInteractionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || !this.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: '無效的互動記錄ID格式'
          }
        });
        return;
      }

      const interaction = await this.interactionRepository.findById(id);
      
      if (!interaction) {
        res.status(404).json({
          success: false,
          error: {
            code: 'INTERACTION_NOT_FOUND',
            message: '找不到指定的互動記錄'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: interaction,
        message: '互動記錄詳情獲取成功'
      });
    } catch (error) {
      logger.error('獲取互動記錄詳情失敗:', error);
      next(error);
    }
  }

  /**
   * 更新互動記錄
   * PUT /api/interactions/:id
   */
  async updateInteraction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || !this.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: '無效的互動記錄ID格式'
          }
        });
        return;
      }

      const { error, value } = updateInteractionSchema.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '輸入資料驗證失敗',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      // Check if interaction exists
      const existingInteraction = await this.interactionRepository.findById(id);
      if (!existingInteraction) {
        res.status(404).json({
          success: false,
          error: {
            code: 'INTERACTION_NOT_FOUND',
            message: '找不到指定的互動記錄'
          }
        });
        return;
      }

      const updateData: UpdateInteractionData = {};
      if (value.contactId !== undefined) updateData.contactId = value.contactId || undefined;
      if (value.subject !== undefined) updateData.subject = value.subject;
      if (value.contactMethod !== undefined) updateData.contactMethod = value.contactMethod;
      if (value.date !== undefined) updateData.date = value.date;
      if (value.notes !== undefined) updateData.notes = value.notes;
      if (value.tzuContact !== undefined) updateData.tzuContact = value.tzuContact;
      if (value.followUpRequired !== undefined) updateData.followUpRequired = value.followUpRequired;
      if (value.followUpDate !== undefined) updateData.followUpDate = value.followUpDate;
      if (value.followUpReport !== undefined) updateData.followUpReport = value.followUpReport || undefined;

      const updatedInteraction = await this.interactionRepository.update(id, updateData);
      
      logger.info(`互動記錄已更新: ${id}`);
      
      res.status(200).json({
        success: true,
        data: updatedInteraction,
        message: '互動記錄更新成功'
      });
    } catch (error) {
      logger.error('更新互動記錄失敗:', error);
      next(error);
    }
  }

  /**
   * 獲取有互動記錄的學校列表
   * GET /api/interactions/schools
   */
  async getSchoolsWithInteractions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = `
        SELECT DISTINCT s.id, s.name, s.country, s.region
        FROM schools s
        INNER JOIN interactions i ON s.id = i.school_id
        ORDER BY s.name ASC
      `;
      
      const pool = getPool();
      const result = await pool.query(query);
      
      res.status(200).json({
        success: true,
        data: result.rows,
        message: '獲取學校列表成功'
      });
    } catch (error) {
      logger.error('獲取有互動記錄的學校列表失敗:', error);
      next(error);
    }
  }

  /**
   * 更新學校關係狀態
   * PUT /api/schools/:schoolId/relationship-status
   */
  async updateRelationshipStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { schoolId } = req.params;
      
      if (!schoolId || !this.isValidUUID(schoolId)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: '無效的學校ID格式'
          }
        });
        return;
      }

      const { error, value } = updateRelationshipStatusSchema.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '輸入資料驗證失敗',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      // Validate school exists
      const schoolExists = await this.interactionRepository.validateSchoolExists(schoolId);
      if (!schoolExists) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SCHOOL_NOT_FOUND',
            message: '找不到指定的學校記錄'
          }
        });
        return;
      }

      const success = await this.interactionRepository.updateRelationshipStatus(schoolId, value.relationshipStatus);
      
      if (!success) {
        res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: '關係狀態更新失敗'
          }
        });
        return;
      }

      logger.info(`學校關係狀態已更新: ${schoolId} -> ${value.relationshipStatus}`);
      
      res.status(200).json({
        success: true,
        message: '關係狀態更新成功'
      });
    } catch (error) {
      logger.error('更新關係狀態失敗:', error);
      next(error);
    }
  }

  /**
   * 刪除互動記錄
   * DELETE /api/interactions/:id
   */
  async deleteInteraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || !this.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: '無效的互動記錄ID格式'
          }
        });
        return;
      }

      // Check if interaction exists
      const existingInteraction = await this.interactionRepository.findById(id);
      if (!existingInteraction) {
        res.status(404).json({
          success: false,
          error: {
            code: 'INTERACTION_NOT_FOUND',
            message: '找不到指定的互動記錄'
          }
        });
        return;
      }

      await this.interactionRepository.delete(id);
      
      // Recalculate school contact dates after deletion
      await this.interactionRepository.getSchoolContactDates(existingInteraction.schoolId);
      
      logger.info(`互動記錄已刪除: ${id}`);
      
      res.status(200).json({
        success: true,
        message: '互動記錄刪除成功'
      });
    } catch (error) {
      logger.error('刪除互動記錄失敗:', error);
      next(error);
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}