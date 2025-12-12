import { Router } from 'express';
import { Pool } from 'pg';
import { DashboardController } from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/auth';

export function createDashboardRoutes(pool: Pool): Router {
  const router = Router();
  const dashboardController = new DashboardController(pool);

  // Apply authentication to all dashboard routes
  router.use(authMiddleware);

  /**
   * @route   GET /api/dashboard/stats
   * @desc    獲取儀表板統計數據
   * @access  Private
   */
  router.get('/stats', (req, res, next) => 
    dashboardController.getDashboardStats(req, res, next)
  );

  return router;
}

