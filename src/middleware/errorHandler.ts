import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
  };
}

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = '內部伺服器錯誤';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = '資料驗證失敗';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = '無效的ID格式';
  }

  // Log error details
  logger.error('API錯誤:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date()
    }
  };

  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = {
      stack: error.stack,
      originalMessage: error.message
    };
  }

  res.status(statusCode).json(errorResponse);
}