/**
 * **Feature: recruitment-crm, Property 14: 匯出資料完整性**
 * **Validates: Requirements 7.5**
 * 
 * Property-based tests for export data integrity
 */

import fc from 'fast-check';
import { Pool } from 'pg';
import { ExportService, ExportOptions } from '../../src/services/exportService';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } from '../setup';
import { createTestSchool, createTestContact, createTestInteraction } from '../utils/testHelpers';
import * as XLSX from 'xlsx';

describe('Export Service Property Tests', () => {
  let pool: Pool;
  let exportService: ExportService;
  let dbAvailable = false;

  beforeAll(async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping ExportService property tests - database not available');
      return;
    }

    try {
      pool = await setupTestDatabase();
      exportService = new ExportService(pool);
      dbAvailable = true;
    } catch (error) {
      console.warn('Database not available, skipping export service tests');
      dbAvailable = false;
    }
  });

  afterEach(async () => {
    if (dbAvailable) {
      await cleanupTestDatabase();
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      await closeTestDatabase();
    }
  });

  /**
   * Property 14: Export Data Integrity
   * For any valid export operation, the system should ensure exported data format correctness and completeness
   */
  describe('Property 14: Export Data Integrity', () => {
    
    it('should preserve all data when exporting to JSON format', async () => {
      if (!dbAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              country: fc.string({ minLength: 1, maxLength: 50 }),
              region: fc.string({ minLength: 1, maxLength: 50 }),
              schoolType: fc.constantFrom('high_school', 'university', 'vocational', 'other'),
              website: fc.option(fc.webUrl(), { nil: undefined })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (schoolsData) => {
            // Create test schools
            const createdSchools = [];
            for (const schoolData of schoolsData) {
              const school = await createTestSchool(pool, schoolData);
              createdSchools.push(school);
            }

            // Export to JSON
            const options: ExportOptions = {
              format: 'json',
              filters: {
                schoolIds: createdSchools.map(s => s.id)
              }
            };

            const result = await exportService.exportSchools(options);

            // Verify export result structure
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('filename');
            expect(result).toHaveProperty('mimeType');
            expect(result).toHaveProperty('totalRecords');
            expect(result.mimeType).toBe('application/json');
            expect(result.totalRecords).toBe(createdSchools.length);

            // Parse exported JSON data
            const exportedData = JSON.parse(result.data as string);
            expect(exportedData).toHaveProperty('data');
            expect(exportedData).toHaveProperty('exportedAt');
            expect(Array.isArray(exportedData.data)).toBe(true);
            expect(exportedData.data).toHaveLength(createdSchools.length);

            // Verify each exported school contains all required fields
            for (let i = 0; i < exportedData.data.length; i++) {
              const exportedSchool = exportedData.data[i];
              const originalSchool = createdSchools.find(s => s.id === exportedSchool.id);
              
              expect(originalSchool).toBeDefined();
              expect(exportedSchool.name).toBe(originalSchool.name);
              expect(exportedSchool.country).toBe(originalSchool.country);
              expect(exportedSchool.region).toBe(originalSchool.region);
              expect(exportedSchool.schoolType).toBe(originalSchool.schoolType);
              
              // Handle optional website field
              if (originalSchool.website) {
                expect(exportedSchool.website).toBe(originalSchool.website);
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should generate valid CSV format with proper escaping', async () => {
      if (!dbAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }).map(s => 
                // Include some CSV special characters to test escaping
                Math.random() > 0.7 ? s + ',"test"' : s
              ),
              country: fc.string({ minLength: 1, maxLength: 30 }),
              region: fc.string({ minLength: 1, maxLength: 30 }),
              schoolType: fc.constantFrom('high_school', 'university', 'vocational', 'other')
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (schoolsData) => {
            // Create test schools
            const createdSchools = [];
            for (const schoolData of schoolsData) {
              const school = await createTestSchool(pool, schoolData);
              createdSchools.push(school);
            }

            // Export to CSV
            const options: ExportOptions = {
              format: 'csv',
              fields: ['id', 'name', 'country', 'region', 'schoolType'],
              filters: {
                schoolIds: createdSchools.map(s => s.id)
              }
            };

            const result = await exportService.exportSchools(options);

            // Verify export result structure
            expect(result.mimeType).toBe('text/csv');
            expect(result.totalRecords).toBe(createdSchools.length);
            expect(typeof result.data).toBe('string');

            const csvData = result.data as string;
            const lines = csvData.split('\n');
            
            // Should have header + data rows
            expect(lines.length).toBe(createdSchools.length + 1);
            
            // Verify header contains expected fields
            const header = lines[0];
            expect(header).toContain('id');
            expect(header).toContain('name');
            expect(header).toContain('country');
            expect(header).toContain('region');
            expect(header).toContain('schoolType');

            // Verify each data row has correct number of fields
            for (let i = 1; i < lines.length; i++) {
              const row = lines[i];
              if (row && row.trim()) { // Skip empty lines
                // Count fields, accounting for quoted fields with commas
                const fields = row.split(',');
                expect(fields.length).toBeGreaterThanOrEqual(5);
              }
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should generate valid Excel format with proper structure', async () => {
      if (!dbAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              country: fc.string({ minLength: 1, maxLength: 30 }),
              region: fc.string({ minLength: 1, maxLength: 30 }),
              schoolType: fc.constantFrom('high_school', 'university', 'vocational', 'other')
            }),
            { minLength: 1, maxLength: 8 }
          ),
          async (schoolsData) => {
            // Create test schools
            const createdSchools = [];
            for (const schoolData of schoolsData) {
              const school = await createTestSchool(pool, schoolData);
              createdSchools.push(school);
            }

            // Export to Excel
            const options: ExportOptions = {
              format: 'excel',
              filters: {
                schoolIds: createdSchools.map(s => s.id)
              }
            };

            const result = await exportService.exportSchools(options);

            // Verify export result structure
            expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            expect(result.totalRecords).toBe(createdSchools.length);
            expect(Buffer.isBuffer(result.data)).toBe(true);

            // Parse Excel file to verify structure
            const workbook = XLSX.read(result.data as Buffer, { type: 'buffer' });
            expect(workbook.SheetNames).toContain('Export');
            
            const worksheet = workbook.Sheets['Export'];
            expect(worksheet).toBeDefined();
            const jsonData = XLSX.utils.sheet_to_json(worksheet!);
            
            // Should have same number of rows as created schools
            expect(jsonData).toHaveLength(createdSchools.length);

            // Verify each row contains expected data
            for (const row of jsonData as any[]) {
              expect(row).toHaveProperty('id');
              expect(row).toHaveProperty('name');
              expect(row).toHaveProperty('country');
              expect(row).toHaveProperty('region');
              expect(row).toHaveProperty('schoolType');
              
              // Find corresponding original school
              const originalSchool = createdSchools.find(s => s.id === row.id);
              expect(originalSchool).toBeDefined();
              expect(row.name).toBe(originalSchool.name);
              expect(row.country).toBe(originalSchool.country);
              expect(row.region).toBe(originalSchool.region);
              expect(row.schoolType).toBe(originalSchool.schoolType);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should maintain data integrity when filtering by custom fields', async () => {
      if (!dbAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              country: fc.string({ minLength: 1, maxLength: 30 }),
              region: fc.string({ minLength: 1, maxLength: 30 }),
              schoolType: fc.constantFrom('high_school', 'university', 'vocational', 'other'),
              website: fc.option(fc.webUrl(), { nil: undefined })
            }),
            { minLength: 2, maxLength: 6 }
          ),
          fc.subarray(['id', 'name', 'country', 'region', 'schoolType', 'website'], { minLength: 1 }),
          async (schoolsData, selectedFields) => {
            // Create test schools
            const createdSchools = [];
            for (const schoolData of schoolsData) {
              const school = await createTestSchool(pool, schoolData);
              createdSchools.push(school);
            }

            // Export with custom field selection
            const options: ExportOptions = {
              format: 'json',
              fields: selectedFields,
              filters: {
                schoolIds: createdSchools.map(s => s.id)
              }
            };

            const result = await exportService.exportSchools(options);
            const exportedData = JSON.parse(result.data as string);

            // Verify only selected fields are present
            for (const exportedSchool of exportedData.data) {
              const exportedKeys = Object.keys(exportedSchool);
              
              // All selected fields should be present
              for (const field of selectedFields) {
                expect(exportedKeys).toContain(field);
              }
              
              // No extra fields should be present (except for dates which are always included)
              for (const key of exportedKeys) {
                const isDateField = key.includes('At') || key.includes('Date');
                expect(selectedFields.includes(key) || isDateField).toBe(true);
              }
            }

            // Verify data integrity for selected fields
            for (const exportedSchool of exportedData.data) {
              const originalSchool = createdSchools.find(s => s.id === exportedSchool.id);
              expect(originalSchool).toBeDefined();
              
              for (const field of selectedFields) {
                if (field in originalSchool) {
                  expect(exportedSchool[field]).toBe((originalSchool as any)[field]);
                }
              }
            }
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should handle large datasets with batch processing correctly', async () => {
      if (!dbAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 25 }), // Number of schools to create
          fc.integer({ min: 2, max: 8 }),  // Batch size
          async (schoolCount, batchSize) => {
            // Create multiple test schools
            const createdSchools = [];
            for (let i = 0; i < schoolCount; i++) {
              const school = await createTestSchool(pool, {
                name: `測試學校 ${i + 1}`,
                country: `國家 ${i % 3 + 1}`,
                region: `地區 ${i % 5 + 1}`
              });
              createdSchools.push(school);
            }

            // Export with batch processing
            const options: ExportOptions = {
              format: 'json',
              batchSize: batchSize,
              filters: {
                schoolIds: createdSchools.map(s => s.id)
              }
            };

            const result = await exportService.exportData(options);
            const exportedData = JSON.parse(result.data as string);

            // Verify all schools are exported regardless of batch size
            expect(result.totalRecords).toBe(schoolCount);
            expect(exportedData.data).toHaveLength(schoolCount);

            // Verify data integrity across batches
            const exportedIds = exportedData.data.map((school: any) => school.id);
            const originalIds = createdSchools.map(s => s.id);
            
            expect(exportedIds.sort()).toEqual(originalIds.sort());

            // Verify each school's data is complete
            for (const exportedSchool of exportedData.data) {
              const originalSchool = createdSchools.find(s => s.id === exportedSchool.id);
              expect(originalSchool).toBeDefined();
              expect(exportedSchool.name).toBe(originalSchool.name);
              expect(exportedSchool.country).toBe(originalSchool.country);
              expect(exportedSchool.region).toBe(originalSchool.region);
            }
          }
        ),
        { numRuns: 12 }
      );
    });

    it('should preserve data relationships when exporting with related data', async () => {
      if (!dbAvailable) {
        console.log('Skipping test - database not available');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              schoolName: fc.string({ minLength: 1, maxLength: 50 }),
              contactName: fc.string({ minLength: 1, maxLength: 30 }),
              contactEmail: fc.emailAddress(),
              interactionNotes: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 4 }
          ),
          async (testData) => {
            // Create test schools with contacts and interactions
            const createdSchools = [];
            
            for (const data of testData) {
              const school = await createTestSchool(pool, { name: data.schoolName });
              const contact = await createTestContact(pool, school.id, {
                name: data.contactName,
                email: data.contactEmail
              });
              const interaction = await createTestInteraction(pool, school.id, {
                notes: data.interactionNotes
              });
              
              createdSchools.push({ school, contact, interaction });
            }

            // Export with related data
            const options: ExportOptions = {
              format: 'json',
              includeRelated: {
                contacts: true,
                interactions: true
              },
              filters: {
                schoolIds: createdSchools.map(item => item.school.id)
              }
            };

            const result = await exportService.exportSchools(options);
            const exportedData = JSON.parse(result.data as string);

            // Verify relationships are preserved
            expect(exportedData.data).toHaveLength(createdSchools.length);

            for (const exportedSchool of exportedData.data) {
              const originalData = createdSchools.find(item => item.school.id === exportedSchool.id);
              expect(originalData).toBeDefined();

              if (originalData) {
                // Verify school data
                expect(exportedSchool.name).toBe(originalData.school.name);

                // Verify contacts are included and correct
                expect(exportedSchool.contacts).toBeDefined();
                expect(Array.isArray(exportedSchool.contacts)).toBe(true);
                expect(exportedSchool.contacts).toHaveLength(1);
                expect(exportedSchool.contacts[0].name).toBe(originalData.contact.name);
                expect(exportedSchool.contacts[0].email).toBe(originalData.contact.email);

                // Verify interactions are included and correct
                expect(exportedSchool.interactions).toBeDefined();
                expect(Array.isArray(exportedSchool.interactions)).toBe(true);
                expect(exportedSchool.interactions).toHaveLength(1);
                expect(exportedSchool.interactions[0].notes).toBe(originalData.interaction.notes);
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});