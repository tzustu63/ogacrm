import { Router } from 'express';
import { SearchController } from '../controllers/searchController';

const router = Router();

// Lazy-load controller to avoid database connection issues during import
function getSearchController(): SearchController {
  return new SearchController();
}

/**
 * @route   GET /api/search
 * @desc    執行基本搜尋查詢，支援文字搜尋和篩選
 * @access  Private
 * @query   {
 *   query?: string,
 *   country?: string,
 *   region?: string,
 *   schoolType?: SchoolType,
 *   relationshipStatus?: RelationshipStatus,
 *   mouStatus?: MOUStatus,
 *   sortBy?: string,
 *   sortOrder?: 'asc' | 'desc',
 *   page?: number,
 *   limit?: number
 * }
 */
router.get('/', (req, res, next) => getSearchController().search(req, res, next));

/**
 * @route   POST /api/search/advanced
 * @desc    執行進階搜尋，支援複雜篩選條件
 * @access  Private
 * @body    {
 *   query?: string,
 *   country?: string,
 *   region?: string,
 *   schoolType?: SchoolType,
 *   relationshipStatus?: RelationshipStatus,
 *   mouStatus?: MOUStatus,
 *   sortBy?: string,
 *   sortOrder?: 'asc' | 'desc',
 *   page?: number,
 *   limit?: number
 * }
 */
router.post('/advanced', (req, res, next) => getSearchController().advancedSearch(req, res, next));

/**
 * @route   GET /api/search/clear
 * @desc    清除所有篩選條件，返回所有學校記錄
 * @access  Private
 * @query   {
 *   sortBy?: string,
 *   sortOrder?: 'asc' | 'desc',
 *   page?: number,
 *   limit?: number
 * }
 */
router.get('/clear', (req, res, next) => getSearchController().clearFilters(req, res, next));

/**
 * @route   POST /api/search/export
 * @desc    匯出搜尋結果到指定格式
 * @access  Private
 * @body    {
 *   query?: string,
 *   country?: string,
 *   region?: string,
 *   schoolType?: SchoolType,
 *   relationshipStatus?: RelationshipStatus,
 *   mouStatus?: MOUStatus,
 *   format?: 'csv' | 'json' | 'excel',
 *   fields?: string[],
 *   sortBy?: string,
 *   sortOrder?: 'asc' | 'desc'
 * }
 */
router.post('/export', (req, res, next) => getSearchController().exportResults(req, res, next));

/**
 * @route   GET /api/search/suggestions
 * @desc    獲取搜尋自動完成建議
 * @access  Private
 * @query   {
 *   query: string,
 *   type?: 'all' | 'schools' | 'contacts' | 'countries' | 'regions'
 * }
 */
router.get('/suggestions', (req, res, next) => getSearchController().getSearchSuggestions(req, res, next));

/**
 * @route   GET /api/search/filter-options
 * @desc    獲取所有可用的篩選選項（國家、地區、學校類型、關係狀態）
 * @access  Private
 */
router.get('/filter-options', (req, res, next) => getSearchController().getFilterOptions(req, res, next));

export { router as searchRoutes };