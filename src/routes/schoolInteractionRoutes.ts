import { Router } from 'express';
import { InteractionController } from '../controllers/interactionController';

const router = Router({ mergeParams: true }); // Enable access to parent route params

// Lazy-load controller to avoid database connection issues during import
function getInteractionController(): InteractionController {
  return new InteractionController();
}

/**
 * @route   GET /api/schools/:schoolId/interactions
 * @desc    獲取指定學校的互動歷史（按時間順序）
 * @access  Private
 * @param   {string} schoolId - 學校ID (UUID)
 */
router.get('/', (req, res, next) => getInteractionController().getInteractionsBySchool(req, res, next));

/**
 * @route   GET /api/schools/:schoolId/interactions/stats
 * @desc    獲取學校的互動統計資料
 * @access  Private
 * @param   {string} schoolId - 學校ID (UUID)
 */
router.get('/stats', (req, res, next) => getInteractionController().getSchoolInteractionStats(req, res, next));

/**
 * @route   POST /api/schools/:schoolId/interactions
 * @desc    為指定學校創建新互動記錄
 * @access  Private
 * @param   {string} schoolId - 學校ID (UUID)
 * @body    {
 *   contactMethod: ContactMethod,
 *   date: Date,
 *   notes: string,
 *   followUpRequired?: boolean,
 *   followUpDate?: Date
 * }
 */
router.post('/', (req, res, next) => {
  // 從路由參數中獲取 schoolId 並添加到請求體中
  const schoolId = (req.params as any).schoolId;
  if (schoolId) {
    req.body.schoolId = schoolId;
  }
  getInteractionController().createInteraction(req, res, next);
});

export { router as schoolInteractionRoutes };