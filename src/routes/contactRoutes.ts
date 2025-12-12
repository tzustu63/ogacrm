import { Router } from 'express';
import { ContactController } from '../controllers/contactController';

const router = Router();

// Lazy-load controller to avoid database connection issues during import
function getContactController(): ContactController {
  return new ContactController();
}

/**
 * @route   GET /api/contacts
 * @desc    獲取聯絡人列表，支援搜尋和篩選
 * @access  Private
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   schoolId?: string,
 *   email?: string,
 *   isPrimary?: boolean,
 *   query?: string
 * }
 */
router.get('/', (req, res, next) => getContactController().getContacts(req, res, next));

/**
 * @route   POST /api/contacts
 * @desc    創建新聯絡人記錄
 * @access  Private
 * @body    {
 *   schoolId: string,
 *   name: string,
 *   email: string,
 *   phone?: string,
 *   position?: string,
 *   isPrimary?: boolean
 * }
 */
router.post('/', (req, res, next) => getContactController().createContact(req, res, next));

/**
 * @route   POST /api/contacts/batch
 * @desc    批次創建聯絡人記錄
 * @access  Private
 * @body    {
 *   contacts: Array<{
 *     schoolId: string,
 *     name: string,
 *     email: string,
 *     phone?: string,
 *     position?: string,
 *     isPrimary?: boolean
 *   }>
 * }
 */
router.post('/batch', (req, res, next) => getContactController().batchCreateContacts(req, res, next));

/**
 * @route   PUT /api/contacts/batch
 * @desc    批次更新聯絡人記錄
 * @access  Private
 * @body    {
 *   updates: Array<{
 *     id: string,
 *     data: {
 *       name?: string,
 *       email?: string,
 *       phone?: string,
 *       position?: string,
 *       isPrimary?: boolean
 *     }
 *   }>
 * }
 */
router.put('/batch', (req, res, next) => getContactController().batchUpdateContacts(req, res, next));

/**
 * @route   GET /api/contacts/:id
 * @desc    獲取單一聯絡人詳細資訊
 * @access  Private
 * @param   {string} id - 聯絡人ID (UUID)
 */
router.get('/:id', (req, res, next) => getContactController().getContactById(req, res, next));

/**
 * @route   PUT /api/contacts/:id
 * @desc    更新聯絡人資訊
 * @access  Private
 * @param   {string} id - 聯絡人ID (UUID)
 * @body    {
 *   name?: string,
 *   email?: string,
 *   phone?: string,
 *   position?: string,
 *   isPrimary?: boolean
 * }
 */
router.put('/:id', (req, res, next) => getContactController().updateContact(req, res, next));

/**
 * @route   DELETE /api/contacts/:id
 * @desc    刪除聯絡人記錄
 * @access  Private
 * @param   {string} id - 聯絡人ID (UUID)
 */
router.delete('/:id', (req, res, next) => getContactController().deleteContact(req, res, next));

export { router as contactRoutes };