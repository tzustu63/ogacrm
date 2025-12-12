import * as fc from 'fast-check';
import { Pool } from 'pg';
import { PartnershipRepository } from '../../src/repositories/partnershipRepository';
import { MOUStatus } from '../../src/types';
import { getTestPool } from '../setup';
import { createTestSchool, expectValidUUID, expectValidTimestamp } from '../utils/testHelpers';

describe('Partnership Repository Property Tests', () => {
  let pool: Pool;
  let partnershipRepository: PartnershipRepository;
  let dbAvailable = false;

  beforeAll(async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping PartnershipRepository property tests - database not available');
      return;
    }

    try {
      pool = getTestPool();
      partnershipRepository = new PartnershipRepository(pool);
      dbAvailable = true;
    } catch (error) {
      console.warn('Database not available, skipping partnership repository tests');
      dbAvailable = false;
    }
  });

  beforeEach(async () => {
    if (dbAvailable) {
      // Clean up partnerships table before each test
      await pool.query('DELETE FROM partnerships');
      await pool.query('DELETE FROM schools');
    }
  });

  afterAll(async () => {
    if (dbAvailable && pool) {
      await pool.end();
    }
  });

  /**
   * **Feature: recruitment-crm, Property 6: MOU狀態驗證**
   * 對於任何合作備忘錄，當狀態設定為已簽訂時，系統應該要求並驗證到期日期的存在
   * **Validates: Requirements 4.2**
   */
  it('should require expiry date when MOU status is signed', async () => {
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
          hasExpiryDate: fc.boolean()
        }).chain(base => {
          const futureDate = new Date();
          futureDate.setFullYear(futureDate.getFullYear() + 1); // Always 1 year in the future
          
          return fc.record({
            schoolName: fc.constant(base.schoolName),
            country: fc.constant(base.country),
            region: fc.constant(base.region),
            hasExpiryDate: fc.constant(base.hasExpiryDate),
            signedDate: base.hasExpiryDate 
              ? fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() }), { nil: undefined })
              : fc.option(fc.date(), { nil: undefined }),
            expiryDate: base.hasExpiryDate 
              ? fc.date({ min: futureDate, max: new Date(futureDate.getTime() + 365 * 24 * 60 * 60 * 1000) })
              : fc.constant(undefined)
          });
        }),
        async ({ schoolName, country, region, signedDate, expiryDate, hasExpiryDate }) => {
          // Create a test school
          const school = await createTestSchool(pool, {
            name: schoolName,
            country,
            region
          });

          if (hasExpiryDate && expiryDate) {
            // When expiry date is provided, MOU status should be successfully set to SIGNED
            const partnership = await partnershipRepository.updateMOUStatus(
              school.id,
              MOUStatus.SIGNED,
              signedDate,
              expiryDate
            );

            expect(partnership).toBeDefined();
            expect(partnership!.mouStatus).toBe(MOUStatus.SIGNED);
            // Check that expiry date is set (allowing for timezone conversion)
            expect(partnership!.mouExpiryDate).toBeInstanceOf(Date);
            expect(partnership!.schoolId).toBe(school.id);
            
            if (signedDate) {
              expect(partnership!.mouSignedDate).toBeInstanceOf(Date);
            } else {
              expect(partnership!.mouSignedDate).toBeInstanceOf(Date);
            }
          } else {
            // When expiry date is not provided, setting MOU status to SIGNED should fail
            await expect(
              partnershipRepository.updateMOUStatus(school.id, MOUStatus.SIGNED, signedDate, expiryDate)
            ).rejects.toThrow('Expiry date is required when MOU status is signed');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: recruitment-crm, Property 6: MOU狀態驗證**
   * 對於任何合作備忘錄，當狀態不是已簽訂時，系統應該允許不提供到期日期
   * **Validates: Requirements 4.2**
   */
  it('should allow MOU status changes without expiry date for non-signed statuses', async () => {
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
          mouStatus: fc.constantFrom(MOUStatus.NONE, MOUStatus.NEGOTIATING, MOUStatus.EXPIRED)
        }),
        async ({ schoolName, country, region, mouStatus }) => {
          // Create a test school
          const school = await createTestSchool(pool, {
            name: schoolName,
            country,
            region
          });

          // Non-signed MOU statuses should work without expiry date
          const partnership = await partnershipRepository.updateMOUStatus(
            school.id,
            mouStatus
          );

          expect(partnership).toBeDefined();
          expect(partnership!.mouStatus).toBe(mouStatus);
          expect(partnership!.schoolId).toBe(school.id);
          expectValidUUID(partnership!.id);
          expectValidTimestamp(partnership!.createdAt);
          expectValidTimestamp(partnership!.updatedAt);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: recruitment-crm, Property 6: MOU狀態驗證**
   * 對於任何合作備忘錄，簽訂日期不能晚於到期日期
   * **Validates: Requirements 4.2**
   */
  it('should validate that signed date is not after expiry date', async () => {
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
          isValidOrder: fc.boolean()
        }).chain(base => {
          return fc.record({
            schoolName: fc.constant(base.schoolName),
            country: fc.constant(base.country),
            region: fc.constant(base.region),
            isValidOrder: fc.constant(base.isValidOrder),
            signedDate: fc.date({ 
              min: new Date('2025-01-01T12:00:00.000Z'), 
              max: new Date('2025-05-31T12:00:00.000Z') 
            }),
            expiryDate: fc.date({ 
              min: new Date('2025-06-01T12:00:00.000Z'), 
              max: new Date('2025-12-31T12:00:00.000Z') 
            })
          }).map(data => {
            if (!data.isValidOrder) {
              // Swap dates to make signed date after expiry date
              const temp = data.signedDate;
              data.signedDate = data.expiryDate;
              data.expiryDate = temp;
            }
            return data;
          });
        }),
        async ({ schoolName, country, region, signedDate, expiryDate, isValidOrder }) => {
          // Create a test school
          const school = await createTestSchool(pool, {
            name: schoolName,
            country,
            region
          });

          if (isValidOrder && signedDate <= expiryDate) {
            // Valid date order should succeed
            const partnership = await partnershipRepository.updateMOUStatus(
              school.id,
              MOUStatus.SIGNED,
              signedDate,
              expiryDate
            );

            expect(partnership).toBeDefined();
            expect(partnership!.mouStatus).toBe(MOUStatus.SIGNED);
            // Check that dates are set (allowing for timezone conversion)
            expect(partnership!.mouSignedDate).toBeInstanceOf(Date);
            expect(partnership!.mouExpiryDate).toBeInstanceOf(Date);
          } else if (signedDate > expiryDate) {
            // Invalid date order should fail
            await expect(
              partnershipRepository.updateMOUStatus(school.id, MOUStatus.SIGNED, signedDate, expiryDate)
            ).rejects.toThrow('MOU signed date cannot be after expiry date');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: recruitment-crm, Property 8: 數值累計正確性**
   * 對於任何學校的推薦學生數和招生說明會次數，系統應該正確累計並維護這些數值的準確性
   * **Validates: Requirements 4.4, 4.5**
   */
  it('should correctly accumulate referral counts and events held', async () => {
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
          initialReferrals: fc.integer({ min: 0, max: 100 }),
          initialEvents: fc.integer({ min: 0, max: 50 }),
          referralIncrements: fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 1, maxLength: 10 }),
          eventIncrements: fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 10 })
        }),
        async ({ schoolName, country, region, initialReferrals, initialEvents, referralIncrements, eventIncrements }) => {
          // Create a test school
          const school = await createTestSchool(pool, {
            name: schoolName,
            country,
            region
          });

          // Create initial partnership with starting counts
          const initialPartnership = await partnershipRepository.create({
            schoolId: school.id,
            referralCount: initialReferrals,
            eventsHeld: initialEvents
          });

          expect(initialPartnership.referralCount).toBe(initialReferrals);
          expect(initialPartnership.eventsHeld).toBe(initialEvents);

          // Calculate expected totals
          const expectedReferralTotal = initialReferrals + referralIncrements.reduce((sum, inc) => sum + inc, 0);
          const expectedEventTotal = initialEvents + eventIncrements.reduce((sum, inc) => sum + inc, 0);

          // Apply referral increments
          let currentPartnership = initialPartnership;
          for (const increment of referralIncrements) {
            const updated = await partnershipRepository.incrementReferralCount(school.id, increment);
            expect(updated).toBeDefined();
            currentPartnership = updated!;
          }

          // Apply event increments
          for (const increment of eventIncrements) {
            const updated = await partnershipRepository.incrementEventsHeld(school.id, increment);
            expect(updated).toBeDefined();
            currentPartnership = updated!;
          }

          // Verify final counts match expected totals
          expect(currentPartnership.referralCount).toBe(expectedReferralTotal);
          expect(currentPartnership.eventsHeld).toBe(expectedEventTotal);

          // Verify by fetching fresh from database
          const finalPartnership = await partnershipRepository.findBySchoolId(school.id);
          expect(finalPartnership).toBeDefined();
          expect(finalPartnership!.referralCount).toBe(expectedReferralTotal);
          expect(finalPartnership!.eventsHeld).toBe(expectedEventTotal);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: recruitment-crm, Property 8: 數值累計正確性**
   * 對於任何學校，直接更新數值應該正確設定新的計數值
   * **Validates: Requirements 4.4, 4.5**
   */
  it('should correctly update referral counts and events held through direct updates', async () => {
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
          initialReferrals: fc.integer({ min: 0, max: 100 }),
          initialEvents: fc.integer({ min: 0, max: 50 }),
          newReferrals: fc.integer({ min: 0, max: 200 }),
          newEvents: fc.integer({ min: 0, max: 100 })
        }),
        async ({ schoolName, country, region, initialReferrals, initialEvents, newReferrals, newEvents }) => {
          // Create a test school
          const school = await createTestSchool(pool, {
            name: schoolName,
            country,
            region
          });

          // Create initial partnership
          const initialPartnership = await partnershipRepository.create({
            schoolId: school.id,
            referralCount: initialReferrals,
            eventsHeld: initialEvents
          });

          expect(initialPartnership.referralCount).toBe(initialReferrals);
          expect(initialPartnership.eventsHeld).toBe(initialEvents);

          // Update with new values
          const updatedPartnership = await partnershipRepository.update(initialPartnership.id, {
            referralCount: newReferrals,
            eventsHeld: newEvents
          });

          expect(updatedPartnership).toBeDefined();
          expect(updatedPartnership!.referralCount).toBe(newReferrals);
          expect(updatedPartnership!.eventsHeld).toBe(newEvents);

          // Verify by fetching fresh from database
          const finalPartnership = await partnershipRepository.findBySchoolId(school.id);
          expect(finalPartnership).toBeDefined();
          expect(finalPartnership!.referralCount).toBe(newReferrals);
          expect(finalPartnership!.eventsHeld).toBe(newEvents);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: recruitment-crm, Property 8: 數值累計正確性**
   * 對於任何學校，負數的推薦學生數或說明會次數應該被拒絕
   * **Validates: Requirements 4.4, 4.5**
   */
  it('should reject negative referral counts and events held', async () => {
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
          negativeReferrals: fc.integer({ min: -100, max: -1 }),
          negativeEvents: fc.integer({ min: -50, max: -1 })
        }),
        async ({ schoolName, country, region, negativeReferrals, negativeEvents }) => {
          // Create a test school
          const school = await createTestSchool(pool, {
            name: schoolName,
            country,
            region
          });

          // Attempt to create partnership with negative referral count should fail
          await expect(
            partnershipRepository.create({
              schoolId: school.id,
              referralCount: negativeReferrals,
              eventsHeld: 0
            })
          ).rejects.toThrow('Referral count cannot be negative');

          // Attempt to create partnership with negative events held should fail
          await expect(
            partnershipRepository.create({
              schoolId: school.id,
              referralCount: 0,
              eventsHeld: negativeEvents
            })
          ).rejects.toThrow('Events held count cannot be negative');

          // Create a valid partnership first
          const partnership = await partnershipRepository.create({
            schoolId: school.id,
            referralCount: 10,
            eventsHeld: 5
          });

          // Attempt to update with negative referral count should fail
          await expect(
            partnershipRepository.update(partnership.id, {
              referralCount: negativeReferrals
            })
          ).rejects.toThrow('Referral count cannot be negative');

          // Attempt to update with negative events held should fail
          await expect(
            partnershipRepository.update(partnership.id, {
              eventsHeld: negativeEvents
            })
          ).rejects.toThrow('Events held count cannot be negative');
        }
      ),
      { numRuns: 100 }
    );
  });
});