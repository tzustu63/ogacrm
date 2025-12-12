import * as fc from 'fast-check';
import { Pool } from 'pg';
import { SearchEngine, FilterOptions, SortOptions, PaginationOptions } from '../../src/services/searchEngine';
import { SchoolRepository, CreateSchoolData } from '../../src/repositories/schoolRepository';
import { ContactRepository, CreateContactData } from '../../src/repositories/contactRepository';
import { InteractionRepository, CreateInteractionData } from '../../src/repositories/interactionRepository';
import { School, Contact, Interaction, SchoolType, RelationshipStatus, ContactMethod } from '../../src/types';
import { setupTestDatabase, cleanupTestDatabase } from '../setup';

describe('SearchEngine Property Tests', () => {
  let pool: Pool;
  let searchEngine: SearchEngine;
  let schoolRepository: SchoolRepository;
  let contactRepository: ContactRepository;
  let interactionRepository: InteractionRepository;

  beforeAll(async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping SearchEngine property tests - database not available');
      return;
    }
    
    pool = await setupTestDatabase();
    searchEngine = new SearchEngine(pool);
    schoolRepository = new SchoolRepository(pool);
    contactRepository = new ContactRepository(pool);
    interactionRepository = new InteractionRepository(pool);
  });

  beforeEach(async () => {
    if (process.env.SKIP_DB_SETUP === 'true') return;
    await cleanupTestDatabase();
  });

  /**
   * **Feature: recruitment-crm, Property 10: 搜尋結果正確性**
   * 對於任何搜尋查詢和篩選條件，系統應該返回符合所有指定條件的學校記錄，並在無結果時顯示適當訊息
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
   */
  it('should return correct search results for text queries across schools, contacts, and interactions', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          schools: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
              country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              schoolType: fc.constantFrom(...Object.values(SchoolType)),
              website: fc.option(fc.webUrl(), { nil: undefined }),
              relationshipStatus: fc.option(fc.constantFrom(...Object.values(RelationshipStatus)), { nil: undefined })
            }),
            { minLength: 2, maxLength: 5 }
          ),
          searchTerm: fc.string({ minLength: 2, maxLength: 10 }).filter(s => s.trim().length > 0)
        }),
        async ({ schools, searchTerm }) => {
          // Create schools with predictable names that include the search term
          const createdSchools: School[] = [];
          for (let i = 0; i < schools.length; i++) {
            const schoolData = {
              ...schools[i]!,
              name: i === 0 ? `${searchTerm} University` : schools[i]!.name
            };
            const school = await schoolRepository.create(schoolData);
            createdSchools.push(school);
          }

          // Create a contact with the search term in the name for the second school
          if (createdSchools.length > 1) {
            const contactData: CreateContactData = {
              schoolId: createdSchools[1]!.id,
              name: `${searchTerm} Contact`,
              email: 'test@example.com',
              phone: '123-456-7890',
              isPrimary: true
            };
            await contactRepository.create(contactData);
          }

          // Create an interaction with the search term in notes for the third school (if exists)
          if (createdSchools.length > 2) {
            const interactionData: CreateInteractionData = {
              schoolId: createdSchools[2]!.id,
              contactMethod: ContactMethod.EMAIL,
              date: new Date(),
              notes: `Meeting notes about ${searchTerm}`,
              followUpRequired: false,
              createdBy: 'test-user'
            };
            await interactionRepository.create(interactionData);
          }

          // Perform search
          const searchResult = await searchEngine.search(searchTerm);

          // Verify search results
          expect(searchResult).toBeDefined();
          expect(searchResult.schools).toBeDefined();
          expect(Array.isArray(searchResult.schools)).toBe(true);
          expect(typeof searchResult.totalCount).toBe('number');

          // Should find at least the schools we created with the search term
          const expectedMinResults = Math.min(3, createdSchools.length);
          expect(searchResult.schools.length).toBeGreaterThanOrEqual(expectedMinResults);
          expect(searchResult.totalCount).toBeGreaterThanOrEqual(expectedMinResults);

          // Verify that the first school (with search term in name) is found
          const foundFirstSchool = searchResult.schools.find(s => s.id === createdSchools[0]!.id);
          expect(foundFirstSchool).toBeDefined();

          // If we have multiple schools, verify the second school (with contact containing search term) is found
          if (createdSchools.length > 1) {
            const foundSecondSchool = searchResult.schools.find(s => s.id === createdSchools[1]!.id);
            expect(foundSecondSchool).toBeDefined();
          }

          // If we have three schools, verify the third school (with interaction containing search term) is found
          if (createdSchools.length > 2) {
            const foundThirdSchool = searchResult.schools.find(s => s.id === createdSchools[2]!.id);
            expect(foundThirdSchool).toBeDefined();
          }

          // All returned schools should be valid School objects
          for (const school of searchResult.schools) {
            expect(school.id).toBeDefined();
            expect(typeof school.name).toBe('string');
            expect(typeof school.country).toBe('string');
            expect(typeof school.region).toBe('string');
            expect(Object.values(SchoolType)).toContain(school.schoolType);
            expect(Object.values(RelationshipStatus)).toContain(school.relationshipStatus);
            expect(school.createdAt).toBeInstanceOf(Date);
            expect(school.updatedAt).toBeInstanceOf(Date);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should return correct filtered results based on multiple filter criteria', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          targetCountry: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          targetSchoolType: fc.constantFrom(...Object.values(SchoolType)),
          targetRelationshipStatus: fc.constantFrom(...Object.values(RelationshipStatus)),
          schools: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
              country: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              schoolType: fc.constantFrom(...Object.values(SchoolType)),
              relationshipStatus: fc.constantFrom(...Object.values(RelationshipStatus))
            }),
            { minLength: 3, maxLength: 8 }
          )
        }),
        async ({ targetCountry, targetSchoolType, targetRelationshipStatus, schools }) => {
          // Create schools, ensuring at least one matches all filter criteria
          const createdSchools: School[] = [];
          
          // First school matches all criteria
          const matchingSchoolData: CreateSchoolData = {
            ...schools[0]!,
            country: targetCountry,
            schoolType: targetSchoolType,
            relationshipStatus: targetRelationshipStatus
          };
          const matchingSchool = await schoolRepository.create(matchingSchoolData);
          createdSchools.push(matchingSchool);

          // Create other schools with original data
          for (let i = 1; i < schools.length; i++) {
            const school = await schoolRepository.create(schools[i]!);
            createdSchools.push(school);
          }

          // Apply filters
          const filters: FilterOptions = {
            country: targetCountry,
            schoolType: targetSchoolType,
            relationshipStatus: targetRelationshipStatus
          };

          const searchResult = await searchEngine.search(undefined, filters);

          // Verify results
          expect(searchResult).toBeDefined();
          expect(searchResult.schools).toBeDefined();
          expect(Array.isArray(searchResult.schools)).toBe(true);

          // Should find at least the matching school
          expect(searchResult.schools.length).toBeGreaterThanOrEqual(1);
          expect(searchResult.totalCount).toBeGreaterThanOrEqual(1);

          // All returned schools should match the filter criteria
          for (const school of searchResult.schools) {
            expect(school.country).toBe(targetCountry);
            expect(school.schoolType).toBe(targetSchoolType);
            expect(school.relationshipStatus).toBe(targetRelationshipStatus);
          }

          // The matching school should be in the results
          const foundMatchingSchool = searchResult.schools.find(s => s.id === matchingSchool.id);
          expect(foundMatchingSchool).toBeDefined();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should return empty results with appropriate count when no matches found', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          schools: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
              country: fc.constantFrom('USA', 'Canada', 'UK'),
              region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              schoolType: fc.constantFrom(...Object.values(SchoolType)),
              relationshipStatus: fc.constantFrom(...Object.values(RelationshipStatus))
            }),
            { minLength: 1, maxLength: 5 }
          ),
          nonExistentSearchTerm: fc.string({ minLength: 10, maxLength: 20 }).filter(s => 
            s.trim().length > 0 && 
            !s.includes('USA') && 
            !s.includes('Canada') && 
            !s.includes('UK') &&
            /^[a-zA-Z0-9]+$/.test(s) // Only alphanumeric to avoid conflicts
          )
        }),
        async ({ schools, nonExistentSearchTerm }) => {
          // Create schools
          const createdSchools: School[] = [];
          for (const schoolData of schools) {
            const school = await schoolRepository.create(schoolData);
            createdSchools.push(school);
          }

          // Search for something that doesn't exist
          const searchResult = await searchEngine.search(nonExistentSearchTerm);

          // Verify empty results
          expect(searchResult).toBeDefined();
          expect(searchResult.schools).toBeDefined();
          expect(Array.isArray(searchResult.schools)).toBe(true);
          expect(searchResult.schools.length).toBe(0);
          expect(searchResult.totalCount).toBe(0);

          // Also test with non-matching filters
          const nonMatchingFilters: FilterOptions = {
            country: 'NonExistentCountry',
            schoolType: SchoolType.HIGH_SCHOOL
          };

          const filteredResult = await searchEngine.search(undefined, nonMatchingFilters);
          expect(filteredResult.schools.length).toBe(0);
          expect(filteredResult.totalCount).toBe(0);
        }
      ),
      { numRuns: 15 }
    );
  });

  it('should maintain correct sorting and pagination behavior', async () => {
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
            relationshipStatus: fc.constantFrom(...Object.values(RelationshipStatus))
          }),
          { minLength: 3, maxLength: 6 }
        ),
        async (schools) => {
          // Create schools
          const createdSchools: School[] = [];
          for (const schoolData of schools) {
            const school = await schoolRepository.create(schoolData);
            createdSchools.push(school);
          }

          // Test sorting by name ascending
          const sortedAsc = await searchEngine.search(
            undefined,
            undefined,
            { field: 'name', order: 'asc' }
          );

          expect(sortedAsc.schools.length).toBe(createdSchools.length);
          
          // Verify ascending order
          for (let i = 1; i < sortedAsc.schools.length; i++) {
            expect(sortedAsc.schools[i - 1]!.name.localeCompare(sortedAsc.schools[i]!.name)).toBeLessThanOrEqual(0);
          }

          // Test sorting by name descending
          const sortedDesc = await searchEngine.search(
            undefined,
            undefined,
            { field: 'name', order: 'desc' }
          );

          expect(sortedDesc.schools.length).toBe(createdSchools.length);
          
          // Verify descending order
          for (let i = 1; i < sortedDesc.schools.length; i++) {
            expect(sortedDesc.schools[i - 1]!.name.localeCompare(sortedDesc.schools[i]!.name)).toBeGreaterThanOrEqual(0);
          }

          // Test pagination
          if (createdSchools.length >= 2) {
            const pageSize = Math.max(1, Math.floor(createdSchools.length / 2));
            const firstPage = await searchEngine.search(
              undefined,
              undefined,
              { field: 'name', order: 'asc' },
              { page: 1, limit: pageSize }
            );

            expect(firstPage.schools.length).toBeLessThanOrEqual(pageSize);
            expect(firstPage.totalCount).toBe(createdSchools.length);

            const secondPage = await searchEngine.search(
              undefined,
              undefined,
              { field: 'name', order: 'asc' },
              { page: 2, limit: pageSize }
            );

            expect(secondPage.totalCount).toBe(createdSchools.length);
            
            // Verify no overlap between pages
            const firstPageIds = new Set(firstPage.schools.map(s => s.id));
            const secondPageIds = new Set(secondPage.schools.map(s => s.id));
            
            for (const id of secondPageIds) {
              expect(firstPageIds.has(id)).toBe(false);
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * **Feature: recruitment-crm, Property 11: 篩選重置一致性**
   * 對於任何已應用的篩選條件，當使用者清除篩選時，系統應該恢復顯示完整的學校記錄列表
   * **Validates: Requirements 6.5**
   */
  it('should restore complete school list when filters are cleared', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
            country: fc.constantFrom('USA', 'Canada', 'UK', 'Australia', 'Germany'),
            region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schoolType: fc.constantFrom(...Object.values(SchoolType)),
            relationshipStatus: fc.constantFrom(...Object.values(RelationshipStatus))
          }),
          { minLength: 4, maxLength: 10 }
        ),
        async (schools) => {
          // Create schools with diverse data
          const createdSchools: School[] = [];
          for (const schoolData of schools) {
            const school = await schoolRepository.create(schoolData);
            createdSchools.push(school);
          }

          // Get all schools without any filters (baseline)
          const allSchoolsBaseline = await searchEngine.clearFilters();
          expect(allSchoolsBaseline.schools.length).toBe(createdSchools.length);
          expect(allSchoolsBaseline.totalCount).toBe(createdSchools.length);

          // Apply restrictive filters to get a subset
          const restrictiveFilters: FilterOptions = {
            country: createdSchools[0]!.country,
            schoolType: createdSchools[0]!.schoolType
          };

          const filteredResult = await searchEngine.search(undefined, restrictiveFilters);
          
          // Filtered result should be smaller than or equal to total
          expect(filteredResult.schools.length).toBeLessThanOrEqual(createdSchools.length);
          expect(filteredResult.totalCount).toBeLessThanOrEqual(createdSchools.length);

          // All filtered results should match the filter criteria
          for (const school of filteredResult.schools) {
            expect(school.country).toBe(restrictiveFilters.country);
            expect(school.schoolType).toBe(restrictiveFilters.schoolType);
          }

          // Clear filters and verify we get all schools back
          const clearedResult = await searchEngine.clearFilters();
          
          expect(clearedResult.schools.length).toBe(createdSchools.length);
          expect(clearedResult.totalCount).toBe(createdSchools.length);

          // Verify all original schools are present after clearing filters
          const clearedSchoolIds = new Set(clearedResult.schools.map(s => s.id));
          for (const originalSchool of createdSchools) {
            expect(clearedSchoolIds.has(originalSchool.id)).toBe(true);
          }

          // Verify the cleared result matches the baseline
          expect(clearedResult.schools.length).toBe(allSchoolsBaseline.schools.length);
          expect(clearedResult.totalCount).toBe(allSchoolsBaseline.totalCount);

          // Test with sorting and pagination preserved after clearing filters
          const clearedWithSort = await searchEngine.clearFilters(
            { field: 'name', order: 'asc' },
            { page: 1, limit: Math.max(1, Math.floor(createdSchools.length / 2)) }
          );

          expect(clearedWithSort.totalCount).toBe(createdSchools.length);
          expect(clearedWithSort.schools.length).toBeLessThanOrEqual(createdSchools.length);
          
          // Verify sorting is applied
          if (clearedWithSort.schools.length > 1) {
            for (let i = 1; i < clearedWithSort.schools.length; i++) {
              expect(clearedWithSort.schools[i - 1]!.name.localeCompare(clearedWithSort.schools[i]!.name)).toBeLessThanOrEqual(0);
            }
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should maintain filter reset consistency with text search queries', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping test - database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          schools: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
              country: fc.constantFrom('TestCountry1', 'TestCountry2', 'TestCountry3'),
              region: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              schoolType: fc.constantFrom(...Object.values(SchoolType)),
              relationshipStatus: fc.constantFrom(...Object.values(RelationshipStatus))
            }),
            { minLength: 3, maxLength: 6 }
          ),
          searchTerm: fc.string({ minLength: 3, maxLength: 8 }).filter(s => s.trim().length > 0)
        }),
        async ({ schools, searchTerm }) => {
          // Create schools, with one guaranteed to match the search term
          const createdSchools: School[] = [];
          
          // First school includes search term in name
          const matchingSchoolData = {
            ...schools[0]!,
            name: `${searchTerm} Academy`
          };
          const matchingSchool = await schoolRepository.create(matchingSchoolData);
          createdSchools.push(matchingSchool);

          // Create other schools
          for (let i = 1; i < schools.length; i++) {
            const school = await schoolRepository.create(schools[i]!);
            createdSchools.push(school);
          }

          // Get baseline (all schools)
          const baseline = await searchEngine.clearFilters();
          expect(baseline.schools.length).toBe(createdSchools.length);

          // Apply text search with filters
          const filters: FilterOptions = {
            country: matchingSchool.country,
            schoolType: matchingSchool.schoolType
          };

          const searchWithFilters = await searchEngine.search(searchTerm, filters);
          
          // Should find at least the matching school
          expect(searchWithFilters.schools.length).toBeGreaterThanOrEqual(1);
          const foundMatchingSchool = searchWithFilters.schools.find(s => s.id === matchingSchool.id);
          expect(foundMatchingSchool).toBeDefined();

          // All results should match both search term and filters
          for (const school of searchWithFilters.schools) {
            expect(school.country).toBe(filters.country);
            expect(school.schoolType).toBe(filters.schoolType);
          }

          // Clear filters (no search term, no filters)
          const cleared = await searchEngine.clearFilters();
          
          // Should get all schools back
          expect(cleared.schools.length).toBe(createdSchools.length);
          expect(cleared.totalCount).toBe(createdSchools.length);

          // Verify all original schools are present
          const clearedIds = new Set(cleared.schools.map(s => s.id));
          for (const school of createdSchools) {
            expect(clearedIds.has(school.id)).toBe(true);
          }

          // Test search without filters (only text search)
          const searchOnly = await searchEngine.search(searchTerm);
          
          // Should find the matching school and potentially others
          expect(searchOnly.schools.length).toBeGreaterThanOrEqual(1);
          const foundInSearchOnly = searchOnly.schools.find(s => s.id === matchingSchool.id);
          expect(foundInSearchOnly).toBeDefined();

          // Search-only results should be >= search-with-filters results
          expect(searchOnly.schools.length).toBeGreaterThanOrEqual(searchWithFilters.schools.length);
        }
      ),
      { numRuns: 20 }
    );
  });
});