import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { UserRole } from '../types';
import { AuthService } from '../services/authService';
import { logger } from '../utils/logger';

export interface AuthorizedRequest extends AuthenticatedRequest {
  authService?: AuthService;
}

export function requireRole(requiredRole: UserRole) {
  return (req: AuthorizedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '需要認證',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const authService = req.authService || new AuthService(req.app.locals.userRepository);
    
    if (!authService.hasPermission(req.user.role as UserRole, requiredRole)) {
      logger.warn(`權限不足: 使用者 ${req.user.email} (${req.user.role}) 嘗試存取需要 ${requiredRole} 權限的資源`);
      
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '權限不足',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
}

export function requirePermission(action: string, resource?: string) {
  return (req: AuthorizedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '需要認證',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const authService = req.authService || new AuthService(req.app.locals.userRepository);
    
    if (!authService.canAccessResource(req.user.role as UserRole, action, resource)) {
      logger.warn(`權限不足: 使用者 ${req.user.email} (${req.user.role}) 嘗試執行 ${action} 操作於 ${resource || '未指定資源'}`);
      
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '權限不足',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
}

export function logAccess(action: string, getResource?: (req: AuthorizedRequest) => string) {
  return async (req: AuthorizedRequest, res: Response, next: NextFunction): Promise<void> => {
    const originalSend = res.send;
    let responseBody: any;
    
    // Capture response
    res.send = function(body: any) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Continue with request
    next();

    // Log after response is sent
    res.on('finish', async () => {
      try {
        const resource = getResource ? getResource(req) : req.originalUrl;
        const success = res.statusCode < 400;
        const errorMessage = success ? undefined : (
          responseBody && typeof responseBody === 'object' && responseBody.error 
            ? responseBody.error.message 
            : `HTTP ${res.statusCode}`
        );

        const authService = req.authService || new AuthService(req.app.locals.userRepository);
        
        if (req.app.locals.userRepository) {
          await req.app.locals.userRepository.logAccess({
            userId: req.user?.id,
            action,
            resource,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            success,
            errorMessage
          });
        }
      } catch (error) {
        logger.error('記錄存取日誌失敗:', error);
      }
    });
  };
}

// Middleware to inject AuthService into request
export function injectAuthService(authService: AuthService) {
  return (req: AuthorizedRequest, res: Response, next: NextFunction): void => {
    req.authService = authService;
    next();
  };
}