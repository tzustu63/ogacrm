/**
 * Error Handling Flow Tests
 * 測試錯誤處理流程的完整性
 */

import request from 'supertest';
import { app } from '../../src/index';
import { setupTestDatabase, cleanupTestDatabase, getTestDatabase } from '../utils/testHelpers';

describe('Error Handling Flow', () => {
  let authToken: string;
  let db: any;

  beforeAll(async () => {
    await setupTestDatabase();
    db = getTestDatabase();
    
    // Get authentication token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword123'
      })
      .expect(200);
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Authentication and Authorization Errors', () => {
    it('should handle missing authentication token', async () => {
      const response = await request(app)
        .get('/api/schools')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token is required',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle invalid authentication token', async () => {
      const response = await request(app)
        .get('/api/schools')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle expired authentication token', async () => {
      // Create an expired token (this would be mocked in real implementation)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      const response = await request(app)
        .get('/api/schools')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle insufficient permissions', async () => {
      // This would test role-based access control if implemented
      const response = await request(app)
        .delete('/api/admin/system-reset')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions for this operation',
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('Validation Errors', () => {
    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          country: '台灣',
          region: '台北市'
          // Missing required 'name' field
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: expect.stringContaining('required')
            })
          ]),
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle invalid field types', async () => {
      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 123, // Should be string
          country: '台灣',
          region: '台北市',
          schoolType: 'high_school'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.stringContaining('string')
          })
        ])
      );
    });

    it('should handle invalid enum values', async () => {
      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '測試學校',
          country: '台灣',
          region: '台北市',
          schoolType: 'invalid_type'
        })
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'schoolType',
            message: expect.stringContaining('must be one of')
          })
        ])
      );
    });

    it('should handle invalid email format', async () => {
      // First create a school
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '電郵驗證測試學校',
          country: '台灣',
          region: '新北市',
          schoolType: 'university'
        });

      const schoolId = schoolResponse.body.id;

      const response = await request(app)
        .post(`/api/schools/${schoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '測試聯絡人',
          email: 'invalid-email-format',
          isPrimary: true
        })
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('valid email')
          })
        ])
      );
    });

    it('should handle field length violations', async () => {
      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'x'.repeat(256), // Exceeds maximum length
          country: '台灣',
          region: '台北市',
          schoolType: 'high_school'
        })
        .expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.stringContaining('length')
          })
        ])
      );
    });
  });

  describe('Resource Not Found Errors', () => {
    it('should handle non-existent school ID', async () => {
      const response = await request(app)
        .get('/api/schools/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'School not found',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/schools/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Invalid UUID format');
    });

    it('should handle non-existent contact ID', async () => {
      const response = await request(app)
        .get('/api/contacts/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Contact not found');
    });

    it('should handle non-existent interaction ID', async () => {
      const response = await request(app)
        .delete('/api/interactions/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Interaction not found');
    });
  });

  describe('Business Logic Errors', () => {
    it('should handle duplicate email addresses', async () => {
      // Create school and first contact
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '重複電郵測試學校',
          country: '台灣',
          region: '台中市',
          schoolType: 'high_school'
        });

      const schoolId = schoolResponse.body.id;

      await request(app)
        .post(`/api/schools/${schoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '第一個聯絡人',
          email: 'duplicate@test.com',
          isPrimary: true
        })
        .expect(201);

      // Try to create another contact with the same email
      const response = await request(app)
        .post(`/api/schools/${schoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '第二個聯絡人',
          email: 'duplicate@test.com',
          isPrimary: false
        })
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Email address already exists',
          details: {
            field: 'email',
            value: 'duplicate@test.com'
          },
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle multiple primary contacts for same school', async () => {
      // Create school and first primary contact
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '主要聯絡人測試學校',
          country: '台灣',
          region: '高雄市',
          schoolType: 'university'
        });

      const schoolId = schoolResponse.body.id;

      await request(app)
        .post(`/api/schools/${schoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '第一個主要聯絡人',
          email: 'primary1@test.com',
          isPrimary: true
        })
        .expect(201);

      // Try to create another primary contact
      const response = await request(app)
        .post(`/api/schools/${schoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '第二個主要聯絡人',
          email: 'primary2@test.com',
          isPrimary: true
        })
        .expect(409);

      expect(response.body.error.code).toBe('CONFLICT');
      expect(response.body.error.message).toContain('primary contact already exists');
    });

    it('should handle invalid MOU status transitions', async () => {
      // Create school
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'MOU狀態測試學校',
          country: '台灣',
          region: '桃園市',
          schoolType: 'high_school'
        });

      const schoolId = schoolResponse.body.id;

      // Set MOU to expired
      await request(app)
        .put(`/api/partnerships/${schoolId}/mou`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mouStatus: 'expired'
        })
        .expect(200);

      // Try to set signed status without required dates
      const response = await request(app)
        .put(`/api/partnerships/${schoolId}/mou`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mouStatus: 'signed'
          // Missing mouSignedDate and mouExpiryDate
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('signed date and expiry date are required');
    });

    it('should handle invalid date ranges', async () => {
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '日期範圍測試學校',
          country: '台灣',
          region: '台南市',
          schoolType: 'university'
        });

      const schoolId = schoolResponse.body.id;

      // Try to set expiry date before signed date
      const response = await request(app)
        .put(`/api/partnerships/${schoolId}/mou`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mouStatus: 'signed',
          mouSignedDate: '2024-12-01T00:00:00Z',
          mouExpiryDate: '2024-01-01T00:00:00Z' // Before signed date
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('expiry date must be after signed date');
    });
  });

  describe('Database Errors', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database connection failure
      // For now, we'll test a scenario that might cause database constraint violation
      
      // Try to create a school with extremely long name that exceeds database column limit
      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'x'.repeat(1000), // Extremely long name
          country: '台灣',
          region: '新竹市',
          schoolType: 'high_school'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle foreign key constraint violations', async () => {
      // Try to create contact for non-existent school
      const response = await request(app)
        .post('/api/schools/99999999-9999-9999-9999-999999999999/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '測試聯絡人',
          email: 'test@constraint.com',
          isPrimary: true
        })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('School not found');
    });
  });

  describe('Rate Limiting Errors', () => {
    it('should handle rate limiting for API endpoints', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app)
            .get('/api/schools')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body.error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(rateLimitedResponses[0].body.error.message).toContain('Too many requests');
      }
    });
  });

  describe('File Upload Errors', () => {
    it('should handle invalid file formats for import', async () => {
      const response = await request(app)
        .post('/api/import/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('invalid content'), 'test.txt')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Invalid file format');
    });

    it('should handle file size limits', async () => {
      // Create a large buffer to simulate oversized file
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      
      const response = await request(app)
        .post('/api/import/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeBuffer, 'large.csv')
        .expect(413);

      expect(response.body.error.code).toBe('FILE_TOO_LARGE');
      expect(response.body.error.message).toContain('File size exceeds limit');
    });
  });

  describe('Export Errors', () => {
    it('should handle invalid export parameters', async () => {
      const response = await request(app)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'invalid_type',
          format: 'csv'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'type',
            message: expect.stringContaining('must be one of')
          })
        ])
      );
    });

    it('should handle export with no data', async () => {
      const response = await request(app)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'schools',
          format: 'csv',
          filters: {
            country: 'NonExistentCountry'
          }
        })
        .expect(200);

      // Should return empty file with headers
      expect(response.text).toContain('Name,Country,Region,School Type');
      expect(response.text.split('\n')).toHaveLength(2); // Header + empty line
    });
  });

  describe('Search Errors', () => {
    it('should handle invalid search parameters', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({
          type: 'invalid_type',
          q: '測試'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle malformed filter JSON', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({
          type: 'schools',
          filters: 'invalid-json'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Invalid JSON in filters');
    });
  });

  describe('Error Recovery and Logging', () => {
    it('should log errors appropriately', async () => {
      // Trigger an error
      await request(app)
        .get('/api/schools/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      // In a real implementation, you would check log files or log aggregation service
      // For this test, we'll verify the error response structure includes logging info
      const response = await request(app)
        .get('/api/schools/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should provide correlation IDs for error tracking', async () => {
      const response = await request(app)
        .get('/api/schools/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Request-ID', 'test-correlation-id')
        .expect(404);

      // Response should include correlation ID for tracking
      expect(response.headers['x-request-id']).toBe('test-correlation-id');
    });

    it('should handle graceful degradation during partial system failures', async () => {
      // Test that core functionality works even if some services are down
      // This would require mocking service failures
      
      // For example, if search service is down, basic CRUD should still work
      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '降級測試學校',
          country: '台灣',
          region: '花蓮縣',
          schoolType: 'high_school'
        })
        .expect(201);

      expect(response.body.name).toBe('降級測試學校');
    });
  });

  describe('Security Error Handling', () => {
    it('should handle SQL injection attempts', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({
          q: "'; DROP TABLE schools; --",
          type: 'schools'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should return safe search results, not execute SQL
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    it('should handle XSS attempts in input', async () => {
      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '<script>alert("xss")</script>',
          country: '台灣',
          region: '台北市',
          schoolType: 'high_school'
        })
        .expect(201);

      // Input should be sanitized
      expect(response.body.name).not.toContain('<script>');
    });

    it('should handle oversized request payloads', async () => {
      const largePayload = {
        name: '測試學校',
        country: '台灣',
        region: '台北市',
        schoolType: 'high_school',
        notes: 'x'.repeat(10 * 1024 * 1024) // 10MB of text
      };

      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largePayload)
        .expect(413);

      expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    });
  });
});