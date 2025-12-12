import * as fc from 'fast-check';
import { Pool } from 'pg';
import { SchoolRepository, CreateSchoolData, UpdateSchoolData } from '../../src/repositories/schoolRepository';
import { School, SchoolType, RelationshipStatus } from '../../src/types';
import { setupTestDatabase, cleanupTestDatabase, getTestPool } from '../setup';

describe('School Repository Property Tests', () => {
  let pool: Pool;
  let schoolRepository: SchoolRepository;

  beforeAll(async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping SchoolRepository property tests - database not available');
      return;
    }
    
    pool = await setupTestDatabase();
    schoolRepository = new SchoolRepository(pool);
  });

  beforeEach(async () => {
    if (process.env.SKIP_DB_SETUP === 'true') return;
    await cleanupTestDatabase();
  });

  /**
   * **Feature: recruitment-crm, Property 1: 學校資料完整性**
   * 對於任何學校記錄，當執行創建、更新或查詢操作時，系統應該保持資料的完整性和一致性，包括必填欄位驗證和關聯資料的正確維護
   * **Validates: Requirements 1.1, 1.3, 1.4, 1.5**
   */
  it('should maintain school data integrity for create-read operations', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
          country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          schoolType: fc.constantFrom(...Object.values(SchoolType)),
          website: fc.option(fc.webUrl(), { nil: undefined }),
          relationshipStatus: fc.option(fc.constantFrom(...Object.values(RelationshipStatus)), { nil: undefined })
        }),
        async (schoolData: CreateSchoolData) => {
          // Create school
          const createdSchool = await schoolRepository.create(schoolData);
          
          // Verify created school has all required properties
          expect(createdSchool).toBeDefined();
          expect(createdSchool.id).toBeDefined();
          expect(typeof createdSchool.id).toBe('string');
          expect(createdSchool.name).toBe(schoolData.name);
          expect(createdSchool.country).toBe(schoolData.country);
          expect(createdSchool.region).toBe(schoolData.region);
          expect(createdSchool.schoolType).toBe(schoolData.schoolType);
          expect(createdSchool.createdAt).toBeInstanceOf(Date);
          expect(createdSchool.updatedAt).toBeInstanceOf(Date);
          
          // Handle optional fields
          if (schoolData.website) {
            expect(createdSchool.website).toBe(schoolData.website);
          }
          
          const expectedStatus = schoolData.relationshipStatus || RelationshipStatus.POTENTIAL;
          expect(createdSchool.relationshipStatus).toBe(expectedStatus);
          
          // Read school back and verify data integrity
          const retrievedSchool = await schoolRepository.findById(createdSchool.id);
          expect(retrievedSchool).toBeDefined();
          expect(retrievedSchool!.id).toBe(createdSchool.id);
          expect(retrievedSchool!.name).toBe(createdSchool.name);
          expect(retrievedSchool!.country).toBe(createdSchool.country);
          expect(retrievedSchool!.region).toBe(createdSchool.region);
          expect(retrievedSchool!.schoolType).toBe(createdSchool.schoolType);
          expect(retrievedSchool!.website).toBe(createdSchool.website);
          expect(retrievedSchool!.relationshipStatus).toBe(createdSchool.relationshipStatus);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain school data integrity for update operations', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          // Initial school data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schoolType: fc.constantFrom(...Object.values(SchoolType)),
            website: fc.option(fc.webUrl(), { nil: undefined }),
            relationshipStatus: fc.option(fc.constantFrom(...Object.values(RelationshipStatus)), { nil: undefined })
          }),
          // Update data
          fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0), { nil: undefined }),
            country: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { nil: undefined }),
            region: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { nil: undefined }),
            schoolType: fc.option(fc.constantFrom(...Object.values(SchoolType)), { nil: undefined }),
            website: fc.option(fc.webUrl(), { nil: undefined }),
            relationshipStatus: fc.option(fc.constantFrom(...Object.values(RelationshipStatus)), { nil: undefined })
          })
        ),
        async ([initialData, updateData]: [CreateSchoolData, UpdateSchoolData]) => {
          // Create initial school
          const createdSchool = await schoolRepository.create(initialData);
          
          // Update school
          const updatedSchool = await schoolRepository.update(createdSchool.id, updateData);
          
          expect(updatedSchool).toBeDefined();
          expect(updatedSchool!.id).toBe(createdSchool.id);
          
          // Verify updated fields
          if (updateData.name !== undefined) {
            expect(updatedSchool!.name).toBe(updateData.name);
          } else {
            expect(updatedSchool!.name).toBe(createdSchool.name);
          }
          
          if (updateData.country !== undefined) {
            expect(updatedSchool!.country).toBe(updateData.country);
          } else {
            expect(updatedSchool!.country).toBe(createdSchool.country);
          }
          
          if (updateData.region !== undefined) {
            expect(updatedSchool!.region).toBe(updateData.region);
          } else {
            expect(updatedSchool!.region).toBe(createdSchool.region);
          }
          
          if (updateData.schoolType !== undefined) {
            expect(updatedSchool!.schoolType).toBe(updateData.schoolType);
          } else {
            expect(updatedSchool!.schoolType).toBe(createdSchool.schoolType);
          }
          
          if (updateData.website !== undefined) {
            expect(updatedSchool!.website).toBe(updateData.website);
          } else {
            expect(updatedSchool!.website).toBe(createdSchool.website);
          }
          
          if (updateData.relationshipStatus !== undefined) {
            expect(updatedSchool!.relationshipStatus).toBe(updateData.relationshipStatus);
          } else {
            expect(updatedSchool!.relationshipStatus).toBe(createdSchool.relationshipStatus);
          }
          
          // Verify timestamps
          expect(updatedSchool!.createdAt).toEqual(createdSchool.createdAt);
          expect(updatedSchool!.updatedAt.getTime()).toBeGreaterThanOrEqual(createdSchool.updatedAt.getTime());
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should maintain data integrity for search and filter operations', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schoolType: fc.constantFrom(...Object.values(SchoolType)),
            website: fc.option(fc.webUrl(), { nil: undefined }),
            relationshipStatus: fc.option(fc.constantFrom(...Object.values(RelationshipStatus)), { nil: undefined })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (schoolsData: CreateSchoolData[]) => {
          // Create multiple schools
          const createdSchools: School[] = [];
          for (const schoolData of schoolsData) {
            const school = await schoolRepository.create(schoolData);
            createdSchools.push(school);
          }
          
          // Test findAll without filters
          const allSchools = await schoolRepository.findAll();
          expect(allSchools.length).toBe(createdSchools.length);
          
          // Verify all created schools are returned
          for (const createdSchool of createdSchools) {
            const found = allSchools.find(s => s.id === createdSchool.id);
            expect(found).toBeDefined();
            expect(found!.name).toBe(createdSchool.name);
            expect(found!.country).toBe(createdSchool.country);
            expect(found!.region).toBe(createdSchool.region);
            expect(found!.schoolType).toBe(createdSchool.schoolType);
          }
          
          // Test filtering by country
          if (createdSchools.length > 0) {
            const testCountry = createdSchools[0]!.country;
            const filteredByCountry = await schoolRepository.findAll({ country: testCountry });
            
            // All returned schools should match the filter
            for (const school of filteredByCountry) {
              expect(school.country).toBe(testCountry);
            }
            
            // Should include at least the first school
            const foundFirstSchool = filteredByCountry.find(s => s.id === createdSchools[0]!.id);
            expect(foundFirstSchool).toBeDefined();
          }
          
          // Test search functionality
          if (createdSchools.length > 0) {
            const testSchool = createdSchools[0]!;
            const searchResults = await schoolRepository.findAll({ query: testSchool.name.substring(0, 3) });
            
            // Should find schools that match the search term
            const foundTestSchool = searchResults.find(s => s.id === testSchool.id);
            expect(foundTestSchool).toBeDefined();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should reject invalid school data and maintain data integrity', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Missing name
          fc.record({
            name: fc.constant(''),
            country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schoolType: fc.constantFrom(...Object.values(SchoolType))
          }),
          // Missing country
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            country: fc.constant(''),
            region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schoolType: fc.constantFrom(...Object.values(SchoolType))
          }),
          // Missing region
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            region: fc.constant(''),
            schoolType: fc.constantFrom(...Object.values(SchoolType))
          }),
          // Invalid website
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schoolType: fc.constantFrom(...Object.values(SchoolType)),
            website: fc.constant('invalid-url')
          })
        ),
        async (invalidData: CreateSchoolData) => {
          // Should throw an error when trying to create invalid school
          await expect(schoolRepository.create(invalidData)).rejects.toThrow();
          
          // Verify no data was created
          const allSchools = await schoolRepository.findAll();
          expect(allSchools.length).toBe(0);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should maintain referential integrity for delete operations', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
          country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          schoolType: fc.constantFrom(...Object.values(SchoolType)),
          website: fc.option(fc.webUrl(), { nil: undefined }),
          relationshipStatus: fc.option(fc.constantFrom(...Object.values(RelationshipStatus)), { nil: undefined })
        }),
        async (schoolData: CreateSchoolData) => {
          // Create school
          const createdSchool = await schoolRepository.create(schoolData);
          
          // Verify school exists
          const foundSchool = await schoolRepository.findById(createdSchool.id);
          expect(foundSchool).toBeDefined();
          
          // Delete school
          const deleteResult = await schoolRepository.delete(createdSchool.id);
          expect(deleteResult).toBe(true);
          
          // Verify school no longer exists
          const deletedSchool = await schoolRepository.findById(createdSchool.id);
          expect(deletedSchool).toBeNull();
          
          // Verify delete of non-existent school returns false
          const secondDeleteResult = await schoolRepository.delete(createdSchool.id);
          expect(secondDeleteResult).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });
});