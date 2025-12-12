import { Router } from 'express';
import { InteractionController } from '../controllers/interactionController';

const router = Router();

// Lazy-load controller to avoid database connection issues during import
function getInteractionController(): InteractionController {
  return new InteractionController();
}

/**
 * @route   GET /api/interactions
 * @desc    獲取互動記錄列表，支援搜尋和篩選
 * @access  Private
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   schoolId?: string,
 *   contactMethod?: ContactMethod,
 *   dateFrom?: Date,
 *   dateTo?: Date,
 *   followUpRequired?: boolean,
 *   createdBy?: string,
 *   query?: string,
 *   sortBy?: string,
 *   sortOrder?: 'asc' | 'desc'
 * }
 */
router.get('/', (req, res, next) => getInteractionController().getInteractions(req, res, next));

/**
 * @route   GET /api/interactions/schools
 * @desc    獲取有互動記錄的學校列表
 * @access  Private
 */
router.get('/schools', (req, res, next) => getInteractionController().getSchoolsWithInteractions(req, res, next));

/**
 * @route   GET /api/interactions/follow-ups
 * @desc    獲取待跟進的互動記錄
 * @access  Private
 * @query   {
 *   beforeDate?: Date
 * }
 */
router.get('/follow-ups', (req, res, next) => getInteractionController().getPendingFollowUps(req, res, next));

/**
 * @route   POST /api/interactions
 * @desc    創建新互動記錄
 * @access  Private
 * @body    {
 *   schoolId: string,
 *   contactMethod: ContactMethod,
 *   date: Date,
 *   notes: string,
 *   followUpRequired?: boolean,
 *   followUpDate?: Date
 * }
 */
router.post('/', (req, res, next) => getInteractionController().createInteraction(req, res, next));

/**
 * @route   GET /api/interactions/:id
 * @desc    獲取單一互動記錄詳細資訊
 * @access  Private
 * @param   {string} id - 互動記錄ID (UUID)
 */
router.get('/:id', (req, res, next) => getInteractionController().getInteractionById(req, res, next));

/**
 * @route   PUT /api/interactions/:id
 * @desc    更新互動記錄
 * @access  Private
 * @param   {string} id - 互動記錄ID (UUID)
 * @body    {
 *   contactMethod?: ContactMethod,
 *   date?: Date,
 *   notes?: string,
 *   followUpRequired?: boolean,
 *   followUpDate?: Date
 * }
 */
router.put('/:id', (req, res, next) => getInteractionController().updateInteraction(req, res, next));

/**
 * @route   DELETE /api/interactions/:id
 * @desc    刪除互動記錄
 * @access  Private
 * @param   {string} id - 互動記錄ID (UUID)
 */
router.delete('/:id', (req, res, next) => getInteractionController().deleteInteraction(req, res, next));

export { router as interactionRoutes };