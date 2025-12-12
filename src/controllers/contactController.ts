import { Request, Response, NextFunction } from 'express';
import { ContactRepository, CreateContactData, UpdateContactData, ContactFilters } from '../repositories/contactRepository';
import { getPool } from '../config/database';
import { logger } from '../utils/logger';
import Joi from 'joi';

// Validation schemas
const createContactSchema = Joi.object({
  schoolId: Joi.string().uuid().required(),
  name: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(20).optional().allow(''),
  position: Joi.string().max(100).optional().allow(''),
  organization: Joi.string().max(255).optional().allow(''),
  facebook: Joi.string().uri().optional().allow(''),
  instagram: Joi.string().uri().optional().allow(''),
  whatsapp: Joi.string().max(255).optional().allow(''),
  notes: Joi.string().optional().allow(''),
  isPrimary: Joi.boolean().optional()
});

const updateContactSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().max(20).optional().allow(''),
  position: Joi.string().max(100).optional().allow(''),
  organization: Joi.string().max(255).optional().allow(''),
  facebook: Joi.string().uri().optional().allow(''),
  instagram: Joi.string().uri().optional().allow(''),
  whatsapp: Joi.string().max(255).optional().allow(''),
  notes: Joi.string().optional().allow(''),
  isPrimary: Joi.boolean().optional()
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  schoolId: Joi.string().uuid().optional(),
  email: Joi.string().email().optional(),
  isPrimary: Joi.boolean().optional(),
  query: Joi.string().trim().optional()
});

const batchCreateSchema = Joi.object({
  contacts: Joi.array().items(createContactSchema).min(1).max(50).required()
});

const batchUpdateSchema = Joi.object({
  updates: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      data: updateContactSchema.required()
    })
  ).min(1).max(50).required()
});

export class ContactController {
  private contactRepository: ContactRepository;

  constructor() {
    this.contactRepository = new ContactRepository(getPool());
  }

  /**
   * 創建新聯絡人
   * POST /api/contacts
   */
  async createContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = createContactSchema.validate(req.body);
      
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
      const schoolExists = await this.contactRepository.validateSchoolExists(value.schoolId);
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

      const contactData: CreateContactData = {
        schoolId: value.schoolId,
        name: value.name,
        email: value.email,
        phone: value.phone || undefined,
        position: value.position || undefined,
        organization: value.organization || undefined,
        facebook: value.facebook || undefined,
        instagram: value.instagram || undefined,
        whatsapp: value.whatsapp || undefined,
        notes: value.notes || undefined,
        isPrimary: value.isPrimary || false
      };

      const contact = await this.contactRepository.create(contactData);
      
      logger.info(`聯絡人記錄已創建: ${contact.id} - ${contact.name}`);
      
      res.status(201).json({
        success: true,
        data: contact,
        message: '聯絡人記錄創建成功'
      });
    } catch (error) {
      logger.error('創建聯絡人記錄失敗:', error);
      next(error);
    }
  }

  /**
   * 批次創建聯絡人
   * POST /api/contacts/batch
   */
  async batchCreateContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = batchCreateSchema.validate(req.body);
      
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

      const results = [];
      const errors = [];

      for (let i = 0; i < value.contacts.length; i++) {
        try {
          const contactData = value.contacts[i];
          
          // Validate school exists
          const schoolExists = await this.contactRepository.validateSchoolExists(contactData.schoolId);
          if (!schoolExists) {
            errors.push({
              index: i,
              error: `學校 ${contactData.schoolId} 不存在`
            });
            continue;
          }

          const contact = await this.contactRepository.create(contactData);
          results.push(contact);
        } catch (error) {
          errors.push({
            index: i,
            error: error instanceof Error ? error.message : '未知錯誤'
          });
        }
      }

      logger.info(`批次創建聯絡人完成: 成功 ${results.length}, 失敗 ${errors.length}`);
      
      res.status(201).json({
        success: true,
        data: {
          created: results,
          errors: errors
        },
        message: `批次創建完成: 成功 ${results.length}, 失敗 ${errors.length}`
      });
    } catch (error) {
      logger.error('批次創建聯絡人失敗:', error);
      next(error);
    }
  }

  /**
   * 獲取聯絡人列表
   * GET /api/contacts
   */
  async getContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const filters: ContactFilters = {
        schoolId: value.schoolId,
        email: value.email,
        isPrimary: value.isPrimary,
        query: value.query
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof ContactFilters] === undefined) {
          delete filters[key as keyof ContactFilters];
        }
      });

      const contacts = await this.contactRepository.findAll(Object.keys(filters).length > 0 ? filters : undefined);
      
      res.status(200).json({
        success: true,
        data: contacts,
        pagination: {
          currentPage: value.page,
          limit: value.limit,
          totalCount: contacts.length
        },
        message: '聯絡人列表獲取成功'
      });
    } catch (error) {
      logger.error('獲取聯絡人列表失敗:', error);
      next(error);
    }
  }

  /**
   * 獲取學校的所有聯絡人
   * GET /api/schools/:schoolId/contacts
   */
  async getContactsBySchool(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const schoolExists = await this.contactRepository.validateSchoolExists(schoolId);
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

      const contacts = await this.contactRepository.findBySchoolId(schoolId);
      
      res.status(200).json({
        success: true,
        data: contacts,
        message: '學校聯絡人列表獲取成功'
      });
    } catch (error) {
      logger.error('獲取學校聯絡人失敗:', error);
      next(error);
    }
  }

  /**
   * 獲取單一聯絡人詳情
   * GET /api/contacts/:id
   */
  async getContactById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || !this.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: '無效的聯絡人ID格式'
          }
        });
        return;
      }

      const contact = await this.contactRepository.findById(id);
      
      if (!contact) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CONTACT_NOT_FOUND',
            message: '找不到指定的聯絡人記錄'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: contact,
        message: '聯絡人詳情獲取成功'
      });
    } catch (error) {
      logger.error('獲取聯絡人詳情失敗:', error);
      next(error);
    }
  }

  /**
   * 更新聯絡人資訊
   * PUT /api/contacts/:id
   */
  async updateContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || !this.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: '無效的聯絡人ID格式'
          }
        });
        return;
      }

      const { error, value } = updateContactSchema.validate(req.body);
      
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

      // Check if contact exists
      const existingContact = await this.contactRepository.findById(id);
      if (!existingContact) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CONTACT_NOT_FOUND',
            message: '找不到指定的聯絡人記錄'
          }
        });
        return;
      }

      const updateData: UpdateContactData = {};
      if (value.name !== undefined) updateData.name = value.name;
      if (value.email !== undefined) updateData.email = value.email;
      if (value.phone !== undefined) updateData.phone = value.phone || undefined;
      if (value.position !== undefined) updateData.position = value.position || undefined;
      if (value.organization !== undefined) updateData.organization = value.organization || undefined;
      if (value.facebook !== undefined) updateData.facebook = value.facebook || undefined;
      if (value.instagram !== undefined) updateData.instagram = value.instagram || undefined;
      if (value.whatsapp !== undefined) updateData.whatsapp = value.whatsapp || undefined;
      if (value.notes !== undefined) updateData.notes = value.notes || undefined;
      if (value.isPrimary !== undefined) updateData.isPrimary = value.isPrimary;

      const updatedContact = await this.contactRepository.update(id, updateData);
      
      logger.info(`聯絡人記錄已更新: ${id} - ${updatedContact?.name}`);
      
      res.status(200).json({
        success: true,
        data: updatedContact,
        message: '聯絡人資訊更新成功'
      });
    } catch (error) {
      logger.error('更新聯絡人資訊失敗:', error);
      next(error);
    }
  }

  /**
   * 批次更新聯絡人
   * PUT /api/contacts/batch
   */
  async batchUpdateContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = batchUpdateSchema.validate(req.body);
      
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

      const results = [];
      const errors = [];

      for (let i = 0; i < value.updates.length; i++) {
        try {
          const { id, data } = value.updates[i];
          
          // Check if contact exists
          const existingContact = await this.contactRepository.findById(id);
          if (!existingContact) {
            errors.push({
              index: i,
              id,
              error: '聯絡人不存在'
            });
            continue;
          }

          const updatedContact = await this.contactRepository.update(id, data);
          results.push(updatedContact);
        } catch (error) {
          errors.push({
            index: i,
            id: value.updates[i].id,
            error: error instanceof Error ? error.message : '未知錯誤'
          });
        }
      }

      logger.info(`批次更新聯絡人完成: 成功 ${results.length}, 失敗 ${errors.length}`);
      
      res.status(200).json({
        success: true,
        data: {
          updated: results,
          errors: errors
        },
        message: `批次更新完成: 成功 ${results.length}, 失敗 ${errors.length}`
      });
    } catch (error) {
      logger.error('批次更新聯絡人失敗:', error);
      next(error);
    }
  }

  /**
   * 刪除聯絡人記錄
   * DELETE /api/contacts/:id
   */
  async deleteContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || !this.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: '無效的聯絡人ID格式'
          }
        });
        return;
      }

      // Check if contact exists
      const existingContact = await this.contactRepository.findById(id);
      if (!existingContact) {
        res.status(404).json({
          success: false,
          error: {
            code: 'CONTACT_NOT_FOUND',
            message: '找不到指定的聯絡人記錄'
          }
        });
        return;
      }

      await this.contactRepository.delete(id);
      
      logger.info(`聯絡人記錄已刪除: ${id} - ${existingContact.name}`);
      
      res.status(200).json({
        success: true,
        message: '聯絡人記錄刪除成功'
      });
    } catch (error) {
      logger.error('刪除聯絡人記錄失敗:', error);
      next(error);
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}