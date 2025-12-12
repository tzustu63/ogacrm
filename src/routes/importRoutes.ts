import { Router } from 'express';
import { Pool } from 'pg';
import { ImportController } from '../controllers/importController';
import { authMiddleware } from '../middleware/auth';

export function createImportRoutes(pool: Pool): Router {
  const router = Router();
  const importController = new ImportController(pool);

  // Apply authentication to all import routes
  router.use(authMiddleware);

  // Upload middleware for file handling
  router.post('/schools', importController.uploadMiddleware, importController.importSchools);

  // Get import template
  router.get('/template', importController.getTemplate);

  return router;
}
