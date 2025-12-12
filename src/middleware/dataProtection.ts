import { Request, Response, NextFunction } from 'express';
import { encryptionService } from '../utils/encryption';
import { logger } from '../utils/logger';

export interface ProtectedRequest extends Request {
  sensitiveData?: {
    encrypt: (data: string) => string;
    decrypt: (data: string) => string;
    mask: (data: string, type?: 'email' | 'phone' | 'general') => string;
  };
}

/**
 * Middleware to inject data protection utilities into request
 */
export function dataProtectionMiddleware(req: ProtectedRequest, res: Response, next: NextFunction): void {
  req.sensitiveData = {
    encrypt: (data: string) => encryptionService.encrypt(data),
    decrypt: (data: string) => encryptionService.decrypt(data),
    mask: (data: string, type: 'email' | 'phone' | 'general' = 'general') => {
      switch (type) {
        case 'email':
          return encryptionService.maskEmail(data);
        case 'phone':
          return encryptionService.maskPhone(data);
        default:
          return encryptionService.maskSensitiveData(data);
      }
    }
  };

  next();
}

/**
 * Middleware to sanitize response data by masking sensitive information
 */
export function sanitizeResponseMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalSend = res.send;

  res.send = function(body: any) {
    if (body && typeof body === 'object') {
      const sanitizedBody = sanitizeSensitiveData(body);
      return originalSend.call(this, sanitizedBody);
    }
    return originalSend.call(this, body);
  };

  next();
}

/**
 * Recursively sanitize sensitive data in objects
 */
function sanitizeSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeSensitiveData(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip sanitization for success responses and metadata
      if (key === 'success' || key === 'pagination' || key === 'timestamp') {
        sanitized[key] = value;
        continue;
      }

      // Identify sensitive fields and mask them
      if (isSensitiveField(key)) {
        if (typeof value === 'string') {
          sanitized[key] = maskFieldValue(key, value);
        } else {
          sanitized[key] = value; // Keep non-string values as is
        }
      } else {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeSensitiveData(value);
      }
    }
    
    return sanitized;
  }

  return obj;
}

/**
 * Check if a field contains sensitive information
 */
function isSensitiveField(fieldName: string): boolean {
  const sensitiveFields = [
    'password',
    'passwordHash',
    'password_hash',
    'token',
    'secret',
    'key',
    'phone',
    'email',
    'address',
    'notes', // May contain sensitive information
    'specialRequirements' // May contain sensitive information
  ];

  const lowerFieldName = fieldName.toLowerCase();
  return sensitiveFields.some(sensitive => lowerFieldName.includes(sensitive));
}

/**
 * Mask field value based on field type
 */
function maskFieldValue(fieldName: string, value: string): string {
  const lowerFieldName = fieldName.toLowerCase();

  if (lowerFieldName.includes('email')) {
    return encryptionService.maskEmail(value);
  }

  if (lowerFieldName.includes('phone')) {
    return encryptionService.maskPhone(value);
  }

  if (lowerFieldName.includes('password') || lowerFieldName.includes('token') || lowerFieldName.includes('secret')) {
    return '*'.repeat(8); // Completely hide passwords and tokens
  }

  // For other sensitive fields, use general masking
  return encryptionService.maskSensitiveData(value, 2);
}

/**
 * Middleware to enforce HTTPS in production
 */
export function enforceHTTPS(req: Request, res: Response, next: NextFunction): void {
  // 在容器或本機開發環境允許 HTTP，避免反向代理未設置 X-Forwarded-Proto 時被擋下
  const skipEnforce =
    process.env.DOCKER_ENV === 'true' ||
    process.env.SKIP_HTTPS_ENFORCE === 'true' ||
    process.env.NODE_ENV !== 'production';

  if (skipEnforce) {
    return next();
  }

  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    logger.warn(`不安全的HTTP請求被拒絕: ${req.method} ${req.originalUrl} from ${req.ip}`);
    
    res.status(426).json({
      success: false,
      error: {
        code: 'HTTPS_REQUIRED',
        message: '此服務需要HTTPS連線',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  next();
}

/**
 * Middleware to add security headers
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict transport security (HTTPS only)
  if (req.secure || req.get('x-forwarded-proto') === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';");
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
}

/**
 * Rate limiting middleware for sensitive operations
 */
export function rateLimitSensitiveOperations(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of attempts.entries()) {
      if (now > value.resetTime) {
        attempts.delete(key);
      }
    }
    
    const clientAttempts = attempts.get(clientId);
    
    if (!clientAttempts) {
      attempts.set(clientId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    
    if (clientAttempts.count >= maxAttempts) {
      logger.warn(`速率限制觸發: ${clientId} 嘗試次數過多`);
      
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '請求過於頻繁，請稍後再試',
          timestamp: new Date().toISOString(),
          retryAfter: Math.ceil((clientAttempts.resetTime - now) / 1000)
        }
      });
      return;
    }
    
    clientAttempts.count++;
    next();
  };
}