import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,

  Grid,
  Card,
  CardContent,
  IconButton,
  CircularProgress,
  Alert,
  Link
} from '@mui/material'
import {
  Edit as EditIcon,
  Language as WebsiteIcon,
  School as SchoolIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store'
import { fetchSchoolById } from '../../store/slices/schoolsSlice'
import { schoolsApi } from '../../services/api'
import { School, SchoolType, RelationshipStatus, SchoolOwnership } from '../../types'

interface SchoolDetailProps {
  open: boolean
  onClose: () => void
  onEdit: () => void
  school: School | null
}

interface SchoolStats {
  totalContacts: number
  totalInteractions: number
  lastInteractionDate?: string
  partnershipStatus: string
}

const SchoolDetail: React.FC<SchoolDetailProps> = ({
  open,
  onClose,
  onEdit,
  school
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const { currentSchool, isLoading, error } = useSelector(
    (state: RootState) => state.schools
  )

  const [stats, setStats] = useState<SchoolStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    if (school && open && school.id) {
      dispatch(fetchSchoolById(school.id))
      loadSchoolStats(school.id)
    }
  }, [dispatch, school, open])

  const loadSchoolStats = async (schoolId: string) => {
    if (!schoolId) {
      return
    }
    try {
      setStatsLoading(true)
      // Stats endpoint not available, skip for now
      // const statsData = await schoolsApi.getSchoolStats(schoolId)
      // setStats(statsData)
      setStats(null)
    } catch (error) {
      console.error('載入學校統計資料失敗:', error)
      setStats(null)
    } finally {
      setStatsLoading(false)
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

  const getStatusColor = (status: RelationshipStatus) => {
    const colors = {
      [RelationshipStatus.NO_RESPONSE]: 'default' as const,
      [RelationshipStatus.RESPONDED]: 'info' as const,
      [RelationshipStatus.HAS_ALUMNI]: 'success' as const
    }
    return colors[status] || 'default'
  }

  const ensureUrl = (url: string): string => {
    if (!url) return ''
    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    // Try to add http:// prefix for incomplete URLs
    return 'http://' + url
  }

  const getLinkDisplayText = (url: string): string => {
    if (!url) return 'link'
    // Always show "link" as requested by user
    return 'link'
  }

  const displaySchool = currentSchool || school

  if (!displaySchool) {
    return null
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" component="div">
            學校詳細資訊
          </Typography>
          <IconButton onClick={onEdit} color="primary">
            <EditIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <Box>
            {/* 基本資訊 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <SchoolIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">基本資訊</Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h4" gutterBottom>
                      {displaySchool.name}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        關係狀態
                      </Typography>
                    </Box>
                    <Chip
                      label={getStatusLabel(displaySchool.relationshipStatus)}
                      color={getStatusColor(displaySchool.relationshipStatus)}
                      size="small"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <SchoolIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        屬性
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {getSchoolTypeLabel(displaySchool.schoolType)}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <LocationIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        國家
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {displaySchool.country || '-'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <LocationIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        區域
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {displaySchool.region || '-'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <WebsiteIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Website
                      </Typography>
                    </Box>
                    {displaySchool.website ? (
                      <Link
                        href={ensureUrl(displaySchool.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: 'flex', alignItems: 'center' }}
                      >
                        {getLinkDisplayText(displaySchool.website)}
                      </Link>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        FB
                      </Typography>
                    </Box>
                    {displaySchool.facebook ? (
                      <Link
                        href={ensureUrl(displaySchool.facebook)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: 'flex', alignItems: 'center' }}
                      >
                        {getLinkDisplayText(displaySchool.facebook)}
                      </Link>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        IG
                      </Typography>
                    </Box>
                    {displaySchool.instagram ? (
                      <Link
                        href={ensureUrl(displaySchool.instagram)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: 'flex', alignItems: 'center' }}
                      >
                        {getLinkDisplayText(displaySchool.instagram)}
                      </Link>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Email
                      </Typography>
                    </Box>
                    {displaySchool.email ? (
                      <Link
                        href={`mailto:${displaySchool.email?.replace(/^mailto:/i, '')}?bcc=tzustu@harvestwize.com`}
                        sx={{ display: 'flex', alignItems: 'center' }}
                      >
                        link
                      </Link>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        公私立
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {displaySchool.ownership ? (displaySchool.ownership === SchoolOwnership.PUBLIC ? '公' : '私') : '-'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        是否有MOU
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {displaySchool.hasMOU !== undefined ? (displaySchool.hasMOU ? '有' : '無') : '-'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        備註
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {displaySchool.notes || '-'}
                    </Typography>
                  </Grid>
                  
                </Grid>
              </CardContent>
            </Card>

            {/* 統計資訊 */}
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TrendingIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">統計資訊</Typography>
                </Box>
                
                {statsLoading ? (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : stats ? (
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="primary.main">
                          {stats.totalContacts}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          聯絡人數量
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="primary.main">
                          {stats.totalInteractions}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          互動記錄
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Box textAlign="center">
                        <Typography variant="body1">
                          {stats.lastInteractionDate
                            ? `最後互動: ${new Date(stats.lastInteractionDate).toLocaleDateString('zh-TW')}`
                            : '尚無互動記錄'
                          }
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          合作狀態: {stats.partnershipStatus}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    無法載入統計資訊
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          關閉
        </Button>
        <Button variant="contained" onClick={onEdit}>
          編輯學校
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SchoolDetail