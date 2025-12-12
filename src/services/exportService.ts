import { Pool } from 'pg';
import * as XLSX from 'xlsx';
import { School, Contact, Interaction, Partnership, Preference } from '../types';
import { SchoolRepository } from '../repositories/schoolRepository';
import { ContactRepository } from '../repositories/contactRepository';
import { InteractionRepository } from '../repositories/interactionRepository';
import { PartnershipRepository } from '../repositories/partnershipRepository';
import { PreferenceRepository } from '../repositories/preferenceRepository';

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  fields?: string[];
  includeRelated?: {
    contacts?: boolean;
    interactions?: boolean;
    partnerships?: boolean;
    preferences?: boolean;
  };
  batchSize?: number;
  filters?: {
    schoolIds?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export interface ExportResult {
  data: string | Buffer;
  filename: string;
  mimeType: string;
  totalRecords: number;
}

export interface ExportProgress {
  processed: number;
  total: number;
  percentage: number;
}

export class ExportService {
  private pool: Pool;
  private schoolRepository: SchoolRepository;
  private contactRepository: ContactRepository;
  private interactionRepository: InteractionRepository;
  private partnershipRepository: PartnershipRepository;
  private preferenceRepository: PreferenceRepository;

  constructor(pool: Pool) {
    this.pool = pool;
    this.schoolRepository = new SchoolRepository(pool);
    this.contactRepository = new ContactRepository(pool);
    this.interactionRepository = new InteractionRepository(pool);
    this.partnershipRepository = new PartnershipRepository(pool);
    this.preferenceRepository = new PreferenceRepository(pool);
  }

  /**
   * Export data with specified options
   */
  async exportData(options: ExportOptions): Promise<ExportResult> {
    const batchSize = options.batchSize || 1000;
    
    // Get total count for progress tracking
    const totalCount = await this.getTotalRecordCount(options);
    
    // Process data in batches for large datasets
    const allData = await this.processDataInBatches(options, batchSize, totalCount);
    
    // Generate export based on format
    const result = await this.generateExport(allData, options);
    
    return {
      ...result,
      totalRecords: totalCount
    };
  }

  /**
   * Export schools with optional related data
   */
  async exportSchools(options: ExportOptions): Promise<ExportResult> {
    const schools = await this.getSchoolsData(options);
    
    let exportData: any[] = schools;
    
    // Include related data if requested
    if (options.includeRelated) {
      exportData = await this.enrichWithRelatedData(schools, options.includeRelated);
    }
    
    // Filter fields if specified
    if (options.fields && options.fields.length > 0) {
      exportData = this.filterFields(exportData, options.fields);
    }
    
    const result = await this.generateExport(exportData, options);
    return {
      ...result,
      totalRecords: schools.length
    };
  }

  /**
   * Export contacts data
   */
  async exportContacts(options: ExportOptions): Promise<ExportResult> {
    const contacts = await this.getContactsData(options);
    
    let exportData: any[] = contacts;
    
    // Filter fields if specified
    if (options.fields && options.fields.length > 0) {
      exportData = this.filterFields(exportData, options.fields);
    }
    
    const result = await this.generateExport(exportData, options);
    return {
      ...result,
      totalRecords: contacts.length
    };
  }

  /**
   * Export interactions data
   */
  async exportInteractions(options: ExportOptions): Promise<ExportResult> {
    const interactions = await this.getInteractionsData(options);
    
    let exportData: any[] = interactions;
    
    // Filter fields if specified
    if (options.fields && options.fields.length > 0) {
      exportData = this.filterFields(exportData, options.fields);
    }
    
    const result = await this.generateExport(exportData, options);
    return {
      ...result,
      totalRecords: interactions.length
    };
  }

  /**
   * Get available fields for each data type
   */
  getAvailableFields(): {
    schools: string[];
    contacts: string[];
    interactions: string[];
    partnerships: string[];
    preferences: string[];
  } {
    return {
      schools: [
        'id', 'name', 'country', 'region', 'schoolType', 'website',
        'relationshipStatus', 'createdAt', 'updatedAt'
      ],
      contacts: [
        'id', 'schoolId', 'name', 'email', 'phone', 'position',
        'isPrimary', 'createdAt', 'updatedAt'
      ],
      interactions: [
        'id', 'schoolId', 'contactMethod', 'date', 'notes',
        'followUpRequired', 'followUpDate', 'createdBy', 'createdAt'
      ],
      partnerships: [
        'id', 'schoolId', 'mouStatus', 'mouSignedDate', 'mouExpiryDate',
        'referralCount', 'eventsHeld', 'createdAt', 'updatedAt'
      ],
      preferences: [
        'id', 'schoolId', 'preferredContactMethod', 'programsOfInterest',
        'bestContactTime', 'timezone', 'specialRequirements', 'createdAt', 'updatedAt'
      ]
    };
  }

  /**
   * Process data in batches for large datasets
   */
  private async processDataInBatches(
    options: ExportOptions,
    batchSize: number,
    totalCount: number
  ): Promise<any[]> {
    const allData: any[] = [];
    const totalBatches = Math.ceil(totalCount / batchSize);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const offset = batch * batchSize;
      const batchOptions = {
        ...options,
        pagination: {
          offset,
          limit: batchSize
        }
      };
      
      const batchData = await this.getBatchData(batchOptions);
      allData.push(...batchData);
      
      // Optional: Emit progress event for monitoring
      const progress: ExportProgress = {
        processed: Math.min((batch + 1) * batchSize, totalCount),
        total: totalCount,
        percentage: Math.round(((batch + 1) / totalBatches) * 100)
      };
      
      // Could emit progress event here if needed
      console.log(`Export progress: ${progress.percentage}%`);
    }
    
    return allData;
  }

  /**
   * Get batch data based on options
   */
  private async getBatchData(options: ExportOptions & { pagination?: { offset: number; limit: number } }): Promise<any[]> {
    // For now, focus on schools data
    return this.getSchoolsData(options);
  }

  /**
   * Get schools data with optional filtering
   */
  private async getSchoolsData(options: ExportOptions & { pagination?: { offset: number; limit: number } }): Promise<School[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT id, name, country, region, school_type as "schoolType", website,
               facebook, instagram, email,
               ownership, has_mou as "hasMOU", notes,
               relationship_status as "relationshipStatus", created_at as "createdAt",
               updated_at as "updatedAt"
        FROM schools
      `;
      
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      // Apply filters
      if (options.filters?.schoolIds && options.filters.schoolIds.length > 0) {
        conditions.push(`id = ANY($${paramIndex++})`);
        params.push(options.filters.schoolIds);
      }
      
      if (options.filters?.dateRange) {
        conditions.push(`created_at >= $${paramIndex++} AND created_at <= $${paramIndex++}`);
        params.push(options.filters.dateRange.start, options.filters.dateRange.end);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY name`;
      
      // Apply pagination if specified
      if (options.pagination) {
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(options.pagination.limit, options.pagination.offset);
      }
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get contacts data
   */
  private async getContactsData(options: ExportOptions): Promise<Contact[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT id, school_id as "schoolId", name, email, phone, position,
               is_primary as "isPrimary", created_at as "createdAt", updated_at as "updatedAt"
        FROM contacts
      `;
      
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      if (options.filters?.schoolIds && options.filters.schoolIds.length > 0) {
        conditions.push(`school_id = ANY($${paramIndex++})`);
        params.push(options.filters.schoolIds);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY school_id, name`;
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get interactions data
   */
  private async getInteractionsData(options: ExportOptions): Promise<Interaction[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT id, school_id as "schoolId", contact_method as "contactMethod", date, notes,
               follow_up_required as "followUpRequired", follow_up_date as "followUpDate",
               created_by as "createdBy", created_at as "createdAt"
        FROM interactions
      `;
      
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      if (options.filters?.schoolIds && options.filters.schoolIds.length > 0) {
        conditions.push(`school_id = ANY($${paramIndex++})`);
        params.push(options.filters.schoolIds);
      }
      
      if (options.filters?.dateRange) {
        conditions.push(`date >= $${paramIndex++} AND date <= $${paramIndex++}`);
        params.push(options.filters.dateRange.start, options.filters.dateRange.end);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY school_id, date DESC`;
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Enrich schools data with related information
   */
  private async enrichWithRelatedData(
    schools: School[],
    includeRelated: NonNullable<ExportOptions['includeRelated']>
  ): Promise<any[]> {
    const enrichedData = [];
    
    for (const school of schools) {
      const enrichedSchool: any = { ...school };
      
      if (includeRelated.contacts) {
        enrichedSchool.contacts = await this.contactRepository.findBySchoolId(school.id);
      }
      
      if (includeRelated.interactions) {
        enrichedSchool.interactions = await this.interactionRepository.findBySchoolId(school.id);
      }
      
      if (includeRelated.partnerships) {
        enrichedSchool.partnership = await this.partnershipRepository.findBySchoolId(school.id);
      }
      
      if (includeRelated.preferences) {
        enrichedSchool.preferences = await this.preferenceRepository.findBySchoolId(school.id);
      }
      
      enrichedData.push(enrichedSchool);
    }
    
    return enrichedData;
  }

  /**
   * Filter data to include only specified fields
   */
  private filterFields(data: any[], fields: string[]): any[] {
    return data.map(item => {
      const filtered: any = {};
      fields.forEach(field => {
        if (field in item) {
          filtered[field] = item[field];
        }
      });
      return filtered;
    });
  }

  /**
   * Generate export in specified format
   */
  private async generateExport(data: any[], options: ExportOptions): Promise<Omit<ExportResult, 'totalRecords'>> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    switch (options.format) {
      case 'json':
        return {
          data: JSON.stringify({ data, exportedAt: new Date().toISOString() }, null, 2),
          filename: `export-${timestamp}.json`,
          mimeType: 'application/json'
        };
        
      case 'csv':
        return {
          data: this.generateCsv(data),
          filename: `export-${timestamp}.csv`,
          mimeType: 'text/csv'
        };
        
      case 'excel':
        const excelBuffer = this.generateExcel(data);
        return {
          data: excelBuffer,
          filename: `學校資料匯出_${timestamp.split('T')[0]}.xlsx`,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };
        
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Generate CSV format
   */
  private generateCsv(data: any[]): string {
    if (data.length === 0) {
      return '';
    }
    
    // Get all unique keys from all objects
    const allKeys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        // Skip nested objects for CSV
        if (typeof item[key] !== 'object' || item[key] instanceof Date) {
          allKeys.add(key);
        }
      });
    });
    
    const headers = Array.from(allKeys);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(item => {
      return headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined) {
          return '';
        }
        
        // Handle dates
        if (value instanceof Date) {
          return value.toISOString();
        }
        
        // Handle arrays (join with semicolon)
        if (Array.isArray(value)) {
          return `"${value.join(';')}"`;
        }
        
        // Escape CSV special characters
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Generate Excel format with custom column order for schools
   */
  private generateExcel(data: any[]): Buffer {
    if (data.length === 0) {
      // Create empty workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([['No data available']]);
      XLSX.utils.book_append_sheet(wb, ws, '學校資料');
      return Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
    }

    // Check if this is schools data by checking first item keys
    const firstItem = data[0];
    const isSchoolData = 'name' in firstItem && 'country' in firstItem && 'region' in firstItem;

    if (isSchoolData) {
      return this.generateSchoolExcel(data);
    }

    // Default behavior for other data types
    const flattenedData = data.map(item => this.flattenObject(item));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(flattenedData);
    this.setColumnWidths(ws);
    XLSX.utils.book_append_sheet(wb, ws, 'Export');
    return Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
  }

  /**
   * Generate Excel with specific column order for schools
   */
  private generateSchoolExcel(schools: any[]): Buffer {
    // Define column order and Chinese headers
    const columnMap = [
      { key: 'name', header: '校名' },
      { key: 'relationshipStatus', header: '關係狀態' },
      { key: 'schoolType', header: '屬性' },
      { key: 'country', header: '國家' },
      { key: 'region', header: '區域' },
      { key: 'website', header: 'Website' },
      { key: 'facebook', header: 'FB' },
      { key: 'instagram', header: 'IG' },
      { key: 'email', header: 'Email' },
      { key: 'ownership', header: '公私立' },
      { key: 'hasMOU', header: '是否有MOU' },
      { key: 'notes', header: '備註' }
    ];

    // Map relationship status and school type to Chinese
    const relationshipStatusMap: Record<string, string> = {
      'no_response': '無回應',
      'responded': '有回應',
      'has_alumni': '有校友'
    };

    const schoolTypeMap: Record<string, string> = {
      'high_school': '高中',
      'technical_college': '技術學院',
      'university': '大學',
      'vocational': '技職學校',
      'other': '其他'
    };

    const ownershipMap: Record<string, string> = {
      'public': '公',
      'private': '私'
    };

    // Prepare data with Chinese headers and mapped values
    const excelData = schools.map(school => {
      const row: any = {};
      columnMap.forEach(col => {
        let value = school[col.key];
        
        if (value === null || value === undefined || value === '') {
          row[col.header] = '';
          return;
        }

        // Map enum values to Chinese
        if (col.key === 'relationshipStatus') {
          value = relationshipStatusMap[value] || value;
        } else if (col.key === 'schoolType') {
          value = schoolTypeMap[value] || value;
        } else if (col.key === 'ownership') {
          value = ownershipMap[value] || value;
        } else if (col.key === 'hasMOU') {
          value = value === true || value === 'true' ? '有' : '無';
        } else if (col.key === 'email' && typeof value === 'string') {
          // Email is already a string, no conversion needed
        }

        row[col.header] = value;
      });
      return row;
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData, { header: columnMap.map(c => c.header) });
    
    // Set column widths
    this.setColumnWidths(ws);
    
    XLSX.utils.book_append_sheet(wb, ws, '學校資料');
    
    return Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
  }

  /**
   * Set column widths for worksheet
   */
  private setColumnWidths(ws: XLSX.WorkSheet): void {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const colWidths: any[] = [];
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddress];
        if (cell && cell.v) {
          const cellLength = String(cell.v).length;
          maxWidth = Math.max(maxWidth, cellLength);
        }
      }
      colWidths.push({ width: Math.min(maxWidth + 2, 50) });
    }
    
    ws['!cols'] = colWidths;
  }

  /**
   * Flatten nested objects for Excel export
   */
  private flattenObject(obj: any, prefix = ''): any {
    const flattened: any = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (value === null || value === undefined) {
          flattened[newKey] = '';
        } else if (value instanceof Date) {
          flattened[newKey] = value.toISOString();
        } else if (Array.isArray(value)) {
          // Handle arrays
          if (value.length > 0 && typeof value[0] === 'object') {
            // Array of objects - create separate columns for each item
            value.forEach((item, index) => {
              const itemFlattened = this.flattenObject(item, `${newKey}[${index}]`);
              Object.assign(flattened, itemFlattened);
            });
          } else {
            // Array of primitives - join with semicolon
            flattened[newKey] = value.join(';');
          }
        } else if (typeof value === 'object') {
          // Nested object
          const nestedFlattened = this.flattenObject(value, newKey);
          Object.assign(flattened, nestedFlattened);
        } else {
          flattened[newKey] = value;
        }
      }
    }
    
    return flattened;
  }

  /**
   * Get total record count for progress tracking
   */
  private async getTotalRecordCount(options: ExportOptions): Promise<number> {
    const client = await this.pool.connect();
    try {
      let query = 'SELECT COUNT(*) as count FROM schools';
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      if (options.filters?.schoolIds && options.filters.schoolIds.length > 0) {
        conditions.push(`id = ANY($${paramIndex++})`);
        params.push(options.filters.schoolIds);
      }
      
      if (options.filters?.dateRange) {
        conditions.push(`created_at >= $${paramIndex++} AND created_at <= $${paramIndex++}`);
        params.push(options.filters.dateRange.start, options.filters.dateRange.end);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      const result = await client.query(query, params);
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }
}