import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { ImportService, ImportOptions } from '../services/importService';
import { logger } from '../utils/logger';
import * as XLSX from 'xlsx';
import multer from 'multer';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Validate by file extension (more reliable than MIME type)
    const fileName = file.originalname.toLowerCase();
    const validExtensions = ['.xlsx', '.xls'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    // Also check MIME type as secondary validation
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
      'application/octet-stream' // Some systems may use this
    ];
    const hasValidType = allowedMimes.includes(file.mimetype) || file.mimetype === '';
    
    if (hasValidExtension || hasValidType) {
      cb(null, true);
    } else {
      cb(new Error('只支援 Excel 檔案格式 (.xlsx, .xls)'));
    }
  }
});

export class ImportController {
  private importService: ImportService;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.importService = new ImportService(pool);
  }

  /**
   * Multer middleware for file upload
   */
  uploadMiddleware = upload.single('file');

  /**
   * Import schools from Excel file
   * POST /api/import/schools
   */
  importSchools = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: '請上傳 Excel 檔案'
          }
        });
        return;
      }

      const options: ImportOptions = {
        skipErrors: req.body.skipErrors === 'true' || req.body.skipErrors === true,
        updateExisting: req.body.updateExisting === 'true' || req.body.updateExisting === true
      };

      const result = await this.importService.importSchoolsFromExcel(
        req.file.buffer,
        options
      );

      logger.info(`匯入完成: 成功 ${result.success} 筆, 失敗 ${result.failed} 筆`);

      res.status(200).json({
        success: true,
        data: result,
        message: `匯入完成：成功 ${result.success} 筆，失敗 ${result.failed} 筆`
      });
    } catch (error: any) {
      logger.error('匯入學校資料失敗:', error);
      next(error);
    }
  }

  /**
   * Get import template
   * GET /api/import/template
   */
  getTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Define column headers (Chinese)
      const headers = [
        '校名',
        '關係狀態',
        '屬性',
        '國家',
        '區域',
        'Website',
        'FB',
        'IG',
        'Email',
        '公私立',
        '是否有MOU',
        '備註'
      ];

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      
      // Set column widths
      const colWidths = headers.map(() => ({ width: 15 }));
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, '學校資料');
      
      // Generate buffer
      const buffer = Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
      
      // Set headers with proper encoding for Chinese filename
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const filename = '學校匯入範本.xlsx';
      // Use RFC 5987 encoding: filename*=UTF-8''encoded-filename
      const encodedFilename = encodeURIComponent(filename);
      res.setHeader('Content-Disposition', `attachment; filename="template.xlsx"; filename*=UTF-8''${encodedFilename}`);
      res.end(buffer);
    } catch (error: any) {
      logger.error('生成匯入範本失敗:', error);
      next(error);
    }
  }
}
