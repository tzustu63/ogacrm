import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { AuthenticatedRequest } from '../middleware/auth';
import { LoginRequest, CreateUserRequest, UserRole } from '../types';
import { logger } from '../utils/logger';
import { secureConfig } from '../utils/secureConfig';
import Joi from 'joi';

export class AuthController {
  constructor(private authService: AuthService) {}

  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const schema = Joi.object({
        email: Joi.string().email().required().messages({
          'string.email': '請輸入有效的電郵地址',
          'any.required': '電郵地址為必填項目'
        }),
        password: Joi.string().min(6).required().messages({
          'string.min': '密碼至少需要6個字符',
          'any.required': '密碼為必填項目'
        })
      });

      const { error, value } = schema.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details?.[0]?.message || '驗證失敗',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const loginData: LoginRequest = value;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await this.authService.login(loginData, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('登入控制器錯誤:', error);
      
      res.status(401).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: error instanceof Error ? error.message : '登入失敗',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: '無效的認證令牌',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const token = authHeader.substring(7);
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      await this.authService.logout(token, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        data: { message: '登出成功' }
      });
    } catch (error) {
      logger.error('登出控制器錯誤:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message: '登出失敗',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const config = secureConfig.getConfig();
      
      // Validate request body
      const schema = Joi.object({
        email: Joi.string().email().required().messages({
          'string.email': '請輸入有效的電郵地址',
          'any.required': '電郵地址為必填項目'
        }),
        password: Joi.string().min(config.passwordMinLength).required().messages({
          'string.min': `密碼至少需要${config.passwordMinLength}個字符`,
          'any.required': '密碼為必填項目'
        }),
        name: Joi.string().min(2).max(100).required().messages({
          'string.min': '姓名至少需要2個字符',
          'string.max': '姓名不能超過100個字符',
          'any.required': '姓名為必填項目'
        }),
        role: Joi.string().valid(...Object.values(UserRole)).required().messages({
          'any.only': '無效的使用者角色',
          'any.required': '使用者角色為必填項目'
        })
      });

      const { error, value } = schema.validate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details?.[0]?.message || '驗證失敗',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Additional password validation using secure config
      const passwordValidation = secureConfig.validatePassword(value.password);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PASSWORD_VALIDATION_ERROR',
            message: passwordValidation.errors.join(', '),
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const userData: CreateUserRequest = value;
      const createdBy = req.user?.id;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const user = await this.authService.createUser(userData, createdBy, ipAddress, userAgent);

      res.status(201).json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('建立使用者控制器錯誤:', error);
      
      const statusCode = error instanceof Error && error.message.includes('已被使用') ? 409 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: {
          code: 'CREATE_USER_FAILED',
          message: error instanceof Error ? error.message : '建立使用者失敗',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未認證的使用者',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: req.user
      });
    } catch (error) {
      logger.error('取得當前使用者控制器錯誤:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_USER_FAILED',
          message: '取得使用者資訊失敗',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async revokeUserSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_USER_ID',
            message: '缺少使用者ID',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const adminId = req.user?.id;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      await this.authService.revokeAllUserSessions(userId, adminId, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        data: { message: '使用者所有會話已撤銷' }
      });
    } catch (error) {
      logger.error('撤銷使用者會話控制器錯誤:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'REVOKE_SESSIONS_FAILED',
          message: '撤銷會話失敗',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}