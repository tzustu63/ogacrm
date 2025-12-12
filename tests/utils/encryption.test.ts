import { EncryptionService } from '../../src/utils/encryption';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    // Set a test encryption key
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    encryptionService = new EncryptionService();
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const plaintext = 'sensitive data';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(plaintext.length);
    });

    it('should produce different encrypted values for same input', () => {
      const plaintext = 'test data';
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(encryptionService.decrypt(encrypted1)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '測試中文字符 🔒 émojis';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('hash and verifyHash', () => {
    it('should hash data with salt', () => {
      const data = 'password123';
      const result = encryptionService.hash(data);

      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.hash.length).toBeGreaterThan(0);
      expect(result.salt.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for same data', () => {
      const data = 'password123';
      const result1 = encryptionService.hash(data);
      const result2 = encryptionService.hash(data);

      expect(result1.hash).not.toBe(result2.hash);
      expect(result1.salt).not.toBe(result2.salt);
    });

    it('should verify hash correctly', () => {
      const data = 'password123';
      const { hash, salt } = encryptionService.hash(data);

      expect(encryptionService.verifyHash(data, hash, salt)).toBe(true);
      expect(encryptionService.verifyHash('wrong-password', hash, salt)).toBe(false);
    });

    it('should use provided salt', () => {
      const data = 'password123';
      const customSalt = 'custom-salt-value';
      const result1 = encryptionService.hash(data, customSalt);
      const result2 = encryptionService.hash(data, customSalt);

      expect(result1.salt).toBe(customSalt);
      expect(result2.salt).toBe(customSalt);
      expect(result1.hash).toBe(result2.hash); // Same salt should produce same hash
    });
  });

  describe('generateSecureToken', () => {
    it('should generate secure tokens', () => {
      const token1 = encryptionService.generateSecureToken();
      const token2 = encryptionService.generateSecureToken();

      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes in hex
      expect(token2.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(token1)).toBe(true); // Hex format
    });

    it('should generate tokens of specified length', () => {
      const token = encryptionService.generateSecureToken(16);
      expect(token.length).toBe(32); // 16 bytes in hex
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask data correctly', () => {
      const data = 'sensitive-information';
      const masked = encryptionService.maskSensitiveData(data);

      expect(masked).toContain('sens');
      expect(masked).toContain('tion');
      expect(masked).toContain('*');
      expect(masked.length).toBe(data.length);
    });

    it('should handle short data', () => {
      const data = 'abc';
      const masked = encryptionService.maskSensitiveData(data);

      expect(masked).toBe('***');
    });

    it('should handle custom visible characters', () => {
      const data = 'test-data-here';
      const masked = encryptionService.maskSensitiveData(data, 2);

      expect(masked).toContain('te');
      expect(masked).toContain('re');
      expect(masked).toContain('*');
    });
  });

  describe('maskEmail', () => {
    it('should mask email addresses', () => {
      const email = 'user@example.com';
      const masked = encryptionService.maskEmail(email);

      expect(masked).toContain('@');
      expect(masked).toContain('*');
      expect(masked.length).toBe(email.length);
      // The masking should preserve the @ symbol and mask sensitive parts
      expect(masked.indexOf('@')).toBeGreaterThan(0);
      expect(masked.indexOf('@')).toBeLessThan(masked.length - 1);
    });

    it('should handle invalid emails', () => {
      const invalidEmail = 'not-an-email';
      const masked = encryptionService.maskEmail(invalidEmail);

      expect(masked).toMatch(/^\*+$/);
    });

    it('should handle empty email', () => {
      const masked = encryptionService.maskEmail('');
      expect(masked).toMatch(/^\*+$/);
    });
  });

  describe('maskPhone', () => {
    it('should mask phone numbers', () => {
      const phone = '+1-234-567-8900';
      const masked = encryptionService.maskPhone(phone);

      expect(masked).toContain('*');
      expect(masked.length).toBe(phone.length);
      // Should preserve formatting and show first 2 and last 2 digits
      expect(masked.endsWith('00')).toBe(true);
    });

    it('should handle phone without formatting', () => {
      const phone = '1234567890';
      const masked = encryptionService.maskPhone(phone);

      expect(masked).toContain('12');
      expect(masked).toContain('90');
      expect(masked).toContain('*');
    });

    it('should handle short phone numbers', () => {
      const phone = '123';
      const masked = encryptionService.maskPhone(phone);

      expect(masked).toMatch(/^\*+$/);
    });

    it('should handle empty phone', () => {
      const masked = encryptionService.maskPhone('');
      expect(masked).toMatch(/^\*+$/);
    });
  });
});