import * as fc from 'fast-check';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from '../../src/middleware/auth';
import { UserRepository } from '../../src/repositories/userRepository';
import { AuthService } from '../../src/services/authService';
import { UserRole } from '../../src/types';
import { Pool } from 'pg';

// Mock database pool for testing
const mockPool = {
  query: jest.fn()
} as unknown as Pool;

describe('Data Security Property Tests', () => {
  let userRepository: UserRepository;
  let authService: AuthService;

  beforeEach(() => {
    userRepository = new UserRepository(mockPool);
    authService = new AuthService(userRepository);
    jest.clearAllMocks();
  });

  /**
   * **Feature: recruitment-crm, Property 12: 資料安全性**
   * 對於任何敏感資訊，系統應該使用適當的加密方式保護資料，並在使用者存取時要求身份驗證和記錄存取日誌
   * **Validates: Requirements 7.2, 7.3**
   */
  
  it('should maintain JWT token integrity for any valid user data', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress(),
          role: fc.constantFrom('admin', 'manager', 'recruiter', 'viewer')
        }),
        (userData) => {
          // Generate token
          const token = generateToken(userData);
          
          // Verify token
          const decoded = verifyToken(token);
          
          // Token should preserve user data
          expect(decoded.id).toBe(userData.id);
          expect(decoded.email).toBe(userData.email);
          expect(decoded.role).toBe(userData.role);
          
          // Token should have expiration
          expect(decoded.exp).toBeDefined();
          expect(typeof decoded.exp).toBe('number');
          
          // Token should be issued at a valid time
          expect(decoded.iat).toBeDefined();
          expect(typeof decoded.iat).toBe('number');
          expect(decoded.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any malformed or invalid tokens', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string().filter(s => !s.includes('.')), // Non-JWT format strings
          fc.string({ minLength: 1, maxLength: 10 }), // Too short strings
          fc.constant(''), // Empty string
          fc.constant('invalid.token.here'), // Invalid JWT
          fc.constant('Bearer invalid-token') // Invalid Bearer format
        ),
        (invalidToken) => {
          expect(() => verifyToken(invalidToken)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should properly hash passwords with sufficient entropy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 32 }), // Reduced max length for faster testing
        async (password) => {
          const saltRounds = 10; // Reduced salt rounds for faster testing
          const hash1 = await bcrypt.hash(password, saltRounds);
          const hash2 = await bcrypt.hash(password, saltRounds);
          
          // Same password should produce different hashes (due to salt)
          expect(hash1).not.toBe(hash2);
          
          // Both hashes should verify against original password
          expect(await bcrypt.compare(password, hash1)).toBe(true);
          expect(await bcrypt.compare(password, hash2)).toBe(true);
          
          // Hash should be significantly longer than original password
          expect(hash1.length).toBeGreaterThan(password.length);
          
          // Hash should contain bcrypt format indicators
          expect(hash1).toMatch(/^\$2[aby]\$\d{2}\$/);
        }
      ),
      { numRuns: 10 } // Reduced number of runs for faster testing
    );
  }, 30000); // Increased timeout to 30 seconds

  it('should enforce role-based access control for any user role and action', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(UserRole)),
        fc.constantFrom('read', 'write', 'delete'),
        fc.constantFrom('schools', 'contacts', 'interactions', 'partnerships', 'preferences', 'users'),
        (userRole, action, resource) => {
          const hasPermission = authService.canAccessResource(userRole, action, resource);
          
          // Admin should always have access
          if (userRole === UserRole.ADMIN) {
            expect(hasPermission).toBe(true);
          }
          
          // Viewer should only have read access
          if (userRole === UserRole.VIEWER) {
            if (action === 'read' && resource !== 'users') {
              expect(hasPermission).toBe(true);
            } else {
              expect(hasPermission).toBe(false);
            }
          }
          
          // Recruiter should have read/write but limited delete
          if (userRole === UserRole.RECRUITER) {
            if (action === 'read' && resource !== 'users') {
              expect(hasPermission).toBe(true);
            } else if (action === 'write' && resource !== 'users') {
              expect(hasPermission).toBe(true);
            } else if (action === 'delete' && resource === 'interactions') {
              expect(hasPermission).toBe(true);
            } else {
              expect(hasPermission).toBe(false);
            }
          }
          
          // Manager should have broader access but not user management
          if (userRole === UserRole.MANAGER) {
            if (resource === 'users' && action !== 'read') {
              expect(hasPermission).toBe(false);
            } else {
              expect(hasPermission).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain role hierarchy consistency', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(UserRole)),
        fc.constantFrom(...Object.values(UserRole)),
        (userRole, requiredRole) => {
          const hasPermission = authService.hasPermission(userRole, requiredRole);
          
          // Define expected hierarchy
          const hierarchy = {
            [UserRole.VIEWER]: 1,
            [UserRole.RECRUITER]: 2,
            [UserRole.MANAGER]: 3,
            [UserRole.ADMIN]: 4
          };
          
          const expectedResult = hierarchy[userRole] >= hierarchy[requiredRole];
          expect(hasPermission).toBe(expectedResult);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ensure access logging captures essential security information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.boolean(),
        async (action, success) => {
          // Mock the database query to capture the logged data
          const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
          (mockPool.query as jest.Mock) = mockQuery;
          
          const accessLogData = {
            action,
            success,
            userId: 'test-user-id',
            resource: '/api/test',
            ipAddress: '192.168.1.1',
            userAgent: 'test-agent'
          };
          
          await userRepository.logAccess(accessLogData);
          
          // Verify that logging was attempted with correct parameters
          expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO access_logs'),
            expect.arrayContaining([
              'test-user-id',
              action,
              '/api/test',
              '192.168.1.1',
              'test-agent',
              success,
              undefined
            ])
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});