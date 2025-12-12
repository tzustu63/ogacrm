import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  IconButton,
  Menu,
  MenuItem,

  Alert,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material'
import {
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,

} from '@mui/icons-material'
import { useSelector } from 'react-redux'
import { School, SchoolType, RelationshipStatus } from '@/types'
import { useNavigate } from 'react-router-dom'

type SortField = 'name' | 'country' | 'schoolType' | 'relationshipStatus' | 'createdAt'
type SortDirection = 'asc' | 'desc'

interface SearchResultsProps {
  onSchoolSelect?: (school: School) => void
}

const SearchResults: React.FC<SearchResultsProps> = ({ onSchoolSelect }) => {
  const navigate = useNavigate()
  const results = useSelector((state: any) => state.search?.results || [])
  const isLoading = useSelector((state: any) => state.search?.isLoading || false)
  const error = useSelector((state: any) => state.search?.error || null)
  const query = useSelector((state: any) => state.search?.query || '')
  
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedResults = React.useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === 'createdAt') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [results, sortField, sortDirection])

  const paginatedResults = React.useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage
    return sortedResults.slice(startIndex, startIndex + rowsPerPage)
  }, [sortedResults, page, rowsPerPage])

  const totalPages = Math.ceil(sortedResults.length / rowsPerPage)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, school: School) => {
    setAnchorEl(event.currentTarget)
    setSelectedSchool(school)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedSchool(null)
  }

  const handleViewSchool = () => {
    if (selectedSchool) {
      navigate(`/schools/${selectedSchool.id}`)
      onSchoolSelect?.(selectedSchool)
    }
    handleMenuClose()
  }

  const handleEditSchool = () => {
    if (selectedSchool) {
      navigate(`/schools/${selectedSchool.id}/edit`)
    }
    handleMenuClose()
  }

  const getSchoolTypeLabel = (type: SchoolType) => {
    const labels: Record<SchoolType, string> = {
      [SchoolType.HIGH_SCHOOL]: '高中',
      [SchoolType.TECHNICAL_COLLEGE]: '技術學院',
      [SchoolType.UNIVERSITY]: '大學',
      [SchoolType.VOCATIONAL]: '技職學校',
      [SchoolType.OTHER]: '其他',
    }
    return labels[type] || type
  }

  const getRelationshipStatusLabel = (status: RelationshipStatus) => {
    const labels: Record<RelationshipStatus, string> = {
      [RelationshipStatus.NO_RESPONSE]: '無回應',
      [RelationshipStatus.RESPONDED]: '有回應',
      [RelationshipStatus.HAS_ALUMNI]: '有校友',
    }
    return labels[status] || status
  }

  const getRelationshipStatusColor = (status: RelationshipStatus) => {
    const colors: Record<RelationshipStatus, 'default' | 'info' | 'success'> = {
      [RelationshipStatus.NO_RESPONSE]: 'default',
      [RelationshipStatus.RESPONDED]: 'info',
      [RelationshipStatus.HAS_ALUMNI]: 'success',
    }
    return colors[status] || 'default'
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        搜尋時發生錯誤: {error}
      </Alert>
    )
  }

  if (results.length === 0 && query) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        沒有找到符合條件的學校記錄。請嘗試調整搜尋條件或篩選器。
      </Alert>
    )
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Results Header */}
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          搜尋結果 ({sortedResults.length} 筆)
          {query && (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              關鍵字: "{query}"
            </Typography>
          )}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>每頁顯示</InputLabel>
            <Select
              value={rowsPerPage}
              label="每頁顯示"
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value))
                setPage(1)
              }}
            >
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Results Table */}
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'name'}
                  direction={sortField === 'name' ? sortDirection : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  學校名稱
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'country'}
                  direction={sortField === 'country' ? sortDirection : 'asc'}
                  onClick={() => handleSort('country')}
                >
                  國家/地區
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'schoolType'}
                  direction={sortField === 'schoolType' ? sortDirection : 'asc'}
                  onClick={() => handleSort('schoolType')}
                >
                  學校類型
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'relationshipStatus'}
                  direction={sortField === 'relationshipStatus' ? sortDirection : 'asc'}
                  onClick={() => handleSort('relationshipStatus')}
                >
                  關係狀態
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'createdAt'}
                  direction={sortField === 'createdAt' ? sortDirection : 'asc'}
                  onClick={() => handleSort('createdAt')}
                >
                  建立日期
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedResults.map((school) => (
              <TableRow
                key={school.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onSchoolSelect?.(school)}
              >
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {school.name}
                    </Typography>
                    {school.website && (
                      <Typography variant="caption" color="text.secondary">
                        {school.website}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {school.country}
                    {school.region && `, ${school.region}`}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getSchoolTypeLabel(school.schoolType)}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={getRelationshipStatusLabel(school.relationshipStatus)}
                    size="small"
                    color={getRelationshipStatusColor(school.relationshipStatus)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(school.createdAt).toLocaleDateString('zh-TW')}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMenuOpen(e, school)
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewSchool}>
          <ViewIcon sx={{ mr: 1 }} />
          查看詳情
        </MenuItem>
        <MenuItem onClick={handleEditSchool}>
          <EditIcon sx={{ mr: 1 }} />
          編輯學校
        </MenuItem>
      </Menu>
    </Paper>
  )
}

export default SearchResults