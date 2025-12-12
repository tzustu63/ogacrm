import { ExportService } from '../../src/services/exportService';
import * as XLSX from 'xlsx';

describe('ExportService Unit Tests', () => {
  let exportService: ExportService;
  
  // Mock pool for testing without database
  const mockPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  } as any;

  beforeEach(() => {
    exportService = new ExportService(mockPool);
  });

  describe('getAvailableFields', () => {
    it('should return all available fields for each data type', () => {
      const fields = exportService.getAvailableFields();
      
      expect(fields).toHaveProperty('schools');
      expect(fields).toHaveProperty('contacts');
      expect(fields).toHaveProperty('interactions');
      expect(fields).toHaveProperty('partnerships');
      expect(fields).toHaveProperty('preferences');
      
      expect(fields.schools).toContain('id');
      expect(fields.schools).toContain('name');
      expect(fields.schools).toContain('country');
      expect(fields.schools).toContain('region');
      expect(fields.schools).toContain('schoolType');
      
      expect(fields.contacts).toContain('id');
      expect(fields.contacts).toContain('schoolId');
      expect(fields.contacts).toContain('name');
      expect(fields.contacts).toContain('email');
      
      expect(fields.interactions).toContain('id');
      expect(fields.interactions).toContain('schoolId');
      expect(fields.interactions).toContain('contactMethod');
      expect(fields.interactions).toContain('date');
      expect(fields.interactions).toContain('notes');
    });
  });

  describe('CSV Generation', () => {
    it('should generate valid CSV from array data', () => {
      const testData = [
        { id: '1', name: 'Test School 1', country: 'Taiwan', region: 'Taipei' },
        { id: '2', name: 'Test School 2', country: 'Taiwan', region: 'Kaohsiung' }
      ];

      // Access private method for testing
      const csvData = (exportService as any).generateCsv(testData);
      
      expect(typeof csvData).toBe('string');
      
      const lines = csvData.split('\n');
      expect(lines.length).toBe(3); // header + 2 data rows
      
      // Check header
      const header = lines[0];
      expect(header).toContain('id');
      expect(header).toContain('name');
      expect(header).toContain('country');
      expect(header).toContain('region');
      
      // Check data rows
      expect(lines[1]).toContain('1');
      expect(lines[1]).toContain('Test School 1');
      expect(lines[2]).toContain('2');
      expect(lines[2]).toContain('Test School 2');
    });

    it('should handle CSV special characters correctly', () => {
      const testData = [
        { id: '1', name: 'School with, comma', description: 'Has "quotes"' },
        { id: '2', name: 'Normal School', description: 'Normal description' }
      ];

      const csvData = (exportService as any).generateCsv(testData);
      
      // Should escape commas and quotes
      expect(csvData).toContain('"School with, comma"');
      expect(csvData).toContain('"Has ""quotes"""');
    });

    it('should return empty string for empty data', () => {
      const csvData = (exportService as any).generateCsv([]);
      expect(csvData).toBe('');
    });
  });

  describe('Excel Generation', () => {
    it('should generate valid Excel buffer from array data', () => {
      const testData = [
        { id: '1', name: 'Test School 1', country: 'Taiwan' },
        { id: '2', name: 'Test School 2', country: 'Japan' }
      ];

      const excelBuffer = (exportService as any).generateExcel(testData);
      
      expect(Buffer.isBuffer(excelBuffer)).toBe(true);
      
      // Parse the Excel file to verify content
      const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
      expect(workbook.SheetNames).toContain('Export');
      
      const worksheet = workbook.Sheets['Export'];
      expect(worksheet).toBeDefined();
      const jsonData = XLSX.utils.sheet_to_json(worksheet!);
      
      expect(jsonData).toHaveLength(2);
      expect(jsonData[0]).toMatchObject({ id: '1', name: 'Test School 1', country: 'Taiwan' });
      expect(jsonData[1]).toMatchObject({ id: '2', name: 'Test School 2', country: 'Japan' });
    });

    it('should handle empty data gracefully', () => {
      const excelBuffer = (exportService as any).generateExcel([]);
      
      expect(Buffer.isBuffer(excelBuffer)).toBe(true);
      
      const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
      expect(workbook.SheetNames).toContain('Export');
    });
  });

  describe('Object Flattening', () => {
    it('should flatten nested objects correctly', () => {
      const testObject = {
        id: '1',
        name: 'Test School',
        contact: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        preferences: {
          timezone: 'UTC+8',
          programs: ['CS', 'EE']
        }
      };

      const flattened = (exportService as any).flattenObject(testObject);
      
      expect(flattened.id).toBe('1');
      expect(flattened.name).toBe('Test School');
      expect(flattened['contact.name']).toBe('John Doe');
      expect(flattened['contact.email']).toBe('john@example.com');
      expect(flattened['preferences.timezone']).toBe('UTC+8');
      expect(flattened['preferences.programs']).toBe('CS;EE');
    });

    it('should handle arrays of objects', () => {
      const testObject = {
        id: '1',
        contacts: [
          { name: 'John', email: 'john@example.com' },
          { name: 'Jane', email: 'jane@example.com' }
        ]
      };

      const flattened = (exportService as any).flattenObject(testObject);
      
      expect(flattened.id).toBe('1');
      expect(flattened['contacts[0].name']).toBe('John');
      expect(flattened['contacts[0].email']).toBe('john@example.com');
      expect(flattened['contacts[1].name']).toBe('Jane');
      expect(flattened['contacts[1].email']).toBe('jane@example.com');
    });

    it('should handle null and undefined values', () => {
      const testObject = {
        id: '1',
        name: null,
        description: undefined,
        website: ''
      };

      const flattened = (exportService as any).flattenObject(testObject);
      
      expect(flattened.id).toBe('1');
      expect(flattened.name).toBe('');
      expect(flattened.description).toBe('');
      expect(flattened.website).toBe('');
    });
  });

  describe('Field Filtering', () => {
    it('should filter data to include only specified fields', () => {
      const testData = [
        { id: '1', name: 'School 1', country: 'Taiwan', region: 'Taipei', website: 'http://example.com' },
        { id: '2', name: 'School 2', country: 'Japan', region: 'Tokyo', website: 'http://example2.com' }
      ];

      const filteredData = (exportService as any).filterFields(testData, ['id', 'name', 'country']);
      
      expect(filteredData).toHaveLength(2);
      expect(filteredData[0]).toEqual({ id: '1', name: 'School 1', country: 'Taiwan' });
      expect(filteredData[1]).toEqual({ id: '2', name: 'School 2', country: 'Japan' });
      
      // Should not contain filtered out fields
      expect(filteredData[0]).not.toHaveProperty('region');
      expect(filteredData[0]).not.toHaveProperty('website');
    });

    it('should handle non-existent fields gracefully', () => {
      const testData = [
        { id: '1', name: 'School 1' }
      ];

      const filteredData = (exportService as any).filterFields(testData, ['id', 'name', 'nonexistent']);
      
      expect(filteredData).toHaveLength(1);
      expect(filteredData[0]).toEqual({ id: '1', name: 'School 1' });
      expect(filteredData[0]).not.toHaveProperty('nonexistent');
    });
  });
});