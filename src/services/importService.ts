import { Pool } from 'pg';
import * as XLSX from 'xlsx';
import { SchoolRepository, CreateSchoolData } from '../repositories/schoolRepository';
import { SchoolType, RelationshipStatus, SchoolOwnership } from '../types';
import { logger } from '../utils/logger';

// Extended CreateSchoolData interface matching repository definition
interface ExtendedCreateSchoolData {
  name: string;
  country: string;
  region: string;
  schoolType: SchoolType;
  website?: string;
  facebook?: string;
  instagram?: string;
  email?: string;
  ownership?: string; // 'public' | 'private'
  hasMOU?: boolean;
  notes?: string;
  relationshipStatus?: RelationshipStatus;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    schoolName?: string;
    error: string;
  }>;
  imported: Array<{
    id: string;
    name: string;
  }>;
}

export interface ImportOptions {
  skipErrors?: boolean;
  updateExisting?: boolean; // 如果學校名稱已存在，是否更新
}

export class ImportService {
  private pool: Pool;
  private schoolRepository: SchoolRepository;

  constructor(pool: Pool) {
    this.pool = pool;
    this.schoolRepository = new SchoolRepository(pool);
  }

  /**
   * Import schools from Excel file
   */
  async importSchoolsFromExcel(fileBuffer: Buffer, options: ImportOptions = {}): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      imported: []
    };

    try {
      // Parse Excel file
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Excel 檔案格式錯誤：無法讀取工作表');
      }
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('Excel 檔案格式錯誤：無法讀取工作表名稱');
      }
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        throw new Error('Excel 檔案格式錯誤：無法讀取工作表內容');
      }
      
      // Get headers (first row) - read directly from worksheet to preserve hyperlinks
      const headersRow: any[] = [];
      const headerColIndexes: number[] = [];
      let maxCol = 0;
      
      // Find the range of the sheet
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // Read header row (row 0, which is first row in XLSX)
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        const cell = worksheet[cellAddress];
        if (cell) {
          headersRow.push(cell.v || '');
          headerColIndexes.push(col);
          maxCol = Math.max(maxCol, col);
        }
      }
      
      if (headersRow.length === 0) {
        throw new Error('Excel 檔案格式錯誤：無法讀取標題列');
      }
      
      const headers = this.normalizeHeaders(headersRow);

      // Read data rows, preserving hyperlink information
      const dataRows: any[][] = [];
      for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex++) {
        const rowData: any[] = [];
        headerColIndexes.forEach((colIndex) => {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
          const cell = worksheet[cellAddress];
          if (cell) {
            // Check if cell has hyperlink
            let value = cell.v;
            if (cell.l && cell.l.Target) {
              // Use hyperlink URL if available
              value = cell.l.Target;
            } else if (cell.v !== null && cell.v !== undefined) {
              // Use cell value
              value = cell.v;
            }
            rowData.push(value);
          } else {
            rowData.push(null);
          }
        });
        dataRows.push(rowData);
      }

      if (dataRows.length === 0) {
        throw new Error('Excel 檔案格式錯誤：至少需要標題列和一行資料');
      }
      
      const data = dataRows;
      
      // Validate headers
      this.validateHeaders(headers);

      // Process data rows
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row)) {
          continue; // Skip invalid rows
        }
        const rowNumber = i + 2; // Excel row number (1-based, including header: data row 0 = Excel row 2)

        try {
          // Skip empty rows
          if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
            continue;
          }

          // Parse row data (data already has hyperlinks extracted)
          const schoolData = this.parseRowData(row, headers);

          // Validate required fields
          this.validateSchoolData(schoolData, rowNumber);

          // Convert to CreateSchoolData format
          const createData = this.convertToCreateData(schoolData);

          // Always check if school already exists (by name)
          const existingSchool = await this.findSchoolByName(createData.name);
          
          if (existingSchool) {
            if (options.updateExisting) {
              // Update existing school
              const updateData: any = {
                country: createData.country,
                region: createData.region,
                schoolType: createData.schoolType,
                relationshipStatus: createData.relationshipStatus
              };
              
              if (createData.website !== undefined) updateData.website = createData.website;
              if (createData.facebook !== undefined) updateData.facebook = createData.facebook;
              if (createData.instagram !== undefined) updateData.instagram = createData.instagram;
              if (createData.email !== undefined) updateData.email = createData.email;
              if (createData.ownership !== undefined) updateData.ownership = createData.ownership;
              if (createData.hasMOU !== undefined) updateData.hasMOU = createData.hasMOU;
              if (createData.notes !== undefined) updateData.notes = createData.notes;
              
              await this.schoolRepository.update(existingSchool.id, updateData);
              result.success++;
              result.imported.push({ id: existingSchool.id, name: createData.name });
            } else {
              // Skip if updateExisting is false (don't create duplicate)
              result.failed++;
              result.errors.push({
                row: rowNumber,
                schoolName: createData.name,
                error: `學校「${createData.name}」已存在，跳過（如要更新請勾選「若學校名稱已存在，則更新資料」）`
              });
              // 不拋出錯誤，繼續處理後續行
            }
            continue;
          }

          // Create new school (only if doesn't exist)
          const newSchool = await this.schoolRepository.create(createData);
          result.success++;
          result.imported.push({ id: newSchool.id, name: newSchool.name });

        } catch (error: any) {
          result.failed++;
          const schoolName = row[headers.indexOf('校名')] || row[headers.indexOf('學校名稱')] || '未知';
          const errorMessage = error.message || '匯入失敗';
          result.errors.push({
            row: rowNumber,
            schoolName: String(schoolName),
            error: errorMessage
          });

          // 記錄錯誤但繼續處理後續行（不中斷整個匯入過程）
          logger.warn(`匯入第 ${rowNumber} 行失敗: ${errorMessage}`, { row, error });
        }
      }

      logger.info(`匯入完成: 成功 ${result.success} 筆, 失敗 ${result.failed} 筆`);
      return result;

    } catch (error: any) {
      logger.error('匯入 Excel 檔案失敗:', error);
      throw new Error(`匯入失敗: ${error.message}`);
    }
  }

  /**
   * Normalize headers to handle variations
   */
  private normalizeHeaders(headers: any[]): string[] {
    const headerMap: Record<string, string> = {
      '校名': '校名',
      '學校名稱': '校名',
      '學校名字': '校名',
      'name': '校名',
      '關係狀態': '關係狀態',
      '關係': '關係狀態',
      'relationshipStatus': '關係狀態',
      '屬性': '屬性',
      '學校類型': '屬性',
      '類型': '屬性',
      'schoolType': '屬性',
      '國家': '國家',
      'country': '國家',
      '區域': '區域',
      '地區': '區域',
      'region': '區域',
      'Website': 'Website',
      'website': 'Website',
      '網站': 'Website',
      'FB': 'FB',
      'facebook': 'FB',
      '臉書': 'FB',
      'IG': 'IG',
      'instagram': 'IG',
      'Instagram': 'IG',
      'Email': 'Email',
      'email': 'Email',
      '信箱': 'Email',
      '公私立': '公私立',
      'ownership': '公私立',
      '是否有MOU': '是否有MOU',
      'hasMOU': '是否有MOU',
      'MOU': '是否有MOU',
      '備註': '備註',
      'notes': '備註',
      '備注': '備註',
      '說明': '備註'
    };

    return headers.map((header: any) => {
      const normalized = String(header || '').trim();
      return headerMap[normalized] || normalized;
    });
  }

  /**
   * Validate headers
   */
  private validateHeaders(headers: string[]): void {
    const requiredHeaders = ['校名', '國家', '區域'];
    const missing = requiredHeaders.filter(h => !headers.includes(h));

    if (missing.length > 0) {
      throw new Error(`缺少必要欄位: ${missing.join(', ')}`);
    }
  }

  /**
   * Parse row data into object
   */
  private parseRowData(row: any[], headers: string[]): Record<string, any> {
    const data: Record<string, any> = {};

    headers.forEach((header, index) => {
      const value = row[index];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        const trimmedValue = String(value).trim();
        // For Website, FB, IG fields, if value is "link" or similar, 
        // it should already be the URL from hyperlink extraction
        data[header] = trimmedValue;
      }
    });

    return data;
  }

  /**
   * Validate school data
   */
  private validateSchoolData(data: Record<string, any>, rowNumber: number): void {
    if (!data['校名'] || String(data['校名']).trim() === '') {
      throw new Error('第 ' + rowNumber + ' 行：校名為必填欄位');
    }

    if (!data['國家'] || String(data['國家']).trim() === '') {
      throw new Error('第 ' + rowNumber + ' 行：國家為必填欄位');
    }

    if (!data['區域'] || String(data['區域']).trim() === '') {
      throw new Error('第 ' + rowNumber + ' 行：區域為必填欄位');
    }
  }

  /**
   * Convert parsed data to CreateSchoolData
   */
  private convertToCreateData(data: Record<string, any>): ExtendedCreateSchoolData {
    // Map relationship status
    const relationshipStatusMap: Record<string, RelationshipStatus> = {
      '無回應': RelationshipStatus.NO_RESPONSE,
      'no_response': RelationshipStatus.NO_RESPONSE,
      '有回應': RelationshipStatus.RESPONDED,
      'responded': RelationshipStatus.RESPONDED,
      '有校友': RelationshipStatus.HAS_ALUMNI,
      'has_alumni': RelationshipStatus.HAS_ALUMNI
    };

    // Map school type
    const schoolTypeMap: Record<string, SchoolType> = {
      '高中': SchoolType.HIGH_SCHOOL,
      'high_school': SchoolType.HIGH_SCHOOL,
      '技術學院': SchoolType.TECHNICAL_COLLEGE,
      'technical_college': SchoolType.TECHNICAL_COLLEGE,
      '大學': SchoolType.UNIVERSITY,
      'university': SchoolType.UNIVERSITY,
      '技職學校': SchoolType.VOCATIONAL,
      'vocational': SchoolType.VOCATIONAL,
      '其他': SchoolType.OTHER,
      'other': SchoolType.OTHER
    };

    // Map ownership
    const ownershipMap: Record<string, SchoolOwnership> = {
      '公': SchoolOwnership.PUBLIC,
      '公立': SchoolOwnership.PUBLIC,
      'public': SchoolOwnership.PUBLIC,
      '私': SchoolOwnership.PRIVATE,
      '私立': SchoolOwnership.PRIVATE,
      'private': SchoolOwnership.PRIVATE
    };

    // Map MOU
    const hasMOU = data['是否有MOU'];
    let hasMOUValue: boolean | undefined;
    if (hasMOU) {
      const mouStr = String(hasMOU).toLowerCase();
      if (mouStr === '有' || mouStr === 'yes' || mouStr === 'true' || mouStr === '1') {
        hasMOUValue = true;
      } else if (mouStr === '無' || mouStr === 'no' || mouStr === 'false' || mouStr === '0') {
        hasMOUValue = false;
      }
    }

    // Parse email
    let email: string | undefined;
    if (data['Email']) {
      const emailStr = String(data['Email']).trim();
      if (emailStr) {
        email = emailStr;
      }
    }

    const result: ExtendedCreateSchoolData = {
      name: String(data['校名']).trim(),
      country: String(data['國家']).trim(),
      region: String(data['區域']).trim(),
      schoolType: data['屬性'] ? (schoolTypeMap[data['屬性']] || SchoolType.OTHER) : SchoolType.HIGH_SCHOOL,
      relationshipStatus: data['關係狀態'] ? (relationshipStatusMap[data['關係狀態']] || RelationshipStatus.NO_RESPONSE) : RelationshipStatus.NO_RESPONSE
    };

    // Add optional fields only if they have values
    // For URL fields, if value is "link" or similar, it should already be the URL from hyperlink extraction
    if (data['Website']) {
      const website = String(data['Website']).trim();
      // If it's "link", we might still have the URL in the value (from hyperlink extraction)
      result.website = website;
    }
    if (data['FB']) {
      const fb = String(data['FB']).trim();
      result.facebook = fb;
    }
    if (data['IG']) {
      const ig = String(data['IG']).trim();
      result.instagram = ig;
    }
    if (email !== undefined) result.email = email;
    if (data['公私立']) {
      const ownership = ownershipMap[data['公私立']];
      if (ownership) result.ownership = ownership.toString();
    }
    if (hasMOUValue !== undefined) result.hasMOU = hasMOUValue;
    if (data['備註']) result.notes = String(data['備註']).trim();

    return result;
  }

  /**
   * Find school by name (helper for updateExisting)
   */
  private async findSchoolByName(name: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT id, name, country, region, school_type as "schoolType", website, facebook, instagram, email, ownership, has_mou as "hasMOU", notes, relationship_status as "relationshipStatus", created_at as "createdAt", updated_at as "updatedAt" FROM schools WHERE name = $1',
        [name]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
}
