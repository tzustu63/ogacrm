import Joi from 'joi';
import { SchoolType, RelationshipStatus, ContactMethod, MOUStatus } from '../types';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// School validation schema
export const schoolSchema = Joi.object({
  name: Joi.string().required().min(1).max(255).messages({
    'string.empty': '學校名稱不能為空',
    'string.max': '學校名稱不能超過255個字符',
    'any.required': '學校名稱為必填欄位'
  }),
  country: Joi.string().required().min(1).max(100).messages({
    'string.empty': '國家不能為空',
    'string.max': '國家名稱不能超過100個字符',
    'any.required': '國家為必填欄位'
  }),
  region: Joi.string().required().min(1).max(100).messages({
    'string.empty': '地區不能為空',
    'string.max': '地區名稱不能超過100個字符',
    'any.required': '地區為必填欄位'
  }),
  schoolType: Joi.string().valid(...Object.values(SchoolType)).required().messages({
    'any.only': '學校類型必須是有效的選項',
    'any.required': '學校類型為必填欄位'
  }),
  website: Joi.string().uri().optional().allow('').messages({
    'string.uri': '網站必須是有效的URL格式'
  }),
  relationshipStatus: Joi.string().valid(...Object.values(RelationshipStatus)).optional()
});

// Contact validation schema
export const contactSchema = Joi.object({
  name: Joi.string().required().min(1).max(100).messages({
    'string.empty': '聯絡人姓名不能為空',
    'string.max': '聯絡人姓名不能超過100個字符',
    'any.required': '聯絡人姓名為必填欄位'
  }),
  email: Joi.string().email().required().messages({
    'string.email': '電郵格式不正確',
    'any.required': '電郵為必填欄位'
  }),
  phone: Joi.string().optional().allow('').max(20).messages({
    'string.max': '電話號碼不能超過20個字符'
  }),
  position: Joi.string().optional().allow('').max(100).messages({
    'string.max': '職位不能超過100個字符'
  }),
  isPrimary: Joi.boolean().optional().default(false)
});

// Interaction validation schema
export const interactionSchema = Joi.object({
  contactMethod: Joi.string().valid(...Object.values(ContactMethod)).required().messages({
    'any.only': '聯繫方式必須是有效的選項',
    'any.required': '聯繫方式為必填欄位'
  }),
  date: Joi.date().required().messages({
    'date.base': '日期格式不正確',
    'any.required': '日期為必填欄位'
  }),
  notes: Joi.string().required().min(1).max(1000).messages({
    'string.empty': '備註不能為空',
    'string.max': '備註不能超過1000個字符',
    'any.required': '備註為必填欄位'
  }),
  followUpRequired: Joi.boolean().optional().default(false),
  followUpDate: Joi.date().optional().when('followUpRequired', {
    is: true,
    then: Joi.required().messages({
      'any.required': '需要後續追蹤時必須設定追蹤日期'
    })
  })
});

// Partnership validation schema
export const partnershipSchema = Joi.object({
  mouStatus: Joi.string().valid(...Object.values(MOUStatus)).required().messages({
    'any.only': 'MOU狀態必須是有效的選項',
    'any.required': 'MOU狀態為必填欄位'
  }),
  mouSignedDate: Joi.date().optional().when('mouStatus', {
    is: MOUStatus.SIGNED,
    then: Joi.required().messages({
      'any.required': 'MOU已簽訂時必須提供簽訂日期'
    })
  }),
  mouExpiryDate: Joi.date().optional().when('mouStatus', {
    is: MOUStatus.SIGNED,
    then: Joi.required().messages({
      'any.required': 'MOU已簽訂時必須提供到期日期'
    })
  }),
  referralCount: Joi.number().integer().min(0).optional().default(0).messages({
    'number.base': '推薦學生數必須是數字',
    'number.integer': '推薦學生數必須是整數',
    'number.min': '推薦學生數不能小於0'
  }),
  eventsHeld: Joi.number().integer().min(0).optional().default(0).messages({
    'number.base': '說明會次數必須是數字',
    'number.integer': '說明會次數必須是整數',
    'number.min': '說明會次數不能小於0'
  })
});

// Preference validation schema
export const preferenceSchema = Joi.object({
  preferredContactMethod: Joi.string().valid(...Object.values(ContactMethod)).required().messages({
    'any.only': '偏好聯繫方式必須是有效的選項',
    'any.required': '偏好聯繫方式為必填欄位'
  }),
  programsOfInterest: Joi.array().items(Joi.string().min(1).max(100)).min(1).required().messages({
    'array.min': '至少需要選擇一個感興趣的課程',
    'any.required': '感興趣的課程為必填欄位'
  }),
  bestContactTime: Joi.string().required().min(1).max(100).messages({
    'string.empty': '最佳聯繫時間不能為空',
    'any.required': '最佳聯繫時間為必填欄位'
  }),
  timezone: Joi.string().required().min(1).max(50).messages({
    'string.empty': '時區不能為空',
    'any.required': '時區為必填欄位'
  }),
  specialRequirements: Joi.string().optional().allow('').max(500).messages({
    'string.max': '特殊需求不能超過500個字符'
  })
});

// Export validation schema
export const exportSchema = Joi.object({
  format: Joi.string().valid('csv', 'json', 'excel').required().messages({
    'any.only': '匯出格式必須是 csv、json 或 excel',
    'any.required': '匯出格式為必填欄位'
  }),
  fields: Joi.array().items(Joi.string().min(1)).optional().messages({
    'array.base': '欄位必須是字串陣列'
  }),
  includeContacts: Joi.boolean().optional(),
  includeInteractions: Joi.boolean().optional(),
  includePartnerships: Joi.boolean().optional(),
  includePreferences: Joi.boolean().optional(),
  batchSize: Joi.number().integer().min(1).max(10000).optional().messages({
    'number.base': '批次大小必須是數字',
    'number.integer': '批次大小必須是整數',
    'number.min': '批次大小不能小於1',
    'number.max': '批次大小不能超過10000'
  }),
  schoolIds: Joi.array().items(Joi.string().uuid()).optional().messages({
    'array.base': '學校ID必須是UUID陣列'
  }),
  startDate: Joi.date().optional().messages({
    'date.base': '開始日期格式不正確'
  }),
  endDate: Joi.date().optional().when('startDate', {
    is: Joi.exist(),
    then: Joi.date().min(Joi.ref('startDate')).messages({
      'date.min': '結束日期不能早於開始日期'
    })
  }).messages({
    'date.base': '結束日期格式不正確'
  })
});

export function validateExportRequest(data: any): { isValid: boolean; error?: string; value?: any } {
  return validateData(exportSchema, data);
}

export function validateData<T>(schema: Joi.ObjectSchema, data: any): { isValid: boolean; error?: string; value?: T } {
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join('; ');
    return { isValid: false, error: errorMessage };
  }
  
  return { isValid: true, value };
}