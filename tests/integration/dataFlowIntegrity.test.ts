/**
 * Data Flow Integrity Tests
 * 測試資料流的完整性和一致性
 */

import request from 'supertest';
import { app } from '../../src/index';
import { setupTestDatabase, cleanupTestDatabase, getTestDatabase } from '../utils/testHelpers';

describe('Data Flow Integrity', () => {
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

  describe('School-Contact Data Consistency', () => {
    it('should maintain referential integrity between schools and contacts', async () => {
      // Create a school
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '資料完整性測試學校',
          country: '台灣',
          region: '台北市',
          schoolType: 'high_school'
        })
        .expect(201);

      const schoolId = schoolResponse.body.id;

      // Create multiple contacts for the school
      const contacts = [
        { name: '主要聯絡人', email: 'primary@test.com', isPrimary: true },
        { name: '次要聯絡人1', email: 'secondary1@test.com', isPrimary: false },
        { name: '次要聯絡人2', email: 'secondary2@test.com', isPrimary: false }
      ];

      const contactIds = [];
      for (const contact of contacts) {
        const contactResponse = await request(app)
          .post(`/api/schools/${schoolId}/contacts`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(contact)
          .expect(201);
        contactIds.push(contactResponse.body.id);
      }

      // Verify all contacts are linked to the school
      const schoolContactsResponse = await request(app)
        .get(`/api/schools/${schoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(schoolContactsResponse.body).toHaveLength(3);
      expect(schoolContactsResponse.body.filter((c: any) => c.isPrimary)).toHaveLength(1);

      // Verify database consistency
      const dbContacts = await db.query(
        'SELECT * FROM contacts WHERE school_id = $1',
        [schoolId]
      );
      expect(dbContacts.rows).toHaveLength(3);

      // Test cascade delete - deleting school should remove contacts
      await request(app)
        .delete(`/api/schools/${schoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify contacts are also deleted
      const remainingContacts = await db.query(
        'SELECT * FROM contacts WHERE school_id = $1',
        [schoolId]
      );
      expect(remainingContacts.rows).toHaveLength(0);
    });

    it('should handle contact updates without breaking school relationships', async () => {
      // Create school and contact
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '聯絡人更新測試學校',
          country: '台灣',
          region: '新北市',
          schoolType: 'university'
        });

      const schoolId = schoolResponse.body.id;

      const contactResponse = await request(app)
        .post(`/api/schools/${schoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '測試聯絡人',
          email: 'test@update.com',
          isPrimary: true
        });

      const contactId = contactResponse.body.id;

      // Update contact information
      const updateResponse = await request(app)
        .put(`/api/contacts/${contactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '更新後聯絡人',
          email: 'updated@test.com',
          phone: '02-1234-5678'
        })
        .expect(200);

      // Verify school still has the updated contact
      const schoolDetailResponse = await request(app)
        .get(`/api/schools/${schoolId}`)
        .query({ includeContacts: true })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(schoolDetailResponse.body.contacts).toHaveLength(1);
      expect(schoolDetailResponse.body.contacts[0].name).toBe('更新後聯絡人');
      expect(schoolDetailResponse.body.contacts[0].email).toBe('updated@test.com');

      // Verify database consistency
      const dbContact = await db.query(
        'SELECT * FROM contacts WHERE id = $1',
        [contactId]
      );
      expect(dbContact.rows[0].school_id).toBe(schoolId);
      expect(dbContact.rows[0].name).toBe('更新後聯絡人');
    });
  });

  describe('School-Interaction Data Flow', () => {
    it('should maintain interaction history integrity with school updates', async () => {
      // Create school
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '互動歷史測試學校',
          country: '台灣',
          region: '台中市',
          schoolType: 'high_school'
        });

      const schoolId = schoolResponse.body.id;

      // Create multiple interactions over time
      const interactions = [
        {
          contactMethod: 'email',
          date: new Date('2024-01-01').toISOString(),
          notes: '第一次聯繫'
        },
        {
          contactMethod: 'phone',
          date: new Date('2024-01-15').toISOString(),
          notes: '電話追蹤'
        },
        {
          contactMethod: 'visit',
          date: new Date('2024-02-01').toISOString(),
          notes: '實地拜訪',
          relationshipStatusUpdate: 'active'
        }
      ];

      for (const interaction of interactions) {
        await request(app)
          .post(`/api/schools/${schoolId}/interactions`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(interaction)
          .expect(201);
      }

      // Verify school dates are updated correctly
      const schoolDetailResponse = await request(app)
        .get(`/api/schools/${schoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(schoolDetailResponse.body.firstContactDate).toBe('2024-01-01T00:00:00.000Z');
      expect(schoolDetailResponse.body.lastContactDate).toBe('2024-02-01T00:00:00.000Z');
      expect(schoolDetailResponse.body.relationshipStatus).toBe('active');

      // Verify interaction count
      const interactionsResponse = await request(app)
        .get(`/api/schools/${schoolId}/interactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(interactionsResponse.body).toHaveLength(3);

      // Verify database consistency
      const dbSchool = await db.query(
        'SELECT * FROM schools WHERE id = $1',
        [schoolId]
      );
      expect(dbSchool.rows[0].first_contact_date).toBeDefined();
      expect(dbSchool.rows[0].last_contact_date).toBeDefined();
      expect(dbSchool.rows[0].relationship_status).toBe('active');

      const dbInteractions = await db.query(
        'SELECT * FROM interactions WHERE school_id = $1 ORDER BY date',
        [schoolId]
      );
      expect(dbInteractions.rows).toHaveLength(3);
    });

    it('should handle interaction deletion while maintaining data integrity', async () => {
      // Create school and interactions
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '互動刪除測試學校',
          country: '台灣',
          region: '高雄市',
          schoolType: 'university'
        });

      const schoolId = schoolResponse.body.id;

      // Create interactions
      const interaction1Response = await request(app)
        .post(`/api/schools/${schoolId}/interactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contactMethod: 'email',
          date: new Date('2024-01-01').toISOString(),
          notes: '第一次互動'
        });

      const interaction2Response = await request(app)
        .post(`/api/schools/${schoolId}/interactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contactMethod: 'phone',
          date: new Date('2024-01-15').toISOString(),
          notes: '第二次互動'
        });

      const interaction1Id = interaction1Response.body.id;

      // Delete first interaction
      await request(app)
        .delete(`/api/interactions/${interaction1Id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify school dates are recalculated
      const schoolDetailResponse = await request(app)
        .get(`/api/schools/${schoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(schoolDetailResponse.body.firstContactDate).toBe('2024-01-15T00:00:00.000Z');
      expect(schoolDetailResponse.body.lastContactDate).toBe('2024-01-15T00:00:00.000Z');

      // Verify only one interaction remains
      const interactionsResponse = await request(app)
        .get(`/api/schools/${schoolId}/interactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(interactionsResponse.body).toHaveLength(1);
      expect(interactionsResponse.body[0].notes).toBe('第二次互動');
    });
  });

  describe('Partnership Data Consistency', () => {
    it('should maintain partnership metrics integrity', async () => {
      // Create school
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '合作指標測試學校',
          country: '台灣',
          region: '桃園市',
          schoolType: 'high_school'
        });

      const schoolId = schoolResponse.body.id;

      // Update MOU status
      await request(app)
        .put(`/api/partnerships/${schoolId}/mou`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          mouStatus: 'signed',
          mouSignedDate: new Date().toISOString(),
          mouExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        })
        .expect(200);

      // Record referrals
      await request(app)
        .post(`/api/partnerships/${schoolId}/referrals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ count: 5 })
        .expect(200);

      await request(app)
        .post(`/api/partnerships/${schoolId}/referrals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ count: 3 })
        .expect(200);

      // Record events
      await request(app)
        .post(`/api/partnerships/${schoolId}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          eventType: 'recruitment_session',
          date: new Date().toISOString(),
          attendees: 25
        })
        .expect(201);

      await request(app)
        .post(`/api/partnerships/${schoolId}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          eventType: 'information_session',
          date: new Date().toISOString(),
          attendees: 15
        })
        .expect(201);

      // Verify partnership statistics
      const statsResponse = await request(app)
        .get(`/api/partnerships/${schoolId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statsResponse.body.mouStatus).toBe('signed');
      expect(statsResponse.body.referralCount).toBe(8); // 5 + 3
      expect(statsResponse.body.eventsHeld).toBe(2);
      expect(statsResponse.body.totalAttendees).toBe(40); // 25 + 15

      // Verify database consistency
      const dbPartnership = await db.query(
        'SELECT * FROM partnerships WHERE school_id = $1',
        [schoolId]
      );
      expect(dbPartnership.rows[0].referral_count).toBe(8);
      expect(dbPartnership.rows[0].events_held).toBe(2);

      const dbEvents = await db.query(
        'SELECT COUNT(*) as count, SUM(attendees) as total_attendees FROM partnership_events WHERE school_id = $1',
        [schoolId]
      );
      expect(parseInt(dbEvents.rows[0].count)).toBe(2);
      expect(parseInt(dbEvents.rows[0].total_attendees)).toBe(40);
    });
  });

  describe('Search Index Consistency', () => {
    it('should maintain search index integrity with data updates', async () => {
      // Create school
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '搜尋索引測試學校',
          country: '台灣',
          region: '新竹市',
          schoolType: 'university'
        });

      const schoolId = schoolResponse.body.id;

      // Verify school appears in search immediately
      const initialSearchResponse = await request(app)
        .get('/api/search')
        .query({ q: '搜尋索引測試', type: 'schools' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(initialSearchResponse.body.results.some((s: any) => s.id === schoolId)).toBe(true);

      // Update school name
      await request(app)
        .put(`/api/schools/${schoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '更新後搜尋索引測試學校'
        })
        .expect(200);

      // Verify updated name appears in search
      const updatedSearchResponse = await request(app)
        .get('/api/search')
        .query({ q: '更新後搜尋索引', type: 'schools' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updatedSearchResponse.body.results.some((s: any) => s.id === schoolId)).toBe(true);

      // Verify old name no longer appears
      const oldSearchResponse = await request(app)
        .get('/api/search')
        .query({ q: '搜尋索引測試學校', type: 'schools' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(oldSearchResponse.body.results.some((s: any) => s.id === schoolId)).toBe(false);

      // Add contact and verify it's searchable
      await request(app)
        .post(`/api/schools/${schoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '搜尋測試聯絡人',
          email: 'search@test.com',
          isPrimary: true
        });

      // Search should find school by contact name
      const contactSearchResponse = await request(app)
        .get('/api/search')
        .query({ q: '搜尋測試聯絡人', type: 'schools' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(contactSearchResponse.body.results.some((s: any) => s.id === schoolId)).toBe(true);
    });
  });

  describe('Transaction Integrity', () => {
    it('should handle complex multi-table operations atomically', async () => {
      // Test creating school with contacts and interactions in a single transaction
      const complexData = {
        school: {
          name: '交易完整性測試學校',
          country: '台灣',
          region: '台南市',
          schoolType: 'high_school'
        },
        contacts: [
          { name: '主要聯絡人', email: 'primary@transaction.com', isPrimary: true },
          { name: '次要聯絡人', email: 'secondary@transaction.com', isPrimary: false }
        ],
        interactions: [
          {
            contactMethod: 'email',
            date: new Date().toISOString(),
            notes: '初次聯繫'
          }
        ]
      };

      // This should be handled as a single transaction
      const response = await request(app)
        .post('/api/schools/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send(complexData)
        .expect(201);

      const schoolId = response.body.id;

      // Verify all data was created
      const schoolResponse = await request(app)
        .get(`/api/schools/${schoolId}`)
        .query({ includeContacts: true, includeInteractions: true })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(schoolResponse.body.contacts).toHaveLength(2);
      expect(schoolResponse.body.interactions).toHaveLength(1);

      // Verify database consistency
      const dbSchool = await db.query('SELECT * FROM schools WHERE id = $1', [schoolId]);
      const dbContacts = await db.query('SELECT * FROM contacts WHERE school_id = $1', [schoolId]);
      const dbInteractions = await db.query('SELECT * FROM interactions WHERE school_id = $1', [schoolId]);

      expect(dbSchool.rows).toHaveLength(1);
      expect(dbContacts.rows).toHaveLength(2);
      expect(dbInteractions.rows).toHaveLength(1);
    });

    it('should rollback failed transactions properly', async () => {
      // Test transaction rollback with invalid data
      const invalidComplexData = {
        school: {
          name: '回滾測試學校',
          country: '台灣',
          region: '嘉義市',
          schoolType: 'high_school'
        },
        contacts: [
          { name: '有效聯絡人', email: 'valid@rollback.com', isPrimary: true },
          { name: '無效聯絡人', email: 'invalid-email', isPrimary: true } // Invalid email and duplicate primary
        ]
      };

      // This should fail and rollback
      await request(app)
        .post('/api/schools/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidComplexData)
        .expect(400);

      // Verify no data was created
      const searchResponse = await request(app)
        .get('/api/search')
        .query({ q: '回滾測試學校', type: 'schools' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(searchResponse.body.results).toHaveLength(0);

      // Verify database has no orphaned records
      const dbSchools = await db.query('SELECT * FROM schools WHERE name = $1', ['回滾測試學校']);
      const dbContacts = await db.query('SELECT * FROM contacts WHERE email LIKE $1', ['%rollback.com']);

      expect(dbSchools.rows).toHaveLength(0);
      expect(dbContacts.rows).toHaveLength(0);
    });
  });

  describe('Audit Trail Integrity', () => {
    it('should maintain complete audit trail for all operations', async () => {
      // Create school
      const schoolResponse = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '審計追蹤測試學校',
          country: '台灣',
          region: '屏東縣',
          schoolType: 'university'
        });

      const schoolId = schoolResponse.body.id;

      // Update school
      await request(app)
        .put(`/api/schools/${schoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '審計追蹤測試學校 (已更新)'
        });

      // Add contact
      const contactResponse = await request(app)
        .post(`/api/schools/${schoolId}/contacts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '審計測試聯絡人',
          email: 'audit@test.com',
          isPrimary: true
        });

      const contactId = contactResponse.body.id;

      // Update contact
      await request(app)
        .put(`/api/contacts/${contactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '08-1234-5678'
        });

      // Verify audit trail exists
      const auditResponse = await request(app)
        .get(`/api/audit/schools/${schoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(auditResponse.body.length).toBeGreaterThanOrEqual(4); // Create, update, contact create, contact update

      // Verify audit entries have required fields
      auditResponse.body.forEach((entry: any) => {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('entityType');
        expect(entry).toHaveProperty('entityId');
        expect(entry).toHaveProperty('action');
        expect(entry).toHaveProperty('changes');
        expect(entry).toHaveProperty('userId');
        expect(entry).toHaveProperty('timestamp');
      });

      // Verify database audit table consistency
      const dbAudit = await db.query(
        'SELECT * FROM audit_log WHERE entity_id = $1 ORDER BY timestamp',
        [schoolId]
      );

      expect(dbAudit.rows.length).toBeGreaterThanOrEqual(2); // At least school create and update
    });
  });
});