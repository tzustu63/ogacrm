import * as yup from 'yup'
import { SchoolType, RelationshipStatus, ContactMethod, MOUStatus } from '@/types'

// Common validation schemas
export const emailSchema = yup
  .string()
  .email('請輸入有效的電子郵件地址')
  .required('電子郵件為必填項目')

export const phoneSchema = yup
  .string()
  .matches(/^[\+]?[0-9\s\-\(\)]+$/, '請輸入有效的電話號碼')
  .optional()

export const urlSchema = yup
  .string()
  .url('請輸入有效的網址')
  .optional()

// School validation schema
export const schoolSchema = yup.object({
  name: yup.string().required('學校名稱為必填項目').min(2, '學校名稱至少需要2個字元'),
  country: yup.string().required('國家為必填項目'),
  region: yup.string().required('地區為必填項目'),
  schoolType: yup
    .string()
    .oneOf(Object.values(SchoolType), '請選擇有效的學校類型')
    .required('學校類型為必填項目'),
  website: urlSchema,
  relationshipStatus: yup
    .string()
    .oneOf(Object.values(RelationshipStatus), '請選擇有效的關係狀態')
    .required('關係狀態為必填項目'),
})

// Contact validation schema
export const contactSchema = yup.object({
  name: yup.string().required('聯絡人姓名為必填項目').min(2, '姓名至少需要2個字元'),
  email: emailSchema,
  phone: phoneSchema,
  position: yup.string().optional(),
  isPrimary: yup.boolean().required(),
})

// Interaction validation schema
export const interactionSchema = yup.object({
  contactMethod: yup
    .string()
    .oneOf(Object.values(ContactMethod), '請選擇有效的聯繫方式')
    .required('聯繫方式為必填項目'),
  date: yup.date().required('日期為必填項目').max(new Date(), '日期不能是未來時間'),
  notes: yup.string().required('備註為必填項目').min(5, '備註至少需要5個字元'),
  followUpRequired: yup.boolean().required(),
  followUpDate: yup
    .date()
    .optional()
    .when('followUpRequired', {
      is: true,
      then: (schema) => schema.required('需要後續追蹤時，追蹤日期為必填項目').min(new Date(), '追蹤日期必須是未來時間'),
    }),
})

// Partnership validation schema
export const partnershipSchema = yup.object({
  mouStatus: yup
    .string()
    .oneOf(Object.values(MOUStatus), '請選擇有效的MOU狀態')
    .required('MOU狀態為必填項目'),
  mouSignedDate: yup
    .date()
    .optional()
    .when('mouStatus', {
      is: MOUStatus.SIGNED,
      then: (schema) => schema.required('MOU已簽訂時，簽訂日期為必填項目'),
    }),
  mouExpiryDate: yup
    .date()
    .optional()
    .when('mouStatus', {
      is: MOUStatus.SIGNED,
      then: (schema) => schema.required('MOU已簽訂時，到期日期為必填項目').min(new Date(), '到期日期必須是未來時間'),
    }),
  referralCount: yup.number().min(0, '推薦學生數不能為負數').optional(),
  eventsHeld: yup.number().min(0, '舉辦活動次數不能為負數').optional(),
})

// Login validation schema
export const loginSchema = yup.object({
  email: emailSchema,
  password: yup.string().required('密碼為必填項目').min(6, '密碼至少需要6個字元'),
})

// Search validation schema
export const searchSchema = yup.object({
  query: yup.string().optional(),
  country: yup.string().optional(),
  region: yup.string().optional(),
  schoolType: yup.string().oneOf(Object.values(SchoolType)).optional(),
  relationshipStatus: yup.string().oneOf(Object.values(RelationshipStatus)).optional(),
})

// Utility functions for validation
export const validateField = async (schema: yup.Schema, field: string, value: any): Promise<string | null> => {
  try {
    await schema.validateAt(field, { [field]: value })
    return null
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return error.message
    }
    return '驗證錯誤'
  }
}

export const validateForm = async (schema: yup.Schema, data: any): Promise<Record<string, string>> => {
  try {
    await schema.validate(data, { abortEarly: false })
    return {}
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors: Record<string, string> = {}
      error.inner.forEach((err) => {
        if (err.path) {
          errors[err.path] = err.message
        }
      })
      return errors
    }
    return { general: '驗證錯誤' }
  }
}