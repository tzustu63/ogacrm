import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Pagination,
  CircularProgress,
  Alert,
  Checkbox
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store'
import { fetchSchools, deleteSchool } from '../../store/slices/schoolsSlice'
import { School, SchoolType, RelationshipStatus, SchoolOwnership } from '../../types'
import { exportApi } from '../../services/api/export'
import { importApi } from '../../services/api/import'
import ImportDialog from './ImportDialog'

const COUNTRIES = ['菲律賓', '印尼', '印度', '越南', '馬來西亞', '泰國', '香港', '澳門']

interface SchoolListProps {
  onCreateSchool: () => void
  onEditSchool: (school: School) => void
  onViewSchool: (school: School) => void
}

const SchoolList: React.FC<SchoolListProps> = ({
  onCreateSchool,
  onEditSchool,
  onViewSchool
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const { schools, isLoading, error, pagination } = useSelector(
    (state: RootState) => state.schools
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [schoolTypeFilter, setSchoolTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [ownershipFilter, setOwnershipFilter] = useState('')
  const [hasMOUFilter, setHasMOUFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(200)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set())

  useEffect(() => {
    dispatch(fetchSchools({
      page: currentPage,
      limit: pageSize,
      search: searchTerm || undefined,
      schoolType: schoolTypeFilter || undefined,
      relationshipStatus: statusFilter || undefined,
      country: countryFilter || undefined,
      region: regionFilter || undefined,
      ownership: ownershipFilter || undefined,
      hasMOU: hasMOUFilter === '' ? undefined : hasMOUFilter === 'true'
    }))
    // Clear selection when page or filters change
    setSelectedSchools(new Set())
  }, [dispatch, currentPage, pageSize, searchTerm, schoolTypeFilter, statusFilter, countryFilter, regionFilter, ownershipFilter, hasMOUFilter])

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
    setCurrentPage(1)
  }

  const handleSchoolTypeFilter = (event: any) => {
    setSchoolTypeFilter(event.target.value)
    setCurrentPage(1)
  }

  const handleStatusFilter = (event: any) => {
    setStatusFilter(event.target.value)
    setCurrentPage(1)
  }

  const handleCountryFilter = (event: any) => {
    setCountryFilter(event.target.value)
    setCurrentPage(1)
  }

  const handleRegionFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRegionFilter(event.target.value)
    setCurrentPage(1)
  }

  const handleOwnershipFilter = (event: any) => {
    setOwnershipFilter(event.target.value)
    setCurrentPage(1)
  }

  const handleHasMOUFilter = (event: any) => {
    setHasMOUFilter(event.target.value)
    setCurrentPage(1)
  }

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (event: any) => {
    const newPageSize = Number(event.target.value)
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page when changing page size
    setSelectedSchools(new Set()) // Clear selection when changing page size
  }

  const handleSelectSchool = (schoolId: string) => {
    const newSelected = new Set(selectedSchools)
    if (newSelected.has(schoolId)) {
      newSelected.delete(schoolId)
    } else {
      newSelected.add(schoolId)
    }
    setSelectedSchools(newSelected)
  }

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allIds = new Set(schools.map(school => school.id))
      setSelectedSchools(allIds)
    } else {
      setSelectedSchools(new Set())
    }
  }

  const handleBatchDelete = async () => {
    if (selectedSchools.size === 0) {
      alert('請至少選擇一筆要刪除的資料')
      return
    }

    const selectedCount = selectedSchools.size
    const confirmMessage = `確定要刪除選中的 ${selectedCount} 筆資料嗎？此操作無法復原。`
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      const deletePromises = Array.from(selectedSchools).map(id => 
        dispatch(deleteSchool(id)).unwrap()
      )
      await Promise.all(deletePromises)
      const deletedCount = selectedCount
      setSelectedSchools(new Set())
      // Refresh the list
      dispatch(fetchSchools({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        schoolType: schoolTypeFilter || undefined,
        relationshipStatus: statusFilter || undefined,
        country: countryFilter || undefined,
        region: regionFilter || undefined,
        ownership: ownershipFilter || undefined,
        hasMOU: hasMOUFilter === '' ? undefined : hasMOUFilter === 'true'
      }))
      alert(`成功刪除 ${deletedCount} 筆資料`)
    } catch (error) {
      console.error('批量刪除失敗:', error)
      alert('批量刪除失敗，請稍後再試')
    }
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const blob = await exportApi.exportSchools({
        format: 'excel',
        filters: {
          country: countryFilter || undefined,
          region: regionFilter || undefined,
          schoolType: schoolTypeFilter || undefined,
          relationshipStatus: statusFilter || undefined,
          ownership: ownershipFilter || undefined,
          hasMOU: hasMOUFilter === '' ? undefined : hasMOUFilter === 'true'
        }
      })

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const timestamp = new Date().toISOString().slice(0, 10)
      link.download = `學校資料匯出_${timestamp}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('匯出失敗:', error)
      alert('匯出失敗，請稍後再試')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportSuccess = () => {
    setImportDialogOpen(false)
    // Refresh school list
    dispatch(fetchSchools({
      page: currentPage,
      limit: pageSize,
      search: searchTerm || undefined,
      schoolType: schoolTypeFilter || undefined,
      relationshipStatus: statusFilter || undefined,
      country: countryFilter || undefined,
      region: regionFilter || undefined,
      ownership: ownershipFilter || undefined,
      hasMOU: hasMOUFilter === '' ? undefined : hasMOUFilter === 'true'
    }))
  }

  const handleDeleteSchool = async (schoolId: string) => {
    if (window.confirm('確定要刪除這所學校嗎？此操作將同時刪除相關的聯絡人和互動記錄。')) {
      try {
        await dispatch(deleteSchool(schoolId)).unwrap()
      } catch (error) {
        console.error('刪除學校失敗:', error)
      }
    }
  }

  const getSchoolTypeLabel = (type: SchoolType) => {
    const labels = {
      [SchoolType.HIGH_SCHOOL]: '高中',
      [SchoolType.TECHNICAL_COLLEGE]: '技術學院',
      [SchoolType.UNIVERSITY]: '大學',
      [SchoolType.VOCATIONAL]: '技職學校',
      [SchoolType.OTHER]: '其他'
    }
    return labels[type] || type
  }

  const getStatusLabel = (status: RelationshipStatus) => {
    const labels = {
      [RelationshipStatus.NO_RESPONSE]: '無回應',
      [RelationshipStatus.RESPONDED]: '有回應',
      [RelationshipStatus.HAS_ALUMNI]: '有校友'
    }
    return labels[status] || status
  }

  const getOwnershipLabel = (ownership?: SchoolOwnership) => {
    if (!ownership) return '-'
    return ownership === SchoolOwnership.PUBLIC ? '公' : '私'
  }

  const ensureUrl = (url: string): string => {
    if (!url) return ''
    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    // If it's just "link", it means we have the URL stored but display text is "link"
    // Try to add http:// prefix for incomplete URLs
    return 'http://' + url
  }

  const getLinkDisplayText = (url: string): string => {
    if (!url) return '連結'
    // Always show "link" as requested by user
    return 'link'
  }

  const getStatusColor = (status: RelationshipStatus) => {
    const colors = {
      [RelationshipStatus.NO_RESPONSE]: 'default' as const,
      [RelationshipStatus.RESPONDED]: 'info' as const,
      [RelationshipStatus.HAS_ALUMNI]: 'success' as const
    }
    return colors[status] || 'default'
  }

  if (isLoading && schools.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          學校管理
        </Typography>
        <Box display="flex" gap={2}>
          {selectedSchools.size > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleBatchDelete}
            >
              刪除選中 ({selectedSchools.size})
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? '匯出中...' : '匯出 Excel'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            匯入 Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateSchool}
          >
            新增學校
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              placeholder="搜尋學校名稱..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250 }}
            />
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>屬性</InputLabel>
              <Select
                value={schoolTypeFilter}
                onChange={handleSchoolTypeFilter}
                label="屬性"
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value={SchoolType.HIGH_SCHOOL}>高中</MenuItem>
                <MenuItem value={SchoolType.TECHNICAL_COLLEGE}>技術學院</MenuItem>
                <MenuItem value={SchoolType.UNIVERSITY}>大學</MenuItem>
                <MenuItem value={SchoolType.VOCATIONAL}>技職學校</MenuItem>
                <MenuItem value={SchoolType.OTHER}>其他</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>關係狀態</InputLabel>
              <Select
                value={statusFilter}
                onChange={handleStatusFilter}
                label="關係狀態"
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value={RelationshipStatus.NO_RESPONSE}>無回應</MenuItem>
                <MenuItem value={RelationshipStatus.RESPONDED}>有回應</MenuItem>
                <MenuItem value={RelationshipStatus.HAS_ALUMNI}>有校友</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>國家</InputLabel>
              <Select
                value={countryFilter}
                onChange={handleCountryFilter}
                label="國家"
              >
                <MenuItem value="">全部</MenuItem>
                {COUNTRIES.map((country) => (
                  <MenuItem key={country} value={country}>
                    {country}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              placeholder="篩選區域..."
              value={regionFilter}
              onChange={handleRegionFilter}
              sx={{ minWidth: 150 }}
              label="區域"
            />

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>公私立</InputLabel>
              <Select
                value={ownershipFilter}
                onChange={handleOwnershipFilter}
                label="公私立"
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value={SchoolOwnership.PUBLIC}>公</MenuItem>
                <MenuItem value={SchoolOwnership.PRIVATE}>私</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>是否有MOU</InputLabel>
              <Select
                value={hasMOUFilter}
                onChange={handleHasMOUFilter}
                label="是否有MOU"
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="true">有</MenuItem>
                <MenuItem value="false">無</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>每頁筆數</InputLabel>
              <Select
                value={pageSize}
                onChange={handlePageSizeChange}
                label="每頁筆數"
              >
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
                <MenuItem value={200}>200</MenuItem>
                <MenuItem value={500}>500</MenuItem>
                <MenuItem value={1000}>1000</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)', overflowX: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedSchools.size > 0 && selectedSchools.size < schools.length}
                  checked={schools.length > 0 && selectedSchools.size === schools.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>校名</TableCell>
              <TableCell>關係狀態</TableCell>
              <TableCell>屬性</TableCell>
              <TableCell>國家</TableCell>
              <TableCell>區域</TableCell>
              <TableCell>Website</TableCell>
              <TableCell>FB</TableCell>
              <TableCell>IG</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>公私立</TableCell>
              <TableCell>是否有MOU</TableCell>
              <TableCell>備註</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(schools) && schools.map((school) => (
              <TableRow key={school.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedSchools.has(school.id)}
                    onChange={() => handleSelectSchool(school.id)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="medium">
                    {school.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(school.relationshipStatus)}
                    color={getStatusColor(school.relationshipStatus)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{getSchoolTypeLabel(school.schoolType)}</TableCell>
                <TableCell>{school.country}</TableCell>
                <TableCell>{school.region}</TableCell>
                <TableCell>
                  {school.website ? (
                    <a
                      href={ensureUrl(school.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1976d2', textDecoration: 'none' }}
                    >
                      {getLinkDisplayText(school.website)}
                    </a>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {school.facebook ? (
                    <a
                      href={ensureUrl(school.facebook || '')}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1976d2', textDecoration: 'none' }}
                    >
                      {getLinkDisplayText(school.facebook || '')}
                    </a>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {school.instagram ? (
                    <a
                      href={ensureUrl(school.instagram || '')}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1976d2', textDecoration: 'none' }}
                    >
                      {getLinkDisplayText(school.instagram || '')}
                    </a>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {school.email ? (
                    <a
                      href={`mailto:${school.email.replace(/^mailto:/i, '')}?bcc=tzustu@harvestwize.com`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1976d2', textDecoration: 'none', cursor: 'pointer' }}
                    >
                      link
                    </a>
                  ) : '-'}
                </TableCell>
                <TableCell>{getOwnershipLabel(school.ownership)}</TableCell>
                <TableCell>
                  {school.hasMOU !== undefined ? (school.hasMOU ? '有' : '無') : '-'}
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      maxWidth: 200, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap' 
                    }}
                    title={school.notes || ''}
                  >
                    {school.notes || '-'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => onViewSchool(school)}
                    title="查看詳情"
                  >
                    <ViewIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onEditSchool(school)}
                    title="編輯"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteSchool(school.id)}
                    title="刪除"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {schools.length === 0 && !isLoading && (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            沒有找到符合條件的學校
          </Typography>
        </Box>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
        <Typography variant="body2" color="text.secondary">
          共 {pagination.total} 筆資料，每頁顯示 {pageSize} 筆
        </Typography>
        {pagination.totalPages > 1 && (
          <Pagination
            count={pagination.totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
          />
        )}
      </Box>

      <ImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </Box>
  )
}

export default SchoolList