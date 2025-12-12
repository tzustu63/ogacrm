import { logger } from './logger';

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  encryptionKey: string;
  bcryptRounds: number;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
}

export class SecureConfigManager {
  private config: SecurityConfig;

  constructor() {
    this.config = this.loadSecurityConfig();
    this.validateConfig();
  }

  private loadSecurityConfig(): SecurityConfig {
    return {
      jwtSecret: this.getRequiredEnvVar('JWT_SECRET'),
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      encryptionKey: this.getRequiredEnvVar('ENCRYPTION_KEY'),
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400'), // 24 hours in seconds
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
      lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900'), // 15 minutes in seconds
      passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
      passwordRequireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
      passwordRequireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
      passwordRequireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
      passwordRequireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS === 'true'
    };
  }

  private getRequiredEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`必需的環境變數 ${name} 未設定`);
      } else {
        // Generate a warning and use a default value for development
        logger.warn(`環境變數 ${name} 未設定，使用預設值（僅限開發環境）`);
        return this.generateDefaultValue(name);
      }
    }
    return value;
  }

  private generateDefaultValue(name: string): string {
    switch (name) {
      case 'JWT_SECRET':
        return 'dev-jwt-secret-change-in-production';
      case 'ENCRYPTION_KEY':
        return 'a'.repeat(64); // 32 bytes in hex
      default:
        return 'default-value';
    }
  }

  private validateConfig(): void {
    const errors: string[] = [];

    // Validate JWT secret strength
    if (this.config.jwtSecret.length < 32) {
      errors.push('JWT_SECRET 應至少32個字符');
    }

    // Validate encryption key
    if (this.config.encryptionKey.length !== 64) {
      errors.push('ENCRYPTION_KEY 必須是64個十六進制字符（32字節）');
    }

    // Validate bcrypt rounds
    if (this.config.bcryptRounds < 10 || this.config.bcryptRounds > 15) {
      errors.push('BCRYPT_ROUNDS 應在10-15之間');
    }

    // Validate password requirements
    if (this.config.passwordMinLength < 8) {
      errors.push('PASSWORD_MIN_LENGTH 應至少為8');
    }

    // In production, enforce stricter requirements
    if (process.env.NODE_ENV === 'production') {
      if (this.config.jwtSecret === 'dev-jwt-secret-change-in-production') {
        errors.push('生產環境必須設定安全的JWT_SECRET');
      }

      if (this.config.encryptionKey === 'a'.repeat(64)) {
        errors.push('生產環境必須設定安全的ENCRYPTION_KEY');
      }

      if (this.config.bcryptRounds < 12) {
        errors.push('生產環境BCRYPT_ROUNDS應至少為12');
      }
    }

    if (errors.length > 0) {
      const errorMessage = '安全配置驗證失敗:\n' + errors.join('\n');
      // Use console.error to ensure error is visible
      console.error('[SECURE_CONFIG ERROR]', errorMessage);
      logger.error(errorMessage);
      
      // Don't throw in Docker environment, just log warning
      if (process.env.NODE_ENV === 'production' && !process.env.DOCKER_ENV) {
        throw new Error(errorMessage);
      } else {
        console.warn('[SECURE_CONFIG] Continuing despite validation warnings (Docker environment)');
      }
    }
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.config.passwordMinLength) {
      errors.push(`密碼至少需要${this.config.passwordMinLength}個字符`);
    }

    if (this.config.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      errors.push('密碼必須包含大寫字母');
    }

    if (this.config.passwordRequireLowercase && !/[a-z]/.test(password)) {
      errors.push('密碼必須包含小寫字母');
    }

    if (this.config.passwordRequireNumbers && !/\d/.test(password)) {
      errors.push('密碼必須包含數字');
    }

    if (this.config.passwordRequireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('密碼必須包含特殊符號');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isSecureEnvironment(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
    };
  }
}

// Singleton instance
export const secureConfig = new SecureConfigManager();