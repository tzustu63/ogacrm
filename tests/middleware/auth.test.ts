import { Request, Response, NextFunction } from 'express';
import { authMiddleware, generateToken, verifyToken, AuthenticatedRequest } from '../../src/middleware/auth';
import { createTestUser } from '../utils/testHelpers';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    Object.defineProperty(mockRequest, 'path', {
      value: '/api/test',
      writable: true,
      configurable: true
    });
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const user = createTestUser();
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const user = createTestUser();
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      
      const decoded = verifyToken(token);
      expect(decoded.id).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow('無效的認證令牌');
    });
  });

  describe('authMiddleware', () => {
    it('should skip authentication for health check endpoint', () => {
      Object.defineProperty(mockRequest, 'path', { value: '/health', writable: true });
      
      authMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should skip authentication for auth endpoints', () => {
      Object.defineProperty(mockRequest, 'path', { value: '/api/auth/login', writable: true });
      
      authMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no authorization header is provided', () => {
      authMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '缺少認證令牌',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', () => {
      mockRequest.headers = { authorization: 'Basic token' };
      
      authMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      
      authMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: '無效的認證令牌',
          timestamp: expect.any(String)
        }
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should authenticate valid token and set user in request', () => {
      const user = createTestUser();
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      mockRequest.headers = { authorization: `Bearer ${token}` };
      
      authMiddleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);
      
      expect(mockRequest.user).toEqual({
        id: user.id,
        email: user.email,
        role: user.role
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});