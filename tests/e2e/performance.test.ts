/**
 * Performance Benchmark Tests
 * 測試系統效能基準和負載處理能力
 */

import request from 'supertest';
import { app } from '../../src/index';
import { setupTestDatabase, cleanupTestDatabase } from '../utils/testHelpers';

describe('Performance Benchmarks', () => {
  let authToken: string;
  const performanceThresholds = {
    apiResponse: 1000, // 1 second
    searchResponse: 2000, // 2 seconds
    exportResponse: 5000, // 5 seconds
    bulkOperations: 3000 // 3 seconds
  };

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword123'
      });
    
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('API Response Times', () => {
    it('should respond to school listing within performance threshold', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(performanceThresholds.apiResponse);
    });

    it('should respond to school creation within performance threshold', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '效能測試學校',
          country: '台灣',
          region: '台中市',
          schoolType: 'high_school'
        })
        .expect(201);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(performanceThresholds.apiResponse);
    });

    it('should respond to contact creation within performance threshold', async () => {
      // First create a school
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '聯絡人測試學校',
          country: '台灣',
          region: '高雄市',
          schoolType: 'university'
        });

      const schoolId = schoolResponse.body.id;
      const startTime = Date.now();
      
      await request(app)
        .post(`/api/schools/${schoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '效能測試聯絡人',
          email: 'performance@test.com',
          phone: '07-1234-5678',
          isPrimary: true
        })
        .expect(201);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(performanceThresholds.apiResponse);
    });
  });

  describe('Search Performance', () => {
    beforeAll(async () => {
      // Create multiple schools for search testing
      const schoolPromises = [];
      for (let i = 0; i < 50; i++) {
        schoolPromises.push(
          request(app)
            .post('/api/schools')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: `搜尋測試學校 ${i}`,
              country: '台灣',
              region: i % 2 === 0 ? '台北市' : '新北市',
              schoolType: i % 3 === 0 ? 'high_school' : 'university'
            })
        );
      }
      await Promise.all(schoolPromises);
    });

    it('should perform text search within performance threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/search')
        .query({ q: '搜尋測試', type: 'schools' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(performanceThresholds.searchResponse);
      expect(response.body.results.length).toBeGreaterThan(0);
    });

    it('should perform filtered search within performance threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/search')
        .query({ 
          type: 'schools',
          filters: JSON.stringify({
            country: '台灣',
            schoolType: 'university'
          })
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(performanceThresholds.searchResponse);
      expect(response.body.results.length).toBeGreaterThan(0);
    });

    it('should handle complex search queries within performance threshold', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/search')
        .query({ 
          q: '測試',
          type: 'schools',
          filters: JSON.stringify({
            country: '台灣',
            region: '台北市'
          }),
          sort: 'name',
          order: 'asc',
          limit: 20,
          offset: 0
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(performanceThresholds.searchResponse);
      expect(response.body.results).toBeDefined();
    });
  });

  describe('Export Performance', () => {
    it('should export CSV data within performance threshold', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'schools',
          format: 'csv',
          filters: {}
        })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(performanceThresholds.exportResponse);
    });

    it('should export Excel data within performance threshold', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'schools',
          format: 'excel',
          filters: {}
        })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(performanceThresholds.exportResponse);
    });

    it('should export large datasets within performance threshold', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'schools',
          format: 'json',
          filters: {},
          includeRelated: true
        })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(performanceThresholds.exportResponse);
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should handle bulk school creation within performance threshold', async () => {
      const bulkData = [];
      for (let i = 0; i < 10; i++) {
        bulkData.push({
          name: `批量測試學校 ${i}`,
          country: '台灣',
          region: '桃園市',
          schoolType: 'high_school'
        });
      }

      const startTime = Date.now();
      
      await request(app)
        .post('/api/schools/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ schools: bulkData })
        .expect(201);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(performanceThresholds.bulkOperations);
    });

    it('should handle bulk contact creation within performance threshold', async () => {
      // Create a school first
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '批量聯絡人測試學校',
          country: '台灣',
          region: '台南市',
          schoolType: 'university'
        });

      const schoolId = schoolResponse.body.id;
      const bulkContacts = [];
      
      for (let i = 0; i < 5; i++) {
        bulkContacts.push({
          name: `批量聯絡人 ${i}`,
          email: `bulk${i}@test.com`,
          phone: `06-123-456${i}`,
          isPrimary: i === 0
        });
      }

      const startTime = Date.now();
      
      await request(app)
        .post(`/api/schools/${schoolId}/contacts/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ contacts: bulkContacts })
        .expect(201);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(performanceThresholds.bulkOperations);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = [];

      const startTime = Date.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app)
            .get('/api/schools')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Total time should be reasonable for concurrent requests
      expect(totalTime).toBeLessThan(performanceThresholds.apiResponse * 2);
    });

    it('should handle mixed concurrent operations efficiently', async () => {
      const startTime = Date.now();
      
      const mixedRequests = [
        // Read operations
        request(app).get('/api/schools').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/search').query({ q: '測試', type: 'schools' }).set('Authorization', `Bearer ${authToken}`),
        
        // Write operations
        request(app).post('/api/schools').set('Authorization', `Bearer ${authToken}`).send({
          name: '並發測試學校1',
          country: '台灣',
          region: '新竹市',
          schoolType: 'high_school'
        }),
        request(app).post('/api/schools').set('Authorization', `Bearer ${authToken}`).send({
          name: '並發測試學校2',
          country: '台灣',
          region: '嘉義市',
          schoolType: 'university'
        })
      ];

      const responses = await Promise.all(mixedRequests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach((response, index) => {
        if (index < 2) {
          expect(response.status).toBe(200); // Read operations
        } else {
          expect(response.status).toBe(201); // Write operations
        }
      });

      expect(totalTime).toBeLessThan(performanceThresholds.bulkOperations);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should handle large response payloads efficiently', async () => {
      const startTime = Date.now();
      const initialMemory = process.memoryUsage();
      
      // Request large dataset
      const response = await request(app)
        .get('/api/schools')
        .query({ limit: 1000, includeContacts: true, includeInteractions: true })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      const finalMemory = process.memoryUsage();
      
      expect(responseTime).toBeLessThan(performanceThresholds.searchResponse);
      expect(response.body).toBeDefined();
      
      // Memory usage should not increase dramatically
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    });
  });
});