import crypto from 'crypto';
import { logger } from './logger';

export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 32; // 256 bits

  private encryptionKey: Buffer;

  constructor() {
    // Get encryption key from environment or generate one
    const keyString = process.env.ENCRYPTION_KEY;
    
    if (keyString) {
      this.encryptionKey = Buffer.from(keyString, 'hex');
      if (this.encryptionKey.length !== this.keyLength) {
        throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
      }
    } else {
      // Generate a random key for development (not recommended for production)
      this.encryptionKey = crypto.randomBytes(this.keyLength);
      logger.warn('No ENCRYPTION_KEY provided, using random key. Data will not be recoverable after restart!');
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Combine IV and encrypted data
      const result = iv.toString('hex') + encrypted;
      return result;
    } catch (error) {
      logger.error('加密失敗:', error);
      throw new Error('資料加密失敗');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    try {
      // Extract IV and encrypted data
      const iv = Buffer.from(encryptedData.slice(0, this.ivLength * 2), 'hex');
      const encrypted = encryptedData.slice(this.ivLength * 2);

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('解密失敗:', error);
      throw new Error('資料解密失敗');
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(data: string, salt?: string): { hash: string; salt: string } {
    try {
      const actualSalt = salt || crypto.randomBytes(this.saltLength).toString('hex');
      const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512').toString('hex');
      
      return { hash, salt: actualSalt };
    } catch (error) {
      logger.error('雜湊失敗:', error);
      throw new Error('資料雜湊失敗');
    }
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hash: string, salt: string): boolean {
    try {
      const { hash: computedHash } = this.hash(data, salt);
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
    } catch (error) {
      logger.error('雜湊驗證失敗:', error);
      return false;
    }
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Mask sensitive data for logging/display
   */
  maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (!data || data.length <= visibleChars * 2) {
      return '*'.repeat(data?.length || 8);
    }

    const start = data.slice(0, visibleChars);
    const end = data.slice(-visibleChars);
    const middle = '*'.repeat(Math.max(4, data.length - visibleChars * 2));

    return start + middle + end;
  }

  /**
   * Mask email addresses
   */
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) {
      return '*'.repeat(email?.length || 8);
    }

    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {
      return '*'.repeat(email.length);
    }
    
    const maskedLocal = this.maskSensitiveData(localPart, 2);
    const maskedDomain = this.maskSensitiveData(domain, 2);

    return `${maskedLocal}@${maskedDomain}`;
  }

  /**
   * Mask phone numbers
   */
  maskPhone(phone: string): string {
    if (!phone) {
      return '*'.repeat(8);
    }

    // Remove non-digit characters for processing
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length <= 4) {
      return '*'.repeat(phone.length);
    }

    // Show first 2 and last 2 digits
    const masked = digits.slice(0, 2) + '*'.repeat(Math.max(4, digits.length - 4)) + digits.slice(-2);
    
    // Restore original formatting pattern
    let result = phone;
    let digitIndex = 0;
    
    for (let i = 0; i < phone.length; i++) {
      const char = phone[i];
      if (char && /\d/.test(char)) {
        // Replace with masked digit
        result = result.substring(0, i) + masked[digitIndex] + result.substring(i + 1);
        digitIndex++;
      }
    }

    return result;
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();