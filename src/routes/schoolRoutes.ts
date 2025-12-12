import { Router } from 'express';
import { SchoolController } from '../controllers/schoolController';

const router = Router();

// Lazy-load controller to avoid database connection issues during import
function getSchoolController(): SchoolController {
  return new SchoolController();
}

/**
 * @route   GET /api/schools
 * @desc    獲取學校列表，支援搜尋和篩選
 * @access  Private
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   country?: string,
 *   region?: string,
 *   schoolType?: SchoolType,
 *   relationshipStatus?: RelationshipStatus,
 *   query?: string,
 *   sortBy?: string,
 *   sortOrder?: 'asc' | 'desc'
 * }
 */
router.get('/', (req, res, next) => getSchoolController().getSchools(req, res, next));

/**
 * @route   POST /api/schools
 * @desc    創建新學校記錄
 * @access  Private
 * @body    {
 *   name: string,
 *   country: string,
 *   region: string,
 *   schoolType: SchoolType,
 *   website?: string,
 *   relationshipStatus?: RelationshipStatus
 * }
 */
router.post('/', (req, res, next) => getSchoolController().createSchool(req, res, next));

/**
 * @route   GET /api/schools/:id
 * @desc    獲取單一學校詳細資訊
 * @access  Private
 * @param   {string} id - 學校ID (UUID)
 */
router.get('/:id', (req, res, next) => getSchoolController().getSchoolById(req, res, next));

/**
 * @route   PUT /api/schools/:id
 * @desc    更新學校資訊
 * @access  Private
 * @param   {string} id - 學校ID (UUID)
 * @body    {
 *   name?: string,
 *   country?: string,
 *   region?: string,
 *   schoolType?: SchoolType,
 *   website?: string,
 *   relationshipStatus?: RelationshipStatus
 * }
 */
router.put('/:id', (req, res, next) => getSchoolController().updateSchool(req, res, next));

/**
 * @route   DELETE /api/schools/:id
 * @desc    刪除學校記錄
 * @access  Private
 * @param   {string} id - 學校ID (UUID)
 */
router.delete('/:id', (req, res, next) => getSchoolController().deleteSchool(req, res, next));

/**
 * @route   PUT /api/schools/:id/relationship-status
 * @desc    更新學校關係狀態
 * @access  Private
 * @param   {string} id - 學校ID (UUID)
 * @body    {
 *   relationshipStatus: RelationshipStatus
 * }
 */
router.put('/:id/relationship-status', (req, res, next) => {
  // Import InteractionController here to avoid circular dependencies
  const { InteractionController } = require('../controllers/interactionController');
  const controller = new InteractionController();
  // Map :id to :schoolId for the interaction controller
  (req.params as any).schoolId = req.params.id;
  controller.updateRelationshipStatus(req, res, next);
});

export { router as schoolRoutes };