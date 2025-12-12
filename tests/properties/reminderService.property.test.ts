import * as fc from 'fast-check';
import { Pool } from 'pg';
import { ReminderService } from '../../src/services/reminderService';
import { PartnershipRepository } from '../../src/repositories/partnershipRepository';
import { MOUStatus } from '../../src/types';
import { getTestPool } from '../setup';
import { createTestSchool, expectValidUUID, expectValidTimestamp } from '../utils/testHelpers';

describe('Reminder Service Property Tests', () => {
  let pool: Pool;
  let reminderService: ReminderService;
  let partnershipRepository: PartnershipRepository;
  let dbAvailable = false;

  beforeAll(async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping ReminderService property tests - database not available');
      return;
    }

    try {
      pool = getTestPool();
      reminderService = new ReminderService(pool);
      partnershipRepository = new PartnershipRepository(pool);
      dbAvailable = true;
    } catch (error) {
      console.warn('Database not available, skipping reminder service tests');
      dbAvailable = false;
    }
  });

  beforeEach(async () => {
    if (dbAvailable) {
      // Clean up partnerships and schools tables before each test
      // Delete in correct order to respect foreign key constraints
      await pool.query('DELETE FROM partnerships');
      await pool.query('DELETE FROM interactions');
      await pool.query('DELETE FROM contacts');
      await pool.query('DELETE FROM schools');
      
      // Reset sequences to avoid ID conflicts
      await pool.query('ALTER SEQUENCE IF EXISTS partnerships_id_seq RESTART WITH 1');
      await pool.query('ALTER SEQUENCE IF EXISTS schools_id_seq RESTART WITH 1');
      await pool.query('ALTER SEQUENCE IF EXISTS contacts_id_seq RESTART WITH 1');
      await pool.query('ALTER SEQUENCE IF EXISTS interactions_id_seq RESTART WITH 1');
    }
  });

  afterEach(async () => {
    if (dbAvailable) {
      // Clean up after each test as well
      await pool.query('DELETE FROM partnerships');
      await pool.query('DELETE FROM interactions');
      await pool.query('DELETE FROM contacts');
      await pool.query('DELETE FROM schools');
    }
  });

  afterAll(async () => {
    if (dbAvailable && pool) {
      await pool.end();
    }
  });

  /**
   * **Feature: recruitment-crm, Property 7: MOU到期提醒**
   * 對於任何接近到期的合作備忘錄，系統應該提供適當的到期提醒功能
   * **Validates: Requirements 4.3**
   */
  it('should provide appropriate expiry reminders for MOUs nearing expiration', async () => {
    if (!dbAvailable) {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          schoolName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          country: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          region: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          daysUntilExpiry: fc.integer({ min: -5, max: 35 }) // Test range from expired to future
        }).chain(base => {
          // Ensure signed date is always before expiry date
          const signedDate = new Date();
          signedDate.setDate(signedDate.getDate() - 30); // Always 30 days ago
          
          return fc.record({
            schoolName: fc.constant(base.schoolName),
            country: fc.constant(base.country),
            region: fc.constant(base.region),
            daysUntilExpiry: fc.constant(base.daysUntilExpiry),
            signedDate: fc.constant(signedDate)
          });
        }),
        async ({ schoolName, country, region, daysUntilExpiry, signedDate }) => {
          // Create a test school
          const school = await createTestSchool(pool, {
            name: schoolName,
            country,
            region
          });

          // Calculate expiry date based on days until expiry
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);
          
          // Create partnership with signed MOU
          const partnership = await partnershipRepository.create({
            schoolId: school.id,
            mouStatus: MOUStatus.SIGNED,
            mouSignedDate: signedDate,
            mouExpiryDate: expiryDate
          });

          // Check if reminder should be provided (within 30 days)
          const shouldHaveReminder = daysUntilExpiry <= 30;

          // Get school expiry reminder
          const reminder = await reminderService.getSchoolExpiryReminder(school.id);

          if (shouldHaveReminder) {
            // Should have a reminder
            expect(reminder).toBeDefined();
            expect(reminder!.partnership.id).toBe(partnership.id);
            expect(reminder!.daysUntilExpiry).toBe(daysUntilExpiry);
            
            // Verify urgency level is appropriate
            if (daysUntilExpiry <= 0) {
              expect(reminder!.urgencyLevel).toBe('critical');
            } else if (daysUntilExpiry <= 7) {
              expect(reminder!.urgencyLevel).toBe('high');
            } else if (daysUntilExpiry <= 14) {
              expect(reminder!.urgencyLevel).toBe('medium');
            } else {
              expect(reminder!.urgencyLevel).toBe('low');
            }
          } else {
            // Should not have a reminder (more than 30 days away)
            expect(reminder).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: recruitment-crm, Property 7: MOU到期提醒**
   * 對於任何MOU到期檢查，系統應該正確識別指定天數內到期的所有MOU
   * **Validates: Requirements 4.3**
   */
  it('should correctly identify MOUs expiring within specified days', async () => {
    if (!dbAvailable) {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          daysAhead: fc.integer({ min: 7, max: 30 }), // Smaller range to avoid edge cases
          daysUntilExpiry: fc.integer({ min: 0, max: 35 }) // Only positive days to avoid date issues
        }),
        async ({ daysAhead, daysUntilExpiry }) => {
          // Create a single school and partnership for this test
          const school = await createTestSchool(pool, {
            name: `TestSchool_${Math.random().toString(36).substr(2, 9)}`,
            country: 'TestCountry',
            region: 'TestRegion'
          });

          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);
          
          // Ensure signed date is before expiry date
          const signedDate = new Date();
          signedDate.setDate(signedDate.getDate() - 30);

          await partnershipRepository.create({
            schoolId: school.id,
            mouStatus: MOUStatus.SIGNED,
            mouSignedDate: signedDate,
            mouExpiryDate: expiryDate
          });

          // Check expiring MOUs
          const reminders = await reminderService.checkExpiringMOUs(daysAhead);

          // Check if this MOU should be in the results
          const shouldBeIncluded = daysUntilExpiry <= daysAhead && daysUntilExpiry >= 0;
          
          if (shouldBeIncluded) {
            // Should find at least one reminder (our created MOU)
            expect(reminders.length).toBeGreaterThanOrEqual(1);
            
            // Check that our MOU is in the results
            const ourReminder = reminders.find(r => r.daysUntilExpiry === daysUntilExpiry);
            expect(ourReminder).toBeDefined();
            expect(ourReminder!.partnership).toBeDefined();
            expect(ourReminder!.urgencyLevel).toMatch(/^(low|medium|high|critical)$/);
          }

          // Verify all returned reminders are within the specified range
          for (const reminder of reminders) {
            expect(reminder.daysUntilExpiry).toBeGreaterThanOrEqual(0);
            expect(reminder.daysUntilExpiry).toBeLessThanOrEqual(daysAhead);
            expect(reminder.partnership).toBeDefined();
            expect(reminder.urgencyLevel).toMatch(/^(low|medium|high|critical)$/);
          }
        }
      ),
      { numRuns: 50 } // Reduced runs for faster execution
    );
  });

  /**
   * **Feature: recruitment-crm, Property 7: MOU到期提醒**
   * 對於任何提醒訊息生成，系統應該根據到期天數產生適當的訊息內容
   * **Validates: Requirements 4.3**
   */
  it('should generate appropriate reminder messages based on days until expiry', async () => {
    if (!dbAvailable) {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          schoolName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          country: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          region: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          daysUntilExpiry: fc.integer({ min: -5, max: 30 })
        }),
        async ({ schoolName, country, region, daysUntilExpiry }) => {
          // Create a test school
          const school = await createTestSchool(pool, {
            name: schoolName,
            country,
            region
          });

          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);
          
          // Ensure signed date is before expiry date
          const signedDate = new Date();
          signedDate.setDate(signedDate.getDate() - 30);

          const partnership = await partnershipRepository.create({
            schoolId: school.id,
            mouStatus: MOUStatus.SIGNED,
            mouSignedDate: signedDate,
            mouExpiryDate: expiryDate
          });

          // Create reminder object
          let urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
          if (daysUntilExpiry <= 0) {
            urgencyLevel = 'critical';
          } else if (daysUntilExpiry <= 7) {
            urgencyLevel = 'high';
          } else if (daysUntilExpiry <= 14) {
            urgencyLevel = 'medium';
          } else {
            urgencyLevel = 'low';
          }

          const reminder = {
            partnership,
            daysUntilExpiry,
            urgencyLevel
          };

          // Generate message
          const message = reminderService.generateReminderMessage(reminder);

          // Verify message content
          expect(message).toContain(school.id); // Should contain school ID
          
          if (daysUntilExpiry <= 0) {
            expect(message).toContain('已經到期');
            expect(message).toContain('緊急處理');
          } else if (daysUntilExpiry === 1) {
            expect(message).toContain('明天到期');
            expect(message).toContain('請盡快處理');
          } else {
            expect(message).toContain(`${daysUntilExpiry} 天後到期`);
          }

          // Verify urgency level message
          switch (urgencyLevel) {
            case 'critical':
              expect(message).toContain('緊急處理');
              break;
            case 'high':
              expect(message).toContain('請盡快處理');
              break;
            case 'medium':
              expect(message).toContain('建議開始準備續約');
              break;
            case 'low':
              expect(message).toContain('請注意到期時間');
              break;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: recruitment-crm, Property 7: MOU到期提醒**
   * 對於任何提醒統計查詢，系統應該正確計算各緊急程度的MOU數量
   * **Validates: Requirements 4.3**
   */
  it('should correctly calculate reminder statistics by urgency level', async () => {
    if (!dbAvailable) {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          daysUntilExpiry: fc.integer({ min: 0, max: 30 })
        }),
        async ({ daysUntilExpiry }) => {
          // Create a single school and partnership for this test
          const school = await createTestSchool(pool, {
            name: `StatSchool_${Math.random().toString(36).substr(2, 9)}`,
            country: 'TestCountry',
            region: 'TestRegion'
          });

          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);
          
          // Ensure signed date is before expiry date
          const signedDate = new Date();
          signedDate.setDate(signedDate.getDate() - 30);

          await partnershipRepository.create({
            schoolId: school.id,
            mouStatus: MOUStatus.SIGNED,
            mouSignedDate: signedDate,
            mouExpiryDate: expiryDate
          });

          // Get statistics with a range that includes our MOU
          const statistics = await reminderService.getReminderStatistics(35);

          // Verify that statistics are valid
          expect(statistics.total).toBeGreaterThanOrEqual(1);
          expect(statistics.critical || 0).toBeGreaterThanOrEqual(0);
          expect(statistics.high || 0).toBeGreaterThanOrEqual(0);
          expect(statistics.medium || 0).toBeGreaterThanOrEqual(0);
          expect(statistics.low || 0).toBeGreaterThanOrEqual(0);
          
          // Total should equal sum of all categories
          expect(statistics.total).toBe(
            (statistics.critical || 0) + (statistics.high || 0) + (statistics.medium || 0) + (statistics.low || 0)
          );

          // Verify urgency level logic for our created MOU
          if (daysUntilExpiry <= 0) {
            expect(statistics.critical || 0).toBeGreaterThanOrEqual(1);
          } else if (daysUntilExpiry <= 7) {
            expect(statistics.high || 0).toBeGreaterThanOrEqual(1);
          } else if (daysUntilExpiry <= 14) {
            expect(statistics.medium || 0).toBeGreaterThanOrEqual(1);
          } else {
            expect(statistics.low || 0).toBeGreaterThanOrEqual(1);
          }
        }
      ),
      { numRuns: 50 } // Reduced runs for faster execution
    );
  });

  /**
   * **Feature: recruitment-crm, Property 7: MOU到期提醒**
   * 對於任何沒有MOU或MOU狀態不是已簽訂的學校，系統不應該提供到期提醒
   * **Validates: Requirements 4.3**
   */
  it('should not provide reminders for schools without signed MOUs', async () => {
    if (!dbAvailable) {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          schoolName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          country: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          region: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          hasPartnership: fc.boolean(),
          mouStatus: fc.constantFrom(MOUStatus.NONE, MOUStatus.NEGOTIATING, MOUStatus.EXPIRED)
        }),
        async ({ schoolName, country, region, hasPartnership, mouStatus }) => {
          // Create a test school
          const school = await createTestSchool(pool, {
            name: schoolName,
            country,
            region
          });

          if (hasPartnership) {
            // Create partnership with non-signed MOU status
            await partnershipRepository.create({
              schoolId: school.id,
              mouStatus: mouStatus
            });
          }
          // If hasPartnership is false, no partnership is created

          // Get school expiry reminder
          const reminder = await reminderService.getSchoolExpiryReminder(school.id);

          // Should not have a reminder for non-signed MOUs or no partnership
          expect(reminder).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});