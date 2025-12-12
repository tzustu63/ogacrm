import { Request, Response } from 'express';
import { Pool } from 'pg';
import { ExportService, ExportOptions } from '../services/exportService';
import { validateExportRequest } from '../utils/validation';

export class ExportController {
  private exportService: ExportService;

  constructor(pool: Pool) {
    this.exportService = new ExportService(pool);
  }

  /**
   * Export schools data
   */
  exportSchools = async (req: Request, res: Response): Promise<void> => {
    try {
      const options = this.parseExportOptions(req);
      const result = await this.exportService.exportSchools(options);
      
      this.sendExportResponse(res, result);
    } catch (error) {
      console.error('Export schools error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: 'Failed to export schools data',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  };

  /**
   * Export contacts data
   */
  exportContacts = async (req: Request, res: Response): Promise<void> => {
    try {
      const options = this.parseExportOptions(req);
      const result = await this.exportService.exportContacts(options);
      
      this.sendExportResponse(res, result);
    } catch (error) {
      console.error('Export contacts error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: 'Failed to export contacts data',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  };

  /**
   * Export interactions data
   */
  exportInteractions = async (req: Request, res: Response): Promise<void> => {
    try {
      const options = this.parseExportOptions(req);
      const result = await this.exportService.exportInteractions(options);
      
      this.sendExportResponse(res, result);
    } catch (error) {
      console.error('Export interactions error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: 'Failed to export interactions data',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  };

  /**
   * Export comprehensive data (schools with related data)
   */
  exportComprehensive = async (req: Request, res: Response): Promise<void> => {
    try {
      const options = this.parseExportOptions(req);
      
      // Enable all related data for comprehensive export
      options.includeRelated = {
        contacts: true,
        interactions: true,
        partnerships: true,
        preferences: true
      };
      
      const result = await this.exportService.exportSchools(options);
      
      this.sendExportResponse(res, result);
    } catch (error) {
      console.error('Export comprehensive error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: 'Failed to export comprehensive data',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  };

  /**
   * Get available fields for export
   */
  getAvailableFields = async (req: Request, res: Response): Promise<void> => {
    try {
      const fields = this.exportService.getAvailableFields();
      
      res.json({
        success: true,
        data: fields
      });
    } catch (error) {
      console.error('Get available fields error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FIELDS_ERROR',
          message: 'Failed to get available fields',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  };

  /**
   * Parse export options from request
   */
  private parseExportOptions(req: Request): ExportOptions {
    const {
      format = 'json',
      fields,
      includeContacts,
      includeInteractions,
      includePartnerships,
      includePreferences,
      batchSize,
      schoolIds,
      startDate,
      endDate
    } = req.body;

    // Validate format
    if (!['csv', 'json', 'excel'].includes(format)) {
      throw new Error(`Invalid export format: ${format}`);
    }

    const options: ExportOptions = {
      format: format as 'csv' | 'json' | 'excel'
    };

    // Parse fields
    if (fields && Array.isArray(fields) && fields.length > 0) {
      options.fields = fields;
    }

    // Parse include related options
    if (includeContacts || includeInteractions || includePartnerships || includePreferences) {
      options.includeRelated = {
        contacts: Boolean(includeContacts),
        interactions: Boolean(includeInteractions),
        partnerships: Boolean(includePartnerships),
        preferences: Boolean(includePreferences)
      };
    }

    // Parse batch size
    if (batchSize && typeof batchSize === 'number' && batchSize > 0) {
      options.batchSize = Math.min(batchSize, 10000); // Cap at 10k for safety
    }

    // Parse filters
    if (schoolIds || startDate || endDate) {
      options.filters = {};
      
      if (schoolIds && Array.isArray(schoolIds) && schoolIds.length > 0) {
        options.filters.schoolIds = schoolIds;
      }
      
      if (startDate || endDate) {
        options.filters.dateRange = {
          start: startDate ? new Date(startDate) : new Date('1900-01-01'),
          end: endDate ? new Date(endDate) : new Date()
        };
      }
    }

    return options;
  }

  /**
   * Send export response with appropriate headers
   */
  private sendExportResponse(res: Response, result: any): void {
    // Set appropriate headers
    const filename = encodeURIComponent(result.filename);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);
    res.setHeader('Content-Type', result.mimeType);
    
    // Add custom headers for metadata
    res.setHeader('X-Total-Records', result.totalRecords.toString());
    res.setHeader('X-Export-Timestamp', new Date().toISOString());
    
    if (result.mimeType === 'application/json') {
      res.json({
        success: true,
        data: JSON.parse(result.data),
        metadata: {
          totalRecords: result.totalRecords,
          exportedAt: new Date().toISOString(),
          filename: result.filename
        }
      });
    } else {
      // For CSV and Excel, send raw data as Buffer
      if (Buffer.isBuffer(result.data)) {
        res.end(result.data);
      } else {
        res.end(Buffer.from(result.data, 'utf8'));
      }
    }
  }
}