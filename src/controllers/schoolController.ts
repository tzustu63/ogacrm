import { Request, Response, NextFunction } from 'express';
import { SchoolRepository, CreateSchoolData, UpdateSchoolData, SchoolFilters } from '../repositories/schoolRepository';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';
import Joi from 'joi';
import { SchoolType, RelationshipStatus } from '../types';

// Validation schemas
const createSchoolSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  country: Joi.string().trim().min(1).max(100).required(),
  region: Joi.string().trim().min(1).max(100).required(),
  schoolType: Joi.string().valid(...Object.values(SchoolType)).required(),
  website: Joi.string().uri().optional().allow(''),
  facebook: Joi.string().uri().optional().allow(''),
  instagram: Joi.string().uri().optional().allow(''),
  email: Joi.string().email().optional().allow(''),
  ownership: Joi.string().valid('public', 'private').optional().allow(''),
  hasMOU: Joi.boolean().optional(),
  notes: Joi.string().optional().allow(''),
  relationshipStatus: Joi.string().valid(...Object.values(RelationshipStatus)).optional()
});

const updateSchoolSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  country: Joi.string().trim().min(1).max(100).optional(),
  region: Joi.string().trim().min(1).max(100).optional(),
  schoolType: Joi.string().valid(...Object.values(SchoolType)).optional(),
  website: Joi.string().uri().optional().allow(''),
  facebook: Joi.string().uri().optional().allow(''),
  instagram: Joi.string().uri().optional().allow(''),
  email: Joi.string().email().optional().allow(''),
  ownership: Joi.string().valid('public', 'private').optional().allow(''),
  hasMOU: Joi.boolean().optional(),
  notes: Joi.string().optional().allow(''),
  relationshipStatus: Joi.string().valid(...Object.values(RelationshipStatus)).optional()
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(20),
  country: Joi.string().trim().optional(),
  region: Joi.string().trim().optional(),
  schoolType: Joi.string().valid(...Object.values(SchoolType)).optional(),
  relationshipStatus: Joi.string().valid(...Object.values(RelationshipStatus)).optional(),
  query: Joi.string().trim().optional(),
  sortBy: Joi.string().valid('name', 'country', 'region', 'schoolType', 'relationshipStatus', 'createdAt', 'updatedAt').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

export class SchoolController {
  private schoolRepository: SchoolRepository;

  constructor() {
    this.schoolRepository = new SchoolRepository(getPool());
  }

  /**
   * 創建新學校記錄
   * POST /api/schools
   */
  async createSchool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = createSchoolSchema.validate(req.body);
      
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

      const schoolData: CreateSchoolData = {
        name: value.name,
        country: value.country,
        region: value.region,
        schoolType: value.schoolType,
        website: value.website || undefined,
        facebook: value.facebook || undefined,
        instagram: value.instagram || undefined,
        email: value.email || undefined,
        ownership: value.ownership || undefined,
        hasMOU: value.hasMOU,
        notes: value.notes || undefined,
        relationshipStatus: value.relationshipStatus || RelationshipStatus.NO_RESPONSE
      };

      const school = await this.schoolRepository.create(schoolData);
      
      logger.info(`學校記錄已創建: ${school.id} - ${school.name}`);
      
      res.status(201).json({
        success: true,
        data: school,
        message: '學校記錄創建成功'
      });
    } catch (error) {
      logger.error('創建學校記錄失敗:', error);
      next(error);
    }
  }

  /**
   * 獲取學校列表
   * GET /api/schools
   */
  async getSchools(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const filters: SchoolFilters = {
        country: value.country,
        region: value.region,
        schoolType: value.schoolType,
        relationshipStatus: value.relationshipStatus,
        query: value.query
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof SchoolFilters] === undefined) {
          delete filters[key as keyof SchoolFilters];
        }
      });

      // 獲取總數（用於分頁計算）
      const totalCount = await this.schoolRepository.countByFilters(Object.keys(filters).length > 0 ? filters : undefined);
      
      // 獲取分頁後的學校列表
      const allSchools = await this.schoolRepository.findAll(Object.keys(filters).length > 0 ? filters : undefined);
      const startIndex = (value.page - 1) * value.limit;
      const endIndex = startIndex + value.limit;
      const paginatedSchools = allSchools.slice(startIndex, endIndex);
      
      const totalPages = Math.ceil(totalCount / value.limit);
      const hasNextPage = value.page < totalPages;
      const hasPrevPage = value.page > 1;

      res.status(200).json({
        success: true,
        data: paginatedSchools,
        pagination: {
          currentPage: value.page,
          totalPages,
          totalCount,
          limit: value.limit,
          hasNextPage,
          hasPrevPage
        },
        message: '學校列表獲取成功'
      });
    } catch (error) {
      logger.error('獲取學校列表失敗:', error);
      next(error);
    }
  }

  /**
   * 獲取單一學校詳情
   * GET /api/schools/:id
   */
  async getSchoolById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || !this.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: '無效的學校ID格式'
          }
        });
        return;
      }

      const school = await this.schoolRepository.findById(id);
      
      if (!school) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SCHOOL_NOT_FOUND',
            message: '找不到指定的學校記錄'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: school,
        message: '學校詳情獲取成功'
      });
    } catch (error) {
      logger.error('獲取學校詳情失敗:', error);
      next(error);
    }
  }

  /**
   * 更新學校資訊
   * PUT /api/schools/:id
   */
  async updateSchool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || !this.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: '無效的學校ID格式'
          }
        });
        return;
      }

      const { error, value } = updateSchoolSchema.validate(req.body);
      
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

      // Check if school exists
      const existingSchool = await this.schoolRepository.findById(id);
      if (!existingSchool) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SCHOOL_NOT_FOUND',
            message: '找不到指定的學校記錄'
          }
        });
        return;
      }

      const updateData: UpdateSchoolData = {};
      if (value.name !== undefined) updateData.name = value.name;
      if (value.country !== undefined) updateData.country = value.country;
      if (value.region !== undefined) updateData.region = value.region;
      if (value.schoolType !== undefined) updateData.schoolType = value.schoolType;
      if (value.website !== undefined) updateData.website = value.website || undefined;
      if (value.facebook !== undefined) updateData.facebook = value.facebook || undefined;
      if (value.instagram !== undefined) updateData.instagram = value.instagram || undefined;
      if (value.email !== undefined) updateData.email = value.email || undefined;
      if (value.ownership !== undefined) updateData.ownership = value.ownership || undefined;
      if (value.hasMOU !== undefined) updateData.hasMOU = value.hasMOU;
      if (value.notes !== undefined) updateData.notes = value.notes || undefined;
      if (value.relationshipStatus !== undefined) updateData.relationshipStatus = value.relationshipStatus;

      const updatedSchool = await this.schoolRepository.update(id, updateData);
      
      logger.info(`學校記錄已更新: ${id} - ${updatedSchool?.name}`);
      
      res.status(200).json({
        success: true,
        data: updatedSchool,
        message: '學校資訊更新成功'
      });
    } catch (error) {
      logger.error('更新學校資訊失敗:', error);
      next(error);
    }
  }

  /**
   * 刪除學校記錄
   * DELETE /api/schools/:id
   */
  async deleteSchool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || !this.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: '無效的學校ID格式'
          }
        });
        return;
      }

      // Check if school exists
      const existingSchool = await this.schoolRepository.findById(id);
      if (!existingSchool) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SCHOOL_NOT_FOUND',
            message: '找不到指定的學校記錄'
          }
        });
        return;
      }

      await this.schoolRepository.delete(id);
      
      logger.info(`學校記錄已刪除: ${id} - ${existingSchool.name}`);
      
      res.status(200).json({
        success: true,
        message: '學校記錄刪除成功'
      });
    } catch (error) {
      logger.error('刪除學校記錄失敗:', error);
      next(error);
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}