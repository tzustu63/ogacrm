import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store'
import { fetchInteractions, deleteInteraction } from '../../store/slices/interactionsSlice'
import { Interaction, ContactMethod } from '../../types'
import { interactionsApi } from '../../services/api/interactions'

interface InteractionListProps {
  onCreateInteraction: () => void
  onEditInteraction: (interaction: Interaction) => void
  refreshTrigger?: number // 用於觸發重新載入
}

interface SchoolWithInteractions {
  id: string
  name: string
  country: string
  region: string
}

const InteractionList: React.FC<InteractionListProps> = ({
  onCreateInteraction,
  onEditInteraction,
  refreshTrigger
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const { interactions, isLoading, error } = useSelector(
    (state: RootState) => state.interactions
  )

  const [schoolsWithInteractions, setSchoolsWithInteractions] = useState<SchoolWithInteractions[]>([])
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null)
  const [filteredInteractions, setFilteredInteractions] = useState<Interaction[]>([])
  const [loadingSchools, setLoadingSchools] = useState(false)

  useEffect(() => {
    loadSchoolsWithInteractions()
  }, []) // 只在首次載入時獲取學校列表

  // 當 refreshTrigger 變化時，重新載入當前選中學校的互動記錄和學校列表
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadSchoolsWithInteractions()
      if (selectedSchoolId) {
        dispatch(fetchInteractions(selectedSchoolId))
      }
    }
  }, [refreshTrigger, dispatch, selectedSchoolId])

  useEffect(() => {
    if (selectedSchoolId) {
      dispatch(fetchInteractions(selectedSchoolId))
    }
  }, [dispatch, selectedSchoolId])

  useEffect(() => {
    if (selectedSchoolId && interactions.length >= 0) {
      const filtered = interactions.filter(i => i.schoolId === selectedSchoolId)
      // 按日期由近至遠排序
      const sorted = [...filtered].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      setFilteredInteractions(sorted)
    } else {
      setFilteredInteractions([])
    }
  }, [interactions, selectedSchoolId])

  const loadSchoolsWithInteractions = async () => {
    try {
      setLoadingSchools(true)
      const schools = await interactionsApi.getSchoolsWithInteractions()
      setSchoolsWithInteractions(schools)
      // 自動選擇第一個學校（只有在當前沒有選中學校時才自動選擇）
      if (schools && schools.length > 0 && !selectedSchoolId) {
        setSelectedSchoolId(schools[0].id)
      }
      // 如果當前選中的學校不在新列表中，自動選擇第一個（通常不會發生）
      else if (schools && schools.length > 0 && selectedSchoolId) {
        const currentSchoolExists = schools.some(s => s.id === selectedSchoolId)
        if (!currentSchoolExists) {
          setSelectedSchoolId(schools[0].id)
        }
      }
    } catch (error) {
      console.error('獲取學校列表失敗:', error)
    } finally {
      setLoadingSchools(false)
    }
  }

  const handleDeleteInteraction = async (interactionId: string) => {
    if (window.confirm('確定要刪除這個互動記錄嗎？')) {
      try {
        await dispatch(deleteInteraction(interactionId)).unwrap()
        // 重新載入該學校的互動記錄
        if (selectedSchoolId) {
          dispatch(fetchInteractions(selectedSchoolId))
        }
      } catch (error) {
        console.error('刪除互動記錄失敗:', error)
      }
    }
  }

  const getContactMethodLabel = (method: ContactMethod) => {
    const labels = {
      [ContactMethod.EMAIL]: 'Email',
      [ContactMethod.PHONE]: '電話',
      [ContactMethod.FACEBOOK]: 'FB',
      [ContactMethod.INSTAGRAM]: 'IG',
      [ContactMethod.WHATSAPP]: 'WhatsApp',
      [ContactMethod.MEETING]: '見面',
      [ContactMethod.VISIT]: '拜訪',
      [ContactMethod.VIDEO_CALL]: '視訊通話',
      [ContactMethod.OTHER]: '其他'
    }
    return labels[method] || method
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          互動記錄管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateInteraction}
        >
          新增互動記錄
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box display="flex" gap={3} sx={{ height: 'calc(100vh - 200px)' }}>
        {/* 左側：學校列表 */}
        <Card sx={{ width: 300, flexShrink: 0 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              學校/聯絡人
            </Typography>
            {loadingSchools ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress size={24} />
              </Box>
            ) : schoolsWithInteractions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                尚無互動記錄
              </Typography>
            ) : (
              <List>
                {schoolsWithInteractions.map((school, index) => (
                  <React.Fragment key={school.id}>
                    <ListItem disablePadding>
                      <ListItemButton
                        selected={selectedSchoolId === school.id}
                        onClick={() => setSelectedSchoolId(school.id)}
                      >
                        <ListItemText
                          primary={school.name}
                          secondary={`${school.country} - ${school.region}`}
                        />
                      </ListItemButton>
                    </ListItem>
                    {index < schoolsWithInteractions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* 右側：互動記錄列表 */}
        <Card sx={{ flex: 1, overflow: 'auto' }}>
          <CardContent>
            {selectedSchoolId ? (
              <>
                <Typography variant="h6" gutterBottom>
                  互動記錄
                </Typography>
                {isLoading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : filteredInteractions.length === 0 && !isLoading ? (
                  <Box textAlign="center" py={4}>
                    <Typography variant="body1" color="text.secondary">
                      此學校尚無互動記錄
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => dispatch(fetchInteractions(selectedSchoolId!))}
                      sx={{ mt: 2 }}
                    >
                      重新載入
                    </Button>
                  </Box>
                ) : (
                  <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 'calc(100vh - 300px)' }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ minWidth: 120 }}>主題</TableCell>
                          <TableCell sx={{ minWidth: 80 }}>方式</TableCell>
                          <TableCell sx={{ minWidth: 150 }}>日期</TableCell>
                          <TableCell sx={{ minWidth: 100 }}>慈大聯絡人</TableCell>
                          <TableCell sx={{ minWidth: 80 }}>是否追蹤</TableCell>
                          <TableCell sx={{ minWidth: 150 }}>追蹤日期</TableCell>
                          <TableCell sx={{ minWidth: 200 }}>回報</TableCell>
                          <TableCell align="center" sx={{ minWidth: 100 }}>操作</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredInteractions.map((interaction) => (
                          <TableRow 
                            key={interaction.id} 
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => onEditInteraction(interaction)}
                          >
                            <TableCell>
                              {interaction.subject || (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {getContactMethodLabel(interaction.contactMethod)}
                            </TableCell>
                            <TableCell>
                              {formatDate(interaction.date)}
                            </TableCell>
                            <TableCell>
                              {interaction.tzuContact || (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {interaction.followUpRequired ? '是' : '否'}
                            </TableCell>
                            <TableCell>
                              {interaction.followUpDate ? formatDate(interaction.followUpDate) : (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {interaction.followUpReport ? (
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    maxWidth: 200, 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap' 
                                  }}
                                  title={interaction.followUpReport}
                                >
                                  {interaction.followUpReport}
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                            <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                              <IconButton
                                size="small"
                                onClick={() => onEditInteraction(interaction)}
                                title="編輯"
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteInteraction(interaction.id)}
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
                )}
              </>
            ) : (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  請從左側選擇學校以查看互動記錄
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

export default InteractionList


