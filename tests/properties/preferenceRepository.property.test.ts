import * as fc from 'fast-check';
import { Pool } from 'pg';
import { PreferenceRepository, CreatePreferenceData, UpdatePreferenceData } from '../../src/repositories/preferenceRepository';
import { SchoolRepository, CreateSchoolData } from '../../src/repositories/schoolRepository';
import { Preference, ContactMethod, SchoolType } from '../../src/types';
import { setupTestDatabase, cleanupTestDatabase } from '../setup';

describe('Preference Repository Property Tests', () => {
  let pool: Pool;
  let preferenceRepository: PreferenceRepository;
  let schoolRepository: SchoolRepository;

  beforeAll(async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping PreferenceRepository property tests - database not available');
      return;
    }
    
    pool = await setupTestDatabase();
    preferenceRepository = new PreferenceRepository(pool);
    schoolRepository = new SchoolRepository(pool);
  });

  beforeEach(async () => {
    if (process.env.SKIP_DB_SETUP === 'true') return;
    await cleanupTestDatabase();
  });

  /**
   * **Feature: recruitment-crm, Property 9: 偏好設定儲存**
   * 對於任何學校的偏好設定，包括聯繫方式、感興趣科系、最佳聯繫時間和特殊需求，系統應該正確儲存並處理時區差異
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
   */
  it('should correctly store and retrieve preference settings with timezone handling', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          // School data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schoolType: fc.constantFrom(...Object.values(SchoolType))
          }),
          // Preference data
          fc.record({
            preferredContactMethod: fc.constantFrom(...Object.values(ContactMethod)),
            programsOfInterest: fc.array(
              fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              { minLength: 1, maxLength: 10 }
            ).map(arr => [...new Set(arr)]), // Remove duplicates
            bestContactTime: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            timezone: fc.oneof(
              fc.constantFrom('UTC', 'GMT'),
              fc.constantFrom('America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'),
              fc.string({ minLength: 6, maxLength: 6 }).filter(s => /^[+-]\d{2}:\d{2}$/.test(s))
            ),
            specialRequirements: fc.option(
              fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
              { nil: undefined }
            )
          })
        ),
        async ([schoolData, preferenceData]: [CreateSchoolData, any]) => {
          // Create school first
          const createdSchool = await schoolRepository.create(schoolData);
          
          // Create preference
          const fullPreferenceData: CreatePreferenceData = {
            ...preferenceData,
            schoolId: createdSchool.id
          };
          
          const createdPreference = await preferenceRepository.create(fullPreferenceData);
          
          // Verify created preference has all required properties
          expect(createdPreference).toBeDefined();
          expect(createdPreference.id).toBeDefined();
          expect(typeof createdPreference.id).toBe('string');
          expect(createdPreference.schoolId).toBe(createdSchool.id);
          expect(createdPreference.preferredContactMethod).toBe(preferenceData.preferredContactMethod);
          expect(createdPreference.programsOfInterest).toEqual(preferenceData.programsOfInterest);
          expect(createdPreference.bestContactTime).toBe(preferenceData.bestContactTime);
          expect(createdPreference.timezone).toBe(preferenceData.timezone);
          expect(createdPreference.createdAt).toBeInstanceOf(Date);
          expect(createdPreference.updatedAt).toBeInstanceOf(Date);
          
          // Handle optional special requirements
          if (preferenceData.specialRequirements) {
            expect(createdPreference.specialRequirements).toBe(preferenceData.specialRequirements);
          } else {
            expect(createdPreference.specialRequirements).toBeNull();
          }
          
          // Read preference back and verify data integrity
          const retrievedPreference = await preferenceRepository.findById(createdPreference.id);
          expect(retrievedPreference).toBeDefined();
          expect(retrievedPreference!.id).toBe(createdPreference.id);
          expect(retrievedPreference!.schoolId).toBe(createdPreference.schoolId);
          expect(retrievedPreference!.preferredContactMethod).toBe(createdPreference.preferredContactMethod);
          expect(retrievedPreference!.programsOfInterest).toEqual(createdPreference.programsOfInterest);
          expect(retrievedPreference!.bestContactTime).toBe(createdPreference.bestContactTime);
          expect(retrievedPreference!.timezone).toBe(createdPreference.timezone);
          expect(retrievedPreference!.specialRequirements).toBe(createdPreference.specialRequirements);
          
          // Test findBySchoolId
          const preferenceBySchool = await preferenceRepository.findBySchoolId(createdSchool.id);
          expect(preferenceBySchool).toBeDefined();
          expect(preferenceBySchool!.id).toBe(createdPreference.id);
          expect(preferenceBySchool!.schoolId).toBe(createdSchool.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain preference data integrity for update operations', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          // School data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schoolType: fc.constantFrom(...Object.values(SchoolType))
          }),
          // Initial preference data
          fc.record({
            preferredContactMethod: fc.constantFrom(...Object.values(ContactMethod)),
            programsOfInterest: fc.array(
              fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              { minLength: 1, maxLength: 5 }
            ).map(arr => [...new Set(arr)]),
            bestContactTime: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            timezone: fc.oneof(
              fc.constantFrom('UTC', 'GMT'),
              fc.constantFrom('America/New_York', 'Europe/London', 'Asia/Tokyo'),
              fc.string({ minLength: 6, maxLength: 6 }).filter(s => /^[+-]\d{2}:\d{2}$/.test(s))
            ),
            specialRequirements: fc.option(
              fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
              { nil: undefined }
            )
          }),
          // Update data
          fc.record({
            preferredContactMethod: fc.option(fc.constantFrom(...Object.values(ContactMethod)), { nil: undefined }),
            programsOfInterest: fc.option(
              fc.array(
                fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                { minLength: 1, maxLength: 5 }
              ).map(arr => [...new Set(arr)]),
              { nil: undefined }
            ),
            bestContactTime: fc.option(
              fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              { nil: undefined }
            ),
            timezone: fc.option(
              fc.oneof(
                fc.constantFrom('UTC', 'GMT'),
                fc.constantFrom('America/New_York', 'Europe/London', 'Asia/Tokyo'),
                fc.string({ minLength: 6, maxLength: 6 }).filter(s => /^[+-]\d{2}:\d{2}$/.test(s))
              ),
              { nil: undefined }
            ),
            specialRequirements: fc.option(
              fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
              { nil: undefined }
            )
          })
        ),
        async ([schoolData, initialPreferenceData, updateData]: [
          CreateSchoolData, 
          any, 
          any
        ]) => {
          // Create school first
          const createdSchool = await schoolRepository.create(schoolData);
          
          // Create initial preference
          const fullPreferenceData: CreatePreferenceData = {
            ...initialPreferenceData,
            schoolId: createdSchool.id
          };
          
          const createdPreference = await preferenceRepository.create(fullPreferenceData);
          
          // Update preference
          const updatedPreference = await preferenceRepository.update(createdPreference.id, updateData);
          
          expect(updatedPreference).toBeDefined();
          expect(updatedPreference!.id).toBe(createdPreference.id);
          expect(updatedPreference!.schoolId).toBe(createdPreference.schoolId);
          
          // Verify updated fields
          if (updateData.preferredContactMethod !== undefined) {
            expect(updatedPreference!.preferredContactMethod).toBe(updateData.preferredContactMethod);
          } else {
            expect(updatedPreference!.preferredContactMethod).toBe(createdPreference.preferredContactMethod);
          }
          
          if (updateData.programsOfInterest !== undefined) {
            expect(updatedPreference!.programsOfInterest).toEqual(updateData.programsOfInterest);
          } else {
            expect(updatedPreference!.programsOfInterest).toEqual(createdPreference.programsOfInterest);
          }
          
          if (updateData.bestContactTime !== undefined) {
            expect(updatedPreference!.bestContactTime).toBe(updateData.bestContactTime);
          } else {
            expect(updatedPreference!.bestContactTime).toBe(createdPreference.bestContactTime);
          }
          
          if (updateData.timezone !== undefined) {
            expect(updatedPreference!.timezone).toBe(updateData.timezone);
          } else {
            expect(updatedPreference!.timezone).toBe(createdPreference.timezone);
          }
          
          if (updateData.specialRequirements !== undefined) {
            expect(updatedPreference!.specialRequirements).toBe(updateData.specialRequirements);
          } else {
            expect(updatedPreference!.specialRequirements).toBe(createdPreference.specialRequirements);
          }
          
          // Verify timestamps
          expect(updatedPreference!.createdAt).toEqual(createdPreference.createdAt);
          expect(updatedPreference!.updatedAt.getTime()).toBeGreaterThanOrEqual(createdPreference.updatedAt.getTime());
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should correctly handle timezone-specific queries and program filtering', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.tuple(
            // School data
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
              country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              schoolType: fc.constantFrom(...Object.values(SchoolType))
            }),
            // Preference data
            fc.record({
              preferredContactMethod: fc.constantFrom(...Object.values(ContactMethod)),
              programsOfInterest: fc.array(
                fc.constantFrom('Computer Science', 'Engineering', 'Business', 'Medicine', 'Arts'),
                { minLength: 1, maxLength: 3 }
              ).map(arr => [...new Set(arr)]),
              bestContactTime: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              timezone: fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'),
              specialRequirements: fc.option(
                fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
                { nil: undefined }
              )
            })
          ),
          { minLength: 1, maxLength: 10 }
        ),
        async (preferencesData: Array<[CreateSchoolData, any]>) => {
          // Create schools and preferences
          const createdPreferences: Preference[] = [];
          
          for (const [schoolData, preferenceData] of preferencesData) {
            const createdSchool = await schoolRepository.create(schoolData);
            const fullPreferenceData: CreatePreferenceData = {
              ...preferenceData,
              schoolId: createdSchool.id
            };
            const preference = await preferenceRepository.create(fullPreferenceData);
            createdPreferences.push(preference);
          }
          
          // Test findAll without filters
          const allPreferences = await preferenceRepository.findAll();
          expect(allPreferences.length).toBe(createdPreferences.length);
          
          // Test timezone filtering
          if (createdPreferences.length > 0) {
            const testTimezone = createdPreferences[0]!.timezone;
            const timezonePreferences = await preferenceRepository.findByTimezone(testTimezone);
            
            // All returned preferences should match the timezone
            for (const preference of timezonePreferences) {
              expect(preference.timezone).toBe(testTimezone);
            }
            
            // Should include at least the first preference
            const foundFirstPreference = timezonePreferences.find(p => p.id === createdPreferences[0]!.id);
            expect(foundFirstPreference).toBeDefined();
          }
          
          // Test program filtering
          if (createdPreferences.length > 0) {
            const testProgram = createdPreferences[0]!.programsOfInterest[0];
            if (testProgram) {
              const programPreferences = await preferenceRepository.findByProgram(testProgram);
              
              // All returned preferences should include the test program
              for (const preference of programPreferences) {
                expect(preference.programsOfInterest).toContain(testProgram);
              }
              
              // Should include at least the first preference
              const foundFirstPreference = programPreferences.find(p => p.id === createdPreferences[0]!.id);
              expect(foundFirstPreference).toBeDefined();
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should correctly manage programs of interest with add/remove operations', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          // School data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schoolType: fc.constantFrom(...Object.values(SchoolType))
          }),
          // Initial preference data
          fc.record({
            preferredContactMethod: fc.constantFrom(...Object.values(ContactMethod)),
            programsOfInterest: fc.array(
              fc.constantFrom('Computer Science', 'Engineering', 'Business'),
              { minLength: 1, maxLength: 2 }
            ).map(arr => [...new Set(arr)]),
            bestContactTime: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            timezone: fc.constantFrom('UTC', 'America/New_York', 'Europe/London'),
            specialRequirements: fc.option(
              fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
              { nil: undefined }
            )
          }),
          // New program to add
          fc.constantFrom('Medicine', 'Arts', 'Law')
        ),
        async ([schoolData, preferenceData, newProgram]: [
          CreateSchoolData, 
          any, 
          string
        ]) => {
          // Create school and preference
          const createdSchool = await schoolRepository.create(schoolData);
          const fullPreferenceData: CreatePreferenceData = {
            ...preferenceData,
            schoolId: createdSchool.id
          };
          const createdPreference = await preferenceRepository.create(fullPreferenceData);
          
          // Add new program if not already present
          if (!createdPreference.programsOfInterest.includes(newProgram)) {
            const updatedPreference = await preferenceRepository.addProgramToInterest(createdPreference.id, newProgram);
            
            if (updatedPreference) {
              expect(updatedPreference.programsOfInterest).toContain(newProgram);
              expect(updatedPreference.programsOfInterest.length).toBe(createdPreference.programsOfInterest.length + 1);
              
              // Remove the program
              const removedPreference = await preferenceRepository.removeProgramFromInterest(updatedPreference.id, newProgram);
              expect(removedPreference).toBeDefined();
              expect(removedPreference!.programsOfInterest).not.toContain(newProgram);
              expect(removedPreference!.programsOfInterest.length).toBe(updatedPreference.programsOfInterest.length - 1);
            }
          }
          
          // Test adding duplicate program (should not change array)
          const originalLength = createdPreference.programsOfInterest.length;
          const existingProgram = createdPreference.programsOfInterest[0];
          if (existingProgram) {
            const duplicateResult = await preferenceRepository.addProgramToInterest(createdPreference.id, existingProgram);
            // Should return null or unchanged preference since program already exists
            if (duplicateResult) {
              expect(duplicateResult.programsOfInterest.length).toBe(originalLength);
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should reject invalid preference data and maintain data integrity', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          // Valid school data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schoolType: fc.constantFrom(...Object.values(SchoolType))
          }),
          // Invalid preference data
          fc.oneof(
            // Empty programs array
            fc.record({
              preferredContactMethod: fc.constantFrom(...Object.values(ContactMethod)),
              programsOfInterest: fc.constant([]),
              bestContactTime: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              timezone: fc.constantFrom('UTC', 'America/New_York')
            }),
            // Empty best contact time
            fc.record({
              preferredContactMethod: fc.constantFrom(...Object.values(ContactMethod)),
              programsOfInterest: fc.array(
                fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                { minLength: 1, maxLength: 3 }
              ),
              bestContactTime: fc.constant(''),
              timezone: fc.constantFrom('UTC', 'America/New_York')
            }),
            // Invalid timezone
            fc.record({
              preferredContactMethod: fc.constantFrom(...Object.values(ContactMethod)),
              programsOfInterest: fc.array(
                fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                { minLength: 1, maxLength: 3 }
              ),
              bestContactTime: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              timezone: fc.constant('Invalid/Timezone')
            })
          )
        ),
        async ([schoolData, invalidPreferenceData]: [
          CreateSchoolData, 
          any
        ]) => {
          // Create school first
          const createdSchool = await schoolRepository.create(schoolData);
          
          const fullInvalidData: CreatePreferenceData = {
            ...invalidPreferenceData,
            schoolId: createdSchool.id
          };
          
          // Should throw an error when trying to create invalid preference
          await expect(preferenceRepository.create(fullInvalidData)).rejects.toThrow();
          
          // Verify no preference data was created
          const schoolPreference = await preferenceRepository.findBySchoolId(createdSchool.id);
          expect(schoolPreference).toBeNull();
        }
      ),
      { numRuns: 30 }
    );
  });
});