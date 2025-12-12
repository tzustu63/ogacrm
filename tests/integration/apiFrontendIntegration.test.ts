/**
 * API-Frontend Integration Tests
 * 測試API與前端的整合功能
 */

import request from 'supertest';
import { app } from '../../src/index';
import { setupTestDatabase, cleanupTestDatabase } from '../utils/testHelpers';

describe('API-Frontend Integration', () => {
  let authToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
    
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

  describe('School Management Integration', () => {
    let testSchoolId: string;

    it('should integrate school CRUD operations with frontend expectations', async () => {
      // Test school creation with frontend-expected response format
      const schoolData = {
        name: '整合測試學校',
        country: '台灣',
        region: '台北市',
        schoolType: 'high_school',
        website: 'https://integration-test.edu.tw'
      };

      const createResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send(schoolData)
        .expect(201);

      // Verify response structure matches frontend expectations
      expect(createResponse.body).toHaveProperty('id');
      expect(createResponse.body).toHaveProperty('name', schoolData.name);
      expect(createResponse.body).toHaveProperty('country', schoolData.country);
      expect(createResponse.body).toHaveProperty('region', schoolData.region);
      expect(createResponse.body).toHaveProperty('schoolType', schoolData.schoolType);
      expect(createResponse.body).toHaveProperty('website', schoolData.website);
      expect(createResponse.body).toHaveProperty('relationshipStatus');
      expect(createResponse.body).toHaveProperty('createdAt');
      expect(createResponse.body).toHaveProperty('updatedAt');

      testSchoolId = createResponse.body.id;

      // Test school listing with pagination and filtering
      const listResponse = await request(app)
        .get('/api/schools')
        .query({
          page: 1,
          limit: 10,
          country: '台灣',
          schoolType: 'high_school'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify pagination structure
      expect(listResponse.body).toHaveProperty('data');
      expect(listResponse.body).toHaveProperty('pagination');
      expect(listResponse.body.pagination).toHaveProperty('page');
      expect(listResponse.body.pagination).toHaveProperty('limit');
      expect(listResponse.body.pagination).toHaveProperty('total');
      expect(listResponse.body.pagination).toHaveProperty('totalPages');
      expect(Array.isArray(listResponse.body.data)).toBe(true);

      // Test school detail retrieval
      const detailResponse = await request(app)
        .get(`/api/schools/${testSchoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(detailResponse.body.id).toBe(testSchoolId);
      expect(detailResponse.body.name).toBe(schoolData.name);

      // Test school update
      const updateData = {
        name: '整合測試學校 (已更新)',
        relationshipStatus: 'active'
      };

      const updateResponse = await request(app)
        .put(`/api/schools/${testSchoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.name).toBe(updateData.name);
      expect(updateResponse.body.relationshipStatus).toBe(updateData.relationshipStatus);
    });

    it('should handle school validation errors with frontend-friendly messages', async () => {
      // Test missing required fields
      const invalidSchoolData = {
        country: '台灣',
        region: '新北市'
        // Missing required 'name' field
      };

      const errorResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidSchoolData)
        .expect(400);

      // Verify error structure matches frontend expectations
      expect(errorResponse.body).toHaveProperty('success', false);
      expect(errorResponse.body).toHaveProperty('error');
      expect(errorResponse.body.error).toHaveProperty('message');
      expect(errorResponse.body.error).toHaveProperty('details');
      expect(errorResponse.body.error.details).toContain('name');

      // Test invalid school type
      const invalidTypeData = {
        name: '測試學校',
        country: '台灣',
        region: '台中市',
        schoolType: 'invalid_type'
      };

      const typeErrorResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTypeData)
        .expect(400);

      expect(typeErrorResponse.body.error.details).toContain('schoolType');
    });
  });

  describe('Contact Management Integration', () => {
    let testSchoolId: string;
    let testContactId: string;

    beforeAll(async () => {
      // Create a test school
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '聯絡人整合測試學校',
          country: '台灣',
          region: '高雄市',
          schoolType: 'university'
        });
      testSchoolId = schoolResponse.body.id;
    });

    it('should integrate contact CRUD operations with school relationships', async () => {
      // Test contact creation
      const contactData = {
        name: '整合測試聯絡人',
        email: 'integration@test.edu.tw',
        phone: '07-1234-5678',
        position: '招生組長',
        isPrimary: true
      };

      const createResponse = await request(app)
        .post(`/api/schools/${testSchoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(contactData)
        .expect(201);

      // Verify response structure
      expect(createResponse.body).toHaveProperty('id');
      expect(createResponse.body).toHaveProperty('schoolId', testSchoolId);
      expect(createResponse.body).toHaveProperty('name', contactData.name);
      expect(createResponse.body).toHaveProperty('email', contactData.email);
      expect(createResponse.body).toHaveProperty('phone', contactData.phone);
      expect(createResponse.body).toHaveProperty('position', contactData.position);
      expect(createResponse.body).toHaveProperty('isPrimary', contactData.isPrimary);

      testContactId = createResponse.body.id;

      // Test contact listing for school
      const listResponse = await request(app)
        .get(`/api/schools/${testSchoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(listResponse.body)).toBe(true);
      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0].id).toBe(testContactId);

      // Test contact update
      const updateData = {
        position: '教務主任',
        phone: '07-8765-4321'
      };

      const updateResponse = await request(app)
        .put(`/api/contacts/${testContactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.position).toBe(updateData.position);
      expect(updateResponse.body.phone).toBe(updateData.phone);

      // Verify school still has the updated contact
      const schoolDetailResponse = await request(app)
        .get(`/api/schools/${testSchoolId}`)
        .query({ includeContacts: true })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(schoolDetailResponse.body.contacts).toHaveLength(1);
      expect(schoolDetailResponse.body.contacts[0].position).toBe(updateData.position);
    });

    it('should validate email uniqueness across contacts', async () => {
      // Try to create another contact with the same email
      const duplicateEmailData = {
        name: '另一個聯絡人',
        email: 'integration@test.edu.tw', // Same email as previous contact
        isPrimary: false
      };

      const errorResponse = await request(app)
        .post(`/api/schools/${testSchoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateEmailData)
        .expect(400);

      expect(errorResponse.body.error.message).toContain('email');
    });

    it('should enforce primary contact constraints', async () => {
      // Try to create another primary contact for the same school
      const anotherPrimaryData = {
        name: '另一個主要聯絡人',
        email: 'another@test.edu.tw',
        isPrimary: true
      };

      const errorResponse = await request(app)
        .post(`/api/schools/${testSchoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(anotherPrimaryData)
        .expect(400);

      expect(errorResponse.body.error.message).toContain('primary');
    });
  });

  describe('Interaction Management Integration', () => {
    let testSchoolId: string;

    beforeAll(async () => {
      // Create a test school
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '互動整合測試學校',
          country: '台灣',
          region: '台南市',
          schoolType: 'high_school'
        });
      testSchoolId = schoolResponse.body.id;
    });

    it('should integrate interaction tracking with school relationship updates', async () => {
      // Create initial interaction
      const interactionData = {
        contactMethod: 'email',
        date: new Date().toISOString(),
        notes: '初次聯繫，介紹課程內容',
        followUpRequired: true,
        followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const createResponse = await request(app)
        .post(`/api/schools/${testSchoolId}/interactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(interactionData)
        .expect(201);

      expect(createResponse.body).toHaveProperty('id');
      expect(createResponse.body).toHaveProperty('schoolId', testSchoolId);
      expect(createResponse.body).toHaveProperty('contactMethod', interactionData.contactMethod);
      expect(createResponse.body).toHaveProperty('notes', interactionData.notes);

      // Verify school's first contact date was updated
      const schoolResponse = await request(app)
        .get(`/api/schools/${testSchoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(schoolResponse.body.firstContactDate).toBeDefined();

      // Create follow-up interaction
      const followUpData = {
        contactMethod: 'phone',
        date: new Date().toISOString(),
        notes: '電話追蹤，學校表示有興趣',
        followUpRequired: false
      };

      await request(app)
        .post(`/api/schools/${testSchoolId}/interactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(followUpData)
        .expect(201);

      // Verify school's last contact date was updated
      const updatedSchoolResponse = await request(app)
        .get(`/api/schools/${testSchoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updatedSchoolResponse.body.lastContactDate).toBeDefined();
      expect(new Date(updatedSchoolResponse.body.lastContactDate).getTime())
        .toBeGreaterThan(new Date(updatedSchoolResponse.body.firstContactDate).getTime());

      // Get interaction timeline
      const timelineResponse = await request(app)
        .get(`/api/schools/${testSchoolId}/interactions`)
        .query({ sort: 'date', order: 'desc' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(timelineResponse.body).toHaveLength(2);
      expect(timelineResponse.body[0].contactMethod).toBe('phone'); // Most recent first
      expect(timelineResponse.body[1].contactMethod).toBe('email');
    });

    it('should update relationship status through interactions', async () => {
      // Create interaction that changes relationship status
      const statusUpdateData = {
        contactMethod: 'visit',
        date: new Date().toISOString(),
        notes: '實地拜訪，簽署合作意向書',
        relationshipStatusUpdate: 'partnered'
      };

      await request(app)
        .post(`/api/schools/${testSchoolId}/interactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusUpdateData)
        .expect(201);

      // Verify school relationship status was updated
      const schoolResponse = await request(app)
        .get(`/api/schools/${testSchoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(schoolResponse.body.relationshipStatus).toBe('partnered');
    });
  });

  describe('Search Integration', () => {
    beforeAll(async () => {
      // Create multiple schools for search testing
      const schools = [
        { name: '搜尋測試高中A', country: '台灣', region: '台北市', schoolType: 'high_school' },
        { name: '搜尋測試大學B', country: '台灣', region: '新北市', schoolType: 'university' },
        { name: '技職測試學院C', country: '台灣', region: '桃園市', schoolType: 'vocational' }
      ];

      for (const school of schools) {
        await request(app)
          .post('/api/schools')
          .set('Authorization', `Bearer ${authToken}`)
          .send(school);
      }
    });

    it('should integrate search functionality with frontend filtering', async () => {
      // Test text search
      const textSearchResponse = await request(app)
        .get('/api/search')
        .query({
          q: '搜尋測試',
          type: 'schools'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(textSearchResponse.body).toHaveProperty('results');
      expect(textSearchResponse.body).toHaveProperty('total');
      expect(textSearchResponse.body).toHaveProperty('page');
      expect(textSearchResponse.body).toHaveProperty('limit');
      expect(textSearchResponse.body.results.length).toBeGreaterThanOrEqual(2);

      // Test filtered search
      const filteredSearchResponse = await request(app)
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

      expect(filteredSearchResponse.body.results.length).toBeGreaterThanOrEqual(1);
      filteredSearchResponse.body.results.forEach((school: any) => {
        expect(school.country).toBe('台灣');
        expect(school.schoolType).toBe('university');
      });

      // Test combined search and filter
      const combinedSearchResponse = await request(app)
        .get('/api/search')
        .query({
          q: '測試',
          type: 'schools',
          filters: JSON.stringify({
            region: '台北市'
          })
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(combinedSearchResponse.body.results.length).toBeGreaterThanOrEqual(1);
      combinedSearchResponse.body.results.forEach((school: any) => {
        expect(school.region).toBe('台北市');
        expect(school.name).toContain('測試');
      });
    });

    it('should handle search pagination correctly', async () => {
      // Test first page
      const firstPageResponse = await request(app)
        .get('/api/search')
        .query({
          q: '測試',
          type: 'schools',
          page: 1,
          limit: 2
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(firstPageResponse.body.page).toBe(1);
      expect(firstPageResponse.body.limit).toBe(2);
      expect(firstPageResponse.body.results.length).toBeLessThanOrEqual(2);

      // Test second page if there are more results
      if (firstPageResponse.body.total > 2) {
        const secondPageResponse = await request(app)
          .get('/api/search')
          .query({
            q: '測試',
            type: 'schools',
            page: 2,
            limit: 2
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(secondPageResponse.body.page).toBe(2);
        expect(secondPageResponse.body.results.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Export Integration', () => {
    it('should integrate export functionality with frontend download handling', async () => {
      // Test CSV export
      const csvResponse = await request(app)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'schools',
          format: 'csv',
          filters: {}
        })
        .expect(200);

      expect(csvResponse.headers['content-type']).toContain('text/csv');
      expect(csvResponse.headers['content-disposition']).toContain('attachment');
      expect(csvResponse.headers['content-disposition']).toContain('schools');

      // Test Excel export
      const excelResponse = await request(app)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'schools',
          format: 'excel',
          filters: {}
        })
        .expect(200);

      expect(excelResponse.headers['content-type']).toContain('application/vnd.openxmlformats');
      expect(excelResponse.headers['content-disposition']).toContain('attachment');

      // Test JSON export with custom fields
      const jsonResponse = await request(app)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'schools',
          format: 'json',
          fields: ['name', 'country', 'schoolType'],
          filters: { country: '台灣' }
        })
        .expect(200);

      expect(jsonResponse.body).toHaveProperty('data');
      expect(Array.isArray(jsonResponse.body.data)).toBe(true);
      
      if (jsonResponse.body.data.length > 0) {
        const firstItem = jsonResponse.body.data[0];
        expect(firstItem).toHaveProperty('name');
        expect(firstItem).toHaveProperty('country');
        expect(firstItem).toHaveProperty('schoolType');
        expect(firstItem).not.toHaveProperty('region'); // Should not include non-selected fields
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should provide consistent error responses for frontend handling', async () => {
      // Test authentication error
      const authErrorResponse = await request(app)
        .get('/api/schools')
        .expect(401);

      expect(authErrorResponse.body).toHaveProperty('success', false);
      expect(authErrorResponse.body).toHaveProperty('error');
      expect(authErrorResponse.body.error).toHaveProperty('code', 'UNAUTHORIZED');

      // Test validation error
      const validationErrorResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Invalid empty name
          country: '台灣'
        })
        .expect(400);

      expect(validationErrorResponse.body).toHaveProperty('success', false);
      expect(validationErrorResponse.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(validationErrorResponse.body.error).toHaveProperty('details');

      // Test not found error
      const notFoundResponse = await request(app)
        .get('/api/schools/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(notFoundResponse.body).toHaveProperty('success', false);
      expect(notFoundResponse.body.error).toHaveProperty('code', 'NOT_FOUND');

      // Test server error handling
      const serverErrorResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test School',
          country: '台灣',
          region: 'Test Region',
          schoolType: 'high_school',
          // Add a field that might cause server error
          invalidField: 'x'.repeat(10000) // Very long string
        })
        .expect(400);

      expect(serverErrorResponse.body).toHaveProperty('success', false);
      expect(serverErrorResponse.body).toHaveProperty('error');
    });
  });
});