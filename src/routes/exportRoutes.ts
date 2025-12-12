import { Router } from 'express';
import { Pool } from 'pg';
import { ExportController } from '../controllers/exportController';
import { authMiddleware } from '../middleware/auth';
import { validateExportRequest } from '../utils/validation';

export function createExportRoutes(pool: Pool): Router {
  const router = Router();
  const exportController = new ExportController(pool);

  // Middleware to validate export requests
  const validateExport = (req: any, res: any, next: any) => {
    const validation = validateExportRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid export request',
          details: validation.error
        }
      });
    }
    req.body = validation.value;
    next();
  };

  // Apply authentication to all export routes
  router.use(authMiddleware);

  // Get available fields for export
  router.get('/fields', exportController.getAvailableFields);

  // Export schools data
  router.post('/schools', validateExport, exportController.exportSchools);

  // Export contacts data
  router.post('/contacts', validateExport, exportController.exportContacts);

  // Export interactions data
  router.post('/interactions', validateExport, exportController.exportInteractions);

  // Export comprehensive data (schools with all related data)
  router.post('/comprehensive', validateExport, exportController.exportComprehensive);

  return router;
}