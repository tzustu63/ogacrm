import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

import { secureConfig } from '../utils/secureConfig';

const config = secureConfig.getConfig();

export function generateToken(payload: { id: string; email: string; role: string }): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    throw new Error('無效的認證令牌');
  }
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Skip authentication for health check and public endpoints
  if (req.path === '/health' || req.path.startsWith('/api/auth')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '缺少認證令牌',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = verifyToken(token);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    
    logger.info(`使用者認證成功: ${decoded.email}`);
    next();
  } catch (error) {
    logger.warn(`認證失敗: ${error}`);
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: '無效的認證令牌',
        timestamp: new Date().toISOString()
      }
    });
  }
}