/**
 * End-to-End User Flow Tests
 * 測試主要使用者流程的端到端功能
 */

import request from 'supertest';
import { app } from '../../src/index';
import { setupTestDatabase, cleanupTestDatabase } from '../utils/testHelpers';

describe('E2E User Flows', () => {
  let authToken: string;
  let testSchoolId: string;
  let testContactId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Complete School Management Flow', () => {
    it('should complete full school lifecycle: create -> view -> update -> manage contacts -> interactions', async () => {
      // Step 1: User Authentication
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123'
        })
        .expect(200);

      authToken = loginResponse.body.token;
      expect(authToken).toBeDefined();

      // Step 2: Create a new school
      const schoolData = {
        name: '測試高中',
        country: '台灣',
        region: '台北市',
        schoolType: 'high_school',
        website: 'https://test-school.edu.tw'
      };

      const createSchoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send(schoolData)
        .expect(201);

      testSchoolId = createSchoolResponse.body.id;
      expect(createSchoolResponse.body.name).toBe(schoolData.name);
      expect(createSchoolResponse.body.country).toBe(schoolData.country);

      // Step 3: Retrieve school details
      const getSchoolResponse = await request(app)
        .get(`/api/schools/${testSchoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getSchoolResponse.body.id).toBe(testSchoolId);
      expect(getSchoolResponse.body.name).toBe(schoolData.name);

      // Step 4: Update school information
      const updatedData = {
        ...schoolData,
        name: '測試高中 (已更新)',
        website: 'https://updated-school.edu.tw'
      };

      const updateSchoolResponse = await request(app)
        .put(`/api/schools/${testSchoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData)
        .expect(200);

      expect(updateSchoolResponse.body.name).toBe(updatedData.name);
      expect(updateSchoolResponse.body.website).toBe(updatedData.website);

      // Step 5: Add contact to school
      const contactData = {
        name: '張老師',
        email: 'teacher.zhang@test-school.edu.tw',
        phone: '02-1234-5678',
        position: '教務主任',
        isPrimary: true
      };

      const createContactResponse = await request(app)
        .post(`/api/schools/${testSchoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(contactData)
        .expect(201);

      testContactId = createContactResponse.body.id;
      expect(createContactResponse.body.name).toBe(contactData.name);
      expect(createContactResponse.body.email).toBe(contactData.email);

      // Step 6: Get school contacts
      const getContactsResponse = await request(app)
        .get(`/api/schools/${testSchoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getContactsResponse.body).toHaveLength(1);
      expect(getContactsResponse.body[0].id).toBe(testContactId);

      // Step 7: Create interaction record
      const interactionData = {
        contactMethod: 'email',
        date: new Date().toISOString(),
        notes: '初次聯繫，討論合作可能性',
        followUpRequired: true,
        followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const createInteractionResponse = await request(app)
        .post(`/api/schools/${testSchoolId}/interactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(interactionData)
        .expect(201);

      expect(createInteractionResponse.body.contactMethod).toBe(interactionData.contactMethod);
      expect(createInteractionResponse.body.notes).toBe(interactionData.notes);

      // Step 8: Get interaction history
      const getInteractionsResponse = await request(app)
        .get(`/api/schools/${testSchoolId}/interactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getInteractionsResponse.body).toHaveLength(1);
      expect(getInteractionsResponse.body[0].notes).toBe(interactionData.notes);

      // Step 9: Search for schools
      const searchResponse = await request(app)
        .get('/api/search')
        .query({ q: '測試', type: 'schools' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(searchResponse.body.results.length).toBeGreaterThan(0);
      expect(searchResponse.body.results.some((school: any) => school.id === testSchoolId)).toBe(true);
    });
  });

  describe('Partnership Management Flow', () => {
    it('should manage partnership lifecycle: create -> update MOU -> track metrics', async () => {
      // Ensure we have a school to work with
      if (!testSchoolId) {
        const schoolResponse = await request(app)
          .post('/api/schools')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: '合作測試學校',
            country: '台灣',
            region: '新北市',
            schoolType: 'university'
          })
          .expect(201);
        testSchoolId = schoolResponse.body.id;
      }

      // Step 1: Update MOU status to negotiating
      const mouData = {
        mouStatus: 'negotiating'
      };

      await request(app)
        .put(`/api/partnerships/${testSchoolId}/mou`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(mouData)
        .expect(200);

      // Step 2: Sign MOU
      const signedMouData = {
        mouStatus: 'signed',
        mouSignedDate: new Date().toISOString(),
        mouExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      const signMouResponse = await request(app)
        .put(`/api/partnerships/${testSchoolId}/mou`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(signedMouData)
        .expect(200);

      expect(signMouResponse.body.mouStatus).toBe('signed');

      // Step 3: Record referral metrics
      const referralData = {
        count: 5
      };

      const recordReferralResponse = await request(app)
        .post(`/api/partnerships/${testSchoolId}/referrals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(referralData)
        .expect(200);

      expect(recordReferralResponse.body.referralCount).toBe(5);

      // Step 4: Record recruitment event
      const eventData = {
        eventType: 'recruitment_session',
        date: new Date().toISOString(),
        attendees: 25,
        notes: '招生說明會順利進行'
      };

      await request(app)
        .post(`/api/partnerships/${testSchoolId}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      // Step 5: Get partnership statistics
      const statsResponse = await request(app)
        .get(`/api/partnerships/${testSchoolId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statsResponse.body.referralCount).toBe(5);
      expect(statsResponse.body.eventsHeld).toBe(1);
    });
  });

  describe('Data Export Flow', () => {
    it('should export data in multiple formats', async () => {
      // Step 1: Export schools as CSV
      const csvExportResponse = await request(app)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'schools',
          format: 'csv',
          filters: {}
        })
        .expect(200);

      expect(csvExportResponse.headers['content-type']).toContain('text/csv');

      // Step 2: Export schools as Excel
      const excelExportResponse = await request(app)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'schools',
          format: 'excel',
          filters: {}
        })
        .expect(200);

      expect(excelExportResponse.headers['content-type']).toContain('application/vnd.openxmlformats');

      // Step 3: Export with filters
      const filteredExportResponse = await request(app)
        .post('/api/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'schools',
          format: 'json',
          filters: {
            country: '台灣',
            schoolType: 'high_school'
          }
        })
        .expect(200);

      expect(filteredExportResponse.body).toHaveProperty('data');
      expect(Array.isArray(filteredExportResponse.body.data)).toBe(true);
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle various error scenarios gracefully', async () => {
      // Step 1: Test unauthorized access
      await request(app)
        .get('/api/schools')
        .expect(401);

      // Step 2: Test invalid school ID
      await request(app)
        .get('/api/schools/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      // Step 3: Test missing required fields
      await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required name field
          country: '台灣'
        })
        .expect(400);

      // Step 4: Test invalid email format
      await request(app)
        .post(`/api/schools/${testSchoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '測試聯絡人',
          email: 'invalid-email',
          isPrimary: false
        })
        .expect(400);

      // Step 5: Test non-existent resource
      await request(app)
        .get('/api/schools/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});