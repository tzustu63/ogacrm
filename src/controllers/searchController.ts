import { Request, Response, NextFunction } from 'express';
import { SearchEngine, FilterOptions, SortOptions, PaginationOptions, ExportFormat } from '../services/searchEngine';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';
import Joi from 'joi';
import { SchoolType, RelationshipStatus, MOUStatus } from '../types';

// Validation schemas
const searchSchema = Joi.object({
  query: Joi.string().trim().optional().allow(''),
  country: Joi.string().trim().optional(),
  region: Joi.string().trim().optional(),
  schoolType: Joi.string().valid(...Object.values(SchoolType)).optional(),
  relationshipStatus: Joi.string().valid(...Object.values(RelationshipStatus)).optional(),
  mouStatus: Joi.string().valid(...Object.values(MOUStatus)).optional(),
  sortBy: Joi.string().valid('name', 'country', 'region', 'schoolType', 'relationshipStatus', 'createdAt', 'updatedAt').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

const exportSchema = Joi.object({
  query: Joi.string().trim().optional().allow(''),
  country: Joi.string().trim().optional(),
  region: Joi.string().trim().optional(),
  schoolType: Joi.string().valid(...Object.values(SchoolType)).optional(),
  relationshipStatus: Joi.string().valid(...Object.values(RelationshipStatus)).optional(),
  mouStatus: Joi.string().valid(...Object.values(MOUStatus)).optional(),
  format: Joi.string().valid('csv', 'json', 'excel').default('json'),
  fields: Joi.array().items(Joi.string()).optional(),
  sortBy: Joi.string().valid('name', 'country', 'region', 'schoolType', 'relationshipStatus', 'createdAt', 'updatedAt').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

export class SearchController {
  private searchEngine: SearchEngine;

  constructor() {
    this.searchEngine = new SearchEngine(getPool());
  }

  /**
   * 執行搜尋查詢
   * GET /api/search
   */
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = searchSchema.validate(req.query);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '搜尋參數驗證失敗',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      const filters: FilterOptions = {};
      if (value.country) filters.country = value.country;
      if (value.region) filters.region = value.region;
      if (value.schoolType) filters.schoolType = value.schoolType;
      if (value.relationshipStatus) filters.relationshipStatus = value.relationshipStatus;
      if (value.mouStatus) filters.mouStatus = value.mouStatus;

      const sort: SortOptions = {
        field: value.sortBy,
        order: value.sortOrder
      };

      const pagination: PaginationOptions = {
        page: value.page,
        limit: value.limit
      };

      const result = await this.searchEngine.search(
        value.query || undefined,
        Object.keys(filters).length > 0 ? filters : undefined,
        sort,
        pagination
      );

      const totalPages = Math.ceil(result.totalCount / value.limit);
      const hasNextPage = value.page < totalPages;
      const hasPrevPage = value.page > 1;

      logger.info(`搜尋執行完成: 查詢="${value.query || ''}", 結果數量=${result.schools.length}, 總數=${result.totalCount}`);

      res.status(200).json({
        success: true,
        data: result.schools,
        pagination: {
          currentPage: value.page,
          totalPages,
          totalCount: result.totalCount,
          limit: value.limit,
          hasNextPage,
          hasPrevPage
        },
        filters: {
          query: value.query || '',
          ...filters
        },
        sort: {
          field: value.sortBy,
          order: value.sortOrder
        },
        message: '搜尋執行成功'
      });
    } catch (error) {
      logger.error('搜尋執行失敗:', error);
      next(error);
    }
  }

  /**
   * 進階篩選搜尋
   * POST /api/search/advanced
   */
  async advancedSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = searchSchema.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '搜尋參數驗證失敗',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      const filters: FilterOptions = {};
      if (value.country) filters.country = value.country;
      if (value.region) filters.region = value.region;
      if (value.schoolType) filters.schoolType = value.schoolType;
      if (value.relationshipStatus) filters.relationshipStatus = value.relationshipStatus;
      if (value.mouStatus) filters.mouStatus = value.mouStatus;

      const sort: SortOptions = {
        field: value.sortBy,
        order: value.sortOrder
      };

      const pagination: PaginationOptions = {
        page: value.page,
        limit: value.limit
      };

      const result = await this.searchEngine.search(
        value.query || undefined,
        Object.keys(filters).length > 0 ? filters : undefined,
        sort,
        pagination
      );

      const totalPages = Math.ceil(result.totalCount / value.limit);
      const hasNextPage = value.page < totalPages;
      const hasPrevPage = value.page > 1;

      logger.info(`進階搜尋執行完成: 查詢="${value.query || ''}", 結果數量=${result.schools.length}, 總數=${result.totalCount}`);

      res.status(200).json({
        success: true,
        data: result.schools,
        pagination: {
          currentPage: value.page,
          totalPages,
          totalCount: result.totalCount,
          limit: value.limit,
          hasNextPage,
          hasPrevPage
        },
        filters: {
          query: value.query || '',
          ...filters
        },
        sort: {
          field: value.sortBy,
          order: value.sortOrder
        },
        message: '進階搜尋執行成功'
      });
    } catch (error) {
      logger.error('進階搜尋執行失敗:', error);
      next(error);
    }
  }

  /**
   * 清除所有篩選條件
   * GET /api/search/clear
   */
  async clearFilters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sortBy = 'name', sortOrder = 'asc', page = 1, limit = 20 } = req.query;

      // Validate sort and pagination parameters
      const sortValidation = Joi.object({
        sortBy: Joi.string().valid('name', 'country', 'region', 'schoolType', 'relationshipStatus', 'createdAt', 'updatedAt').default('name'),
        sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
      }).validate({ sortBy, sortOrder, page: Number(page), limit: Number(limit) });

      if (sortValidation.error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '參數驗證失敗',
            details: sortValidation.error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      const sort: SortOptions = {
        field: sortValidation.value.sortBy,
        order: sortValidation.value.sortOrder
      };

      const pagination: PaginationOptions = {
        page: sortValidation.value.page,
        limit: sortValidation.value.limit
      };

      const result = await this.searchEngine.clearFilters(sort, pagination);

      const totalPages = Math.ceil(result.totalCount / sortValidation.value.limit);
      const hasNextPage = sortValidation.value.page < totalPages;
      const hasPrevPage = sortValidation.value.page > 1;

      logger.info(`篩選條件已清除: 結果數量=${result.schools.length}, 總數=${result.totalCount}`);

      res.status(200).json({
        success: true,
        data: result.schools,
        pagination: {
          currentPage: sortValidation.value.page,
          totalPages,
          totalCount: result.totalCount,
          limit: sortValidation.value.limit,
          hasNextPage,
          hasPrevPage
        },
        filters: {},
        sort: {
          field: sortValidation.value.sortBy,
          order: sortValidation.value.sortOrder
        },
        message: '篩選條件已清除，顯示所有學校記錄'
      });
    } catch (error) {
      logger.error('清除篩選條件失敗:', error);
      next(error);
    }
  }

  /**
   * 匯出搜尋結果
   * POST /api/search/export
   */
  async exportResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = exportSchema.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '匯出參數驗證失敗',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
        return;
      }

      const filters: FilterOptions = {};
      if (value.country) filters.country = value.country;
      if (value.region) filters.region = value.region;
      if (value.schoolType) filters.schoolType = value.schoolType;
      if (value.relationshipStatus) filters.relationshipStatus = value.relationshipStatus;
      if (value.mouStatus) filters.mouStatus = value.mouStatus;

      const sort: SortOptions = {
        field: value.sortBy,
        order: value.sortOrder
      };

      // For export, we don't want pagination - get all results
      const result = await this.searchEngine.search(
        value.query || undefined,
        Object.keys(filters).length > 0 ? filters : undefined,
        sort
      );

      const exportFormat: ExportFormat = {
        format: value.format,
        fields: value.fields
      };

      const exportedData = await this.searchEngine.exportResults(result.schools, exportFormat);

      logger.info(`資料匯出完成: 格式=${value.format}, 記錄數=${result.schools.length}`);

      // Set appropriate headers based on format
      if (value.format === 'csv' || value.format === 'excel') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="schools_export_${new Date().toISOString().split('T')[0]}.csv"`);
        res.status(200).send(exportedData);
      } else {
        res.status(200).json({
          success: true,
          data: exportedData,
          metadata: {
            format: value.format,
            totalRecords: result.schools.length,
            exportedAt: new Date().toISOString(),
            filters: {
              query: value.query || '',
              ...filters
            }
          },
          message: '資料匯出成功'
        });
      }
    } catch (error) {
      logger.error('匯出搜尋結果失敗:', error);
      next(error);
    }
  }

  /**
   * 獲取篩選選項
   * GET /api/search/filter-options
   */
  async getFilterOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pool = getPool();
      const client = await pool.connect();
      
      try {
        // 獲取所有國家
        const countriesResult = await client.query(
          'SELECT DISTINCT country FROM schools WHERE country IS NOT NULL ORDER BY country'
        );
        const countries = countriesResult.rows.map(row => row.country);

        // 獲取所有地區
        const regionsResult = await client.query(
          'SELECT DISTINCT region FROM schools WHERE region IS NOT NULL ORDER BY region'
        );
        const regions = regionsResult.rows.map(row => row.region);

        // 學校類型從枚舉獲取
        const schoolTypes = Object.values(SchoolType);

        // 關係狀態從枚舉獲取
        const relationshipStatuses = Object.values(RelationshipStatus);

        logger.info('篩選選項獲取成功');

        res.status(200).json({
          success: true,
          data: {
            countries,
            regions,
            schoolTypes,
            relationshipStatuses
          },
          message: '篩選選項獲取成功'
        });
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('獲取篩選選項失敗:', error);
      next(error);
    }
  }

  /**
   * 獲取搜尋建議
   * GET /api/search/suggestions
   */
  async getSearchSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, type = 'all' } = req.query;

      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: '搜尋查詢至少需要2個字符'
          }
        });
        return;
      }

      const suggestions = await this.getAutocompleteSuggestions(query.trim(), type as string);

      res.status(200).json({
        success: true,
        data: suggestions,
        message: '搜尋建議獲取成功'
      });
    } catch (error) {
      logger.error('獲取搜尋建議失敗:', error);
      next(error);
    }
  }

  /**
   * 獲取自動完成建議
   */
  private async getAutocompleteSuggestions(query: string, type: string): Promise<any> {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      const suggestions: any = {
        schools: [],
        contacts: [],
        countries: [],
        regions: []
      };

      const searchTerm = `%${query}%`;

      // Get school name suggestions
      if (type === 'all' || type === 'schools') {
        const schoolQuery = `
          SELECT DISTINCT name 
          FROM schools 
          WHERE name ILIKE $1 
          ORDER BY name 
          LIMIT 10
        `;
        const schoolResult = await client.query(schoolQuery, [searchTerm]);
        suggestions.schools = schoolResult.rows.map(row => row.name);
      }

      // Get contact name suggestions
      if (type === 'all' || type === 'contacts') {
        const contactQuery = `
          SELECT DISTINCT name 
          FROM contacts 
          WHERE name ILIKE $1 
          ORDER BY name 
          LIMIT 10
        `;
        const contactResult = await client.query(contactQuery, [searchTerm]);
        suggestions.contacts = contactResult.rows.map(row => row.name);
      }

      // Get country suggestions
      if (type === 'all' || type === 'countries') {
        const countryQuery = `
          SELECT DISTINCT country 
          FROM schools 
          WHERE country ILIKE $1 
          ORDER BY country 
          LIMIT 10
        `;
        const countryResult = await client.query(countryQuery, [searchTerm]);
        suggestions.countries = countryResult.rows.map(row => row.country);
      }

      // Get region suggestions
      if (type === 'all' || type === 'regions') {
        const regionQuery = `
          SELECT DISTINCT region 
          FROM schools 
          WHERE region ILIKE $1 
          ORDER BY region 
          LIMIT 10
        `;
        const regionResult = await client.query(regionQuery, [searchTerm]);
        suggestions.regions = regionResult.rows.map(row => row.region);
      }

      return suggestions;
    } finally {
      client.release();
    }
  }
}