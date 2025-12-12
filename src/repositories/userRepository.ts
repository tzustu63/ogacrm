import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { User, UserRole, CreateUserRequest, AccessLog, UserSession } from '../types';
import { logger } from '../utils/logger';
import { secureConfig } from '../utils/secureConfig';

export class UserRepository {
  constructor(private db: Pool) {}

  async createUser(userData: CreateUserRequest): Promise<User> {
    const { email, password, name, role } = userData;
    
    // Hash password
    const config = secureConfig.getConfig();
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

    const query = `
      INSERT INTO users (email, password_hash, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, role, is_active, last_login, created_at, updated_at
    `;

    try {
      const result = await this.db.query(query, [email, passwordHash, name, role]);
      const user = result.rows[0];
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error('建立使用者失敗:', error);
      throw new Error('建立使用者失敗');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, name, role, is_active, last_login, created_at, updated_at
      FROM users 
      WHERE email = $1 AND is_active = true
    `;

    try {
      const result = await this.db.query(query, [email]);
      if (result.rows.length === 0) return null;

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error('查詢使用者失敗:', error);
      throw new Error('查詢使用者失敗');
    }
  }

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, name, role, is_active, last_login, created_at, updated_at
      FROM users 
      WHERE id = $1 AND is_active = true
    `;

    try {
      const result = await this.db.query(query, [id]);
      if (result.rows.length === 0) return null;

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error('查詢使用者失敗:', error);
      throw new Error('查詢使用者失敗');
    }
  }

  async validatePassword(email: string, password: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash, name, role, is_active, last_login, created_at, updated_at
      FROM users 
      WHERE email = $1 AND is_active = true
    `;

    try {
      const result = await this.db.query(query, [email]);
      if (result.rows.length === 0) return null;

      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      logger.error('驗證密碼失敗:', error);
      throw new Error('驗證密碼失敗');
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    const query = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;

    try {
      await this.db.query(query, [userId]);
    } catch (error) {
      logger.error('更新最後登入時間失敗:', error);
      // Don't throw error for this non-critical operation
    }
  }

  async logAccess(logData: Omit<AccessLog, 'id' | 'createdAt'>): Promise<void> {
    const query = `
      INSERT INTO access_logs (user_id, action, resource, ip_address, user_agent, success, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    try {
      await this.db.query(query, [
        logData.userId,
        logData.action,
        logData.resource,
        logData.ipAddress,
        logData.userAgent,
        logData.success,
        logData.errorMessage
      ]);
    } catch (error) {
      logger.error('記錄存取日誌失敗:', error);
      // Don't throw error for logging failures
    }
  }

  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<UserSession> {
    const query = `
      INSERT INTO user_sessions (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, token_hash, expires_at, is_revoked, created_at
    `;

    try {
      const result = await this.db.query(query, [userId, tokenHash, expiresAt]);
      const session = result.rows[0];
      
      return {
        id: session.id,
        userId: session.user_id,
        tokenHash: session.token_hash,
        expiresAt: session.expires_at,
        isRevoked: session.is_revoked,
        createdAt: session.created_at
      };
    } catch (error) {
      logger.error('建立會話失敗:', error);
      throw new Error('建立會話失敗');
    }
  }

  async findSessionByTokenHash(tokenHash: string): Promise<UserSession | null> {
    const query = `
      SELECT id, user_id, token_hash, expires_at, is_revoked, created_at
      FROM user_sessions 
      WHERE token_hash = $1 AND is_revoked = false AND expires_at > CURRENT_TIMESTAMP
    `;

    try {
      const result = await this.db.query(query, [tokenHash]);
      if (result.rows.length === 0) return null;

      const session = result.rows[0];
      return {
        id: session.id,
        userId: session.user_id,
        tokenHash: session.token_hash,
        expiresAt: session.expires_at,
        isRevoked: session.is_revoked,
        createdAt: session.created_at
      };
    } catch (error) {
      logger.error('查詢會話失敗:', error);
      throw new Error('查詢會話失敗');
    }
  }

  async revokeSession(tokenHash: string): Promise<void> {
    const query = `
      UPDATE user_sessions 
      SET is_revoked = true 
      WHERE token_hash = $1
    `;

    try {
      await this.db.query(query, [tokenHash]);
    } catch (error) {
      logger.error('撤銷會話失敗:', error);
      throw new Error('撤銷會話失敗');
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const query = `
      UPDATE user_sessions 
      SET is_revoked = true 
      WHERE user_id = $1 AND is_revoked = false
    `;

    try {
      await this.db.query(query, [userId]);
    } catch (error) {
      logger.error('撤銷使用者所有會話失敗:', error);
      throw new Error('撤銷使用者所有會話失敗');
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    const query = `
      DELETE FROM user_sessions 
      WHERE expires_at < CURRENT_TIMESTAMP OR is_revoked = true
    `;

    try {
      await this.db.query(query);
    } catch (error) {
      logger.error('清理過期會話失敗:', error);
      // Don't throw error for cleanup operations
    }
  }
}