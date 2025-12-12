import { Router } from 'express';
import { ContactController } from '../controllers/contactController';

const router = Router({ mergeParams: true }); // Enable access to parent route params

// Lazy-load controller to avoid database connection issues during import
function getContactController(): ContactController {
  return new ContactController();
}

/**
 * @route   GET /api/schools/:schoolId/contacts
 * @desc    獲取指定學校的所有聯絡人
 * @access  Private
 * @param   {string} schoolId - 學校ID (UUID)
 */
router.get('/', (req, res, next) => getContactController().getContactsBySchool(req, res, next));

/**
 * @route   POST /api/schools/:schoolId/contacts
 * @desc    為指定學校創建新聯絡人
 * @access  Private
 * @param   {string} schoolId - 學校ID (UUID)
 * @body    {
 *   name: string,
 *   email: string,
 *   phone?: string,
 *   position?: string,
 *   isPrimary?: boolean
 * }
 */
router.post('/', (req, res, next) => {
  // 從路由參數中獲取 schoolId 並添加到請求體中
  const schoolId = (req.params as any).schoolId;
  if (schoolId) {
    req.body.schoolId = schoolId;
  }
  getContactController().createContact(req, res, next);
});

/**
 * @route   POST /api/schools/:schoolId/contacts/bulk
 * @desc    為指定學校批次創建聯絡人
 * @access  Private
 * @param   {string} schoolId - 學校ID (UUID)
 * @body    {
 *   contacts: Array<{
 *     name: string,
 *     email: string,
 *     phone?: string,
 *     position?: string,
 *     isPrimary?: boolean
 *   }>
 * }
 */
router.post('/bulk', (req, res, next) => {
  // 從路由參數中獲取 schoolId 並添加到每個聯絡人中
  const schoolId = (req.params as any).schoolId;
  if (schoolId && req.body.contacts && Array.isArray(req.body.contacts)) {
    req.body.contacts = req.body.contacts.map((contact: any) => ({
      ...contact,
      schoolId
    }));
  }
  getContactController().batchCreateContacts(req, res, next);
});


export { router as schoolContactRoutes };