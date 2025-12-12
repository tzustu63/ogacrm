import crypto from 'crypto';
import { UserRepository } from '../repositories/userRepository';
import { generateToken, verifyToken } from '../middleware/auth';
import { User, LoginRequest, LoginResponse, CreateUserRequest, UserRole, AccessLog } from '../types';
import { logger } from '../utils/logger';

export class AuthService {
  constructor(private userRepository: UserRepository) {}

  async login(loginData: LoginRequest, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    const { email, password } = loginData;

    try {
      // Validate user credentials
      const user = await this.userRepository.validatePassword(email, password);
      
      if (!user) {
        // Log failed login attempt
        const logData: Omit<AccessLog, 'id' | 'createdAt'> = {
          action: 'login',
          resource: '/api/auth/login',
          success: false,
          errorMessage: '無效的電郵或密碼'
        };
        if (ipAddress) logData.ipAddress = ipAddress;
        if (userAgent) logData.userAgent = userAgent;
        
        await this.userRepository.logAccess(logData);
        
        throw new Error('無效的電郵或密碼');
      }

      // Generate JWT token
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role
      };
      
      const token = generateToken(tokenPayload);
      
      // Create token hash for session management
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Calculate expiration date (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      // Create session record
      await this.userRepository.createSession(user.id, tokenHash, expiresAt);
      
      // Update last login time
      await this.userRepository.updateLastLogin(user.id);
      
      // Log successful login
      const logData: Omit<AccessLog, 'id' | 'createdAt'> = {
        userId: user.id,
        action: 'login',
        resource: '/api/auth/login',
        success: true
      };
      if (ipAddress) logData.ipAddress = ipAddress;
      if (userAgent) logData.userAgent = userAgent;
      
      await this.userRepository.logAccess(logData);

      logger.info(`使用者登入成功: ${user.email}`);

      return {
        user,
        token,
        expiresAt
      };
    } catch (error) {
      logger.error('登入失敗:', error);
      throw error;
    }
  }

  async logout(token: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      // Extract user info from token
      const decoded = verifyToken(token);
      
      // Create token hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Revoke session
      await this.userRepository.revokeSession(tokenHash);
      
      // Log logout
      const logData: Omit<AccessLog, 'id' | 'createdAt'> = {
        userId: decoded.id,
        action: 'logout',
        resource: '/api/auth/logout',
        success: true
      };
      if (ipAddress) logData.ipAddress = ipAddress;
      if (userAgent) logData.userAgent = userAgent;
      
      await this.userRepository.logAccess(logData);

      logger.info(`使用者登出成功: ${decoded.email}`);
    } catch (error) {
      logger.error('登出失敗:', error);
      throw new Error('登出失敗');
    }
  }

  async validateSession(token: string): Promise<User | null> {
    try {
      // Verify JWT token
      const decoded = verifyToken(token);
      
      // Create token hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Check if session exists and is valid
      const session = await this.userRepository.findSessionByTokenHash(tokenHash);
      
      if (!session) {
        return null;
      }
      
      // Get user details
      const user = await this.userRepository.findById(decoded.id);
      
      return user;
    } catch (error) {
      logger.warn('會話驗證失敗:', error);
      return null;
    }
  }

  async createUser(userData: CreateUserRequest, createdBy?: string, ipAddress?: string, userAgent?: string): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(userData.email);
      
      if (existingUser) {
        throw new Error('電郵地址已被使用');
      }

      // Create user
      const user = await this.userRepository.createUser(userData);
      
      // Log user creation
      const logData: Omit<AccessLog, 'id' | 'createdAt'> = {
        action: 'create_user',
        resource: `/api/users/${user.id}`,
        success: true
      };
      if (createdBy) logData.userId = createdBy;
      if (ipAddress) logData.ipAddress = ipAddress;
      if (userAgent) logData.userAgent = userAgent;
      
      await this.userRepository.logAccess(logData);

      logger.info(`新使用者建立成功: ${user.email} by ${createdBy || 'system'}`);

      return user;
    } catch (error) {
      logger.error('建立使用者失敗:', error);
      
      // Log failed user creation
      const logData: Omit<AccessLog, 'id' | 'createdAt'> = {
        action: 'create_user',
        resource: '/api/users',
        success: false,
        errorMessage: error instanceof Error ? error.message : '未知錯誤'
      };
      if (createdBy) logData.userId = createdBy;
      if (ipAddress) logData.ipAddress = ipAddress;
      if (userAgent) logData.userAgent = userAgent;
      
      await this.userRepository.logAccess(logData);
      
      throw error;
    }
  }

  async revokeAllUserSessions(userId: string, adminId?: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      await this.userRepository.revokeAllUserSessions(userId);
      
      // Log session revocation
      const logData: Omit<AccessLog, 'id' | 'createdAt'> = {
        action: 'revoke_all_sessions',
        resource: `/api/users/${userId}/sessions`,
        success: true
      };
      if (adminId) logData.userId = adminId;
      if (ipAddress) logData.ipAddress = ipAddress;
      if (userAgent) logData.userAgent = userAgent;
      
      await this.userRepository.logAccess(logData);

      logger.info(`使用者所有會話已撤銷: ${userId} by ${adminId || 'system'}`);
    } catch (error) {
      logger.error('撤銷使用者會話失敗:', error);
      throw error;
    }
  }

  hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.VIEWER]: 1,
      [UserRole.RECRUITER]: 2,
      [UserRole.MANAGER]: 3,
      [UserRole.ADMIN]: 4
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  canAccessResource(userRole: UserRole, action: string, resource?: string): boolean {
    // Define permission matrix
    const permissions: Record<UserRole, Record<string, string[]>> = {
      [UserRole.VIEWER]: {
        read: ['schools', 'contacts', 'interactions', 'partnerships', 'preferences'],
        write: [],
        delete: []
      },
      [UserRole.RECRUITER]: {
        read: ['schools', 'contacts', 'interactions', 'partnerships', 'preferences'],
        write: ['schools', 'contacts', 'interactions', 'partnerships', 'preferences'],
        delete: ['interactions']
      },
      [UserRole.MANAGER]: {
        read: ['schools', 'contacts', 'interactions', 'partnerships', 'preferences', 'users'],
        write: ['schools', 'contacts', 'interactions', 'partnerships', 'preferences'],
        delete: ['schools', 'contacts', 'interactions', 'partnerships', 'preferences']
      },
      [UserRole.ADMIN]: {
        read: ['*'],
        write: ['*'],
        delete: ['*']
      }
    };

    const userPermissions = permissions[userRole];
    
    if (!userPermissions) return false;

    // Admin has access to everything
    if (userRole === UserRole.ADMIN) return true;

    // Check specific permissions
    const actionPermissions = userPermissions[action];
    
    if (!actionPermissions) return false;

    // If no specific resource, check if user has any permission for this action
    if (!resource) return actionPermissions.length > 0;

    // Check if user has permission for this specific resource
    return actionPermissions.includes('*') || actionPermissions.includes(resource);
  }
}