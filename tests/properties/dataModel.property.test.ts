import * as fc from 'fast-check';
import { validateData, schoolSchema, contactSchema, interactionSchema, partnershipSchema, preferenceSchema } from '../../src/utils/validation';
import { School, Contact, Interaction, Partnership, Preference, SchoolType, RelationshipStatus, ContactMethod, MOUStatus } from '../../src/types';

describe('Data Model Property Tests', () => {
  /**
   * **Feature: recruitment-crm, Property 1: 學校資料完整性**
   * 對於任何學校記錄，當執行創建、更新或查詢操作時，系統應該保持資料的完整性和一致性，包括必填欄位驗證和關聯資料的正確維護
   * **Validates: Requirements 1.1, 1.3, 1.4, 1.5**
   */
  it('should maintain school data integrity for any valid school data', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
          country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          schoolType: fc.constantFrom(...Object.values(SchoolType)),
          website: fc.option(fc.webUrl(), { nil: undefined }),
          relationshipStatus: fc.option(fc.constantFrom(...Object.values(RelationshipStatus)), { nil: undefined })
        }),
        (schoolData) => {
          // Validate the school data
          const validation = validateData<School>(schoolSchema, schoolData);
          
          // Should be valid
          expect(validation.isValid).toBe(true);
          expect(validation.error).toBeUndefined();
          expect(validation.value).toBeDefined();
          
          // Required fields should be preserved
          expect(validation.value!.name).toBe(schoolData.name);
          expect(validation.value!.country).toBe(schoolData.country);
          expect(validation.value!.region).toBe(schoolData.region);
          expect(validation.value!.schoolType).toBe(schoolData.schoolType);
          
          // Optional fields should be handled correctly
          if (schoolData.website) {
            expect(validation.value!.website).toBe(schoolData.website);
          }
          
          if (schoolData.relationshipStatus) {
            expect(validation.value!.relationshipStatus).toBe(schoolData.relationshipStatus);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject school data with missing required fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.option(fc.string(), { nil: undefined }),
          country: fc.option(fc.string(), { nil: undefined }),
          region: fc.option(fc.string(), { nil: undefined }),
          schoolType: fc.option(fc.constantFrom(...Object.values(SchoolType)), { nil: undefined }),
        }).filter(data => 
          !data.name || !data.country || !data.region || !data.schoolType ||
          data.name.length === 0 || data.country.length === 0 || data.region.length === 0
        ),
        (invalidSchoolData) => {
          // Validate the invalid school data
          const validation = validateData<School>(schoolSchema, invalidSchoolData);
          
          // Should be invalid
          expect(validation.isValid).toBe(false);
          expect(validation.error).toBeDefined();
          expect(validation.value).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain contact data integrity for any valid contact data', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          email: fc.emailAddress().filter(email => {
            // Ensure the email is valid according to Joi's validation
            const Joi = require('joi');
            const { error } = Joi.string().email().validate(email);
            return !error;
          }),
          phone: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
          position: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
          isPrimary: fc.option(fc.boolean(), { nil: undefined })
        }),
        (contactData) => {
          // Validate the contact data
          const validation = validateData<Contact>(contactSchema, contactData);
          
          // Should be valid
          expect(validation.isValid).toBe(true);
          expect(validation.error).toBeUndefined();
          expect(validation.value).toBeDefined();
          
          // Required fields should be preserved
          expect(validation.value!.name).toBe(contactData.name);
          expect(validation.value!.email).toBe(contactData.email);
          
          // Optional fields should be handled correctly
          if (contactData.phone) {
            expect(validation.value!.phone).toBe(contactData.phone);
          }
          
          if (contactData.position) {
            expect(validation.value!.position).toBe(contactData.position);
          }
          
          // isPrimary should default to false if not provided
          expect(typeof validation.value!.isPrimary).toBe('boolean');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain interaction data integrity for any valid interaction data', () => {
    fc.assert(
      fc.property(
        fc.record({
          contactMethod: fc.constantFrom(...Object.values(ContactMethod)),
          date: fc.date(),
          notes: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
          followUpRequired: fc.option(fc.boolean(), { nil: undefined }),
          followUpDate: fc.option(fc.date(), { nil: undefined })
        }).chain(base => {
          // If followUpRequired is true, ensure followUpDate is provided
          if (base.followUpRequired === true) {
            return fc.constant({
              ...base,
              followUpDate: base.followUpDate || new Date(Date.now() + 86400000) // Tomorrow
            });
          }
          return fc.constant(base);
        }),
        (interactionData) => {
          // Validate the interaction data
          const validation = validateData<Interaction>(interactionSchema, interactionData);
          
          // Should be valid
          expect(validation.isValid).toBe(true);
          expect(validation.error).toBeUndefined();
          expect(validation.value).toBeDefined();
          
          // Required fields should be preserved
          expect(validation.value!.contactMethod).toBe(interactionData.contactMethod);
          expect(validation.value!.date).toEqual(interactionData.date);
          expect(validation.value!.notes).toBe(interactionData.notes);
          
          // Follow-up logic should be consistent
          if (interactionData.followUpRequired === true) {
            expect(validation.value!.followUpRequired).toBe(true);
            expect(validation.value!.followUpDate).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain partnership data integrity for any valid partnership data', () => {
    fc.assert(
      fc.property(
        fc.record({
          mouStatus: fc.constantFrom(...Object.values(MOUStatus)),
          mouSignedDate: fc.option(fc.date(), { nil: undefined }),
          mouExpiryDate: fc.option(fc.date(), { nil: undefined }),
          referralCount: fc.option(fc.nat(), { nil: undefined }),
          eventsHeld: fc.option(fc.nat(), { nil: undefined })
        }).chain(base => {
          // If mouStatus is SIGNED, ensure dates are provided
          if (base.mouStatus === MOUStatus.SIGNED) {
            const signedDate = base.mouSignedDate || new Date();
            const expiryDate = base.mouExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year later
            return fc.constant({
              ...base,
              mouSignedDate: signedDate,
              mouExpiryDate: expiryDate
            });
          }
          return fc.constant(base);
        }),
        (partnershipData) => {
          // Validate the partnership data
          const validation = validateData<Partnership>(partnershipSchema, partnershipData);
          
          // Should be valid
          expect(validation.isValid).toBe(true);
          expect(validation.error).toBeUndefined();
          expect(validation.value).toBeDefined();
          
          // Required fields should be preserved
          expect(validation.value!.mouStatus).toBe(partnershipData.mouStatus);
          
          // MOU logic should be consistent
          if (partnershipData.mouStatus === MOUStatus.SIGNED) {
            expect(validation.value!.mouSignedDate).toBeDefined();
            expect(validation.value!.mouExpiryDate).toBeDefined();
          }
          
          // Numeric fields should be non-negative
          expect(validation.value!.referralCount).toBeGreaterThanOrEqual(0);
          expect(validation.value!.eventsHeld).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain preference data integrity for any valid preference data', () => {
    fc.assert(
      fc.property(
        fc.record({
          preferredContactMethod: fc.constantFrom(...Object.values(ContactMethod)),
          programsOfInterest: fc.array(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 }),
          bestContactTime: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          timezone: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          specialRequirements: fc.option(fc.string({ maxLength: 500 }), { nil: undefined })
        }),
        (preferenceData) => {
          // Validate the preference data
          const validation = validateData<Preference>(preferenceSchema, preferenceData);
          
          // Should be valid
          expect(validation.isValid).toBe(true);
          expect(validation.error).toBeUndefined();
          expect(validation.value).toBeDefined();
          
          // Required fields should be preserved
          expect(validation.value!.preferredContactMethod).toBe(preferenceData.preferredContactMethod);
          expect(validation.value!.programsOfInterest).toEqual(preferenceData.programsOfInterest);
          expect(validation.value!.bestContactTime).toBe(preferenceData.bestContactTime);
          expect(validation.value!.timezone).toBe(preferenceData.timezone);
          
          // Programs of interest should have at least one item
          expect(validation.value!.programsOfInterest.length).toBeGreaterThan(0);
          
          // Optional fields should be handled correctly
          if (preferenceData.specialRequirements) {
            expect(validation.value!.specialRequirements).toBe(preferenceData.specialRequirements);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});