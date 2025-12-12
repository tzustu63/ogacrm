import React, { useEffect, useState } from 'react'
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material'
import { dashboardApi, DashboardStats } from '../services/api/dashboard'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await dashboardApi.getStats()
      setStats(data)
    } catch (err: any) {
      console.error('載入儀表板數據失敗:', err)
      setError(err.response?.data?.error?.message || err.message || '載入儀表板數據失敗')
    } finally {
      setLoading(false)
    }
  }

  // 計算本週日期範圍（用於顯示）
  const getWeekRange = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - daysToMonday)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    return {
      start: format(weekStart, 'yyyy/MM/dd', { locale: zhTW }),
      end: format(weekEnd, 'yyyy/MM/dd', { locale: zhTW })
    }
  }

  const weekRange = getWeekRange()

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          儀表板
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        儀表板
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                總學校數
              </Typography>
              <Typography variant="h5" component="div">
                {stats?.totalSchools || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                已聯繫學校數
              </Typography>
              <Typography variant="h5" component="div">
                {stats?.contactedSchools || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                本週互動 ({weekRange.start} - {weekRange.end})
              </Typography>
              <Typography variant="h5" component="div">
                {stats?.weeklyInteractions.total || 0}
              </Typography>
              {stats?.weeklyInteractions.byContact && stats.weeklyInteractions.byContact.length > 0 && (
                <Box mt={1} display="flex" flexWrap="wrap" gap={0.5}>
                  {stats.weeklyInteractions.byContact.map((item, index) => (
                    <Chip
                      key={index}
                      label={`${item.tzuContact}: ${item.count}`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                待追蹤
              </Typography>
              <Typography variant="h5" component="div">
                {stats?.followUpSchools.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 待追蹤學校列表 */}
        {stats?.followUpSchools && stats.followUpSchools.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  待追蹤學校列表
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  本週需要再聯繫的學校 ({weekRange.start} - {weekRange.end})
                </Typography>
                <List>
                  {stats.followUpSchools.map((school, index) => (
                    <React.Fragment key={school.schoolId}>
                      <ListItem>
                        <ListItemText
                          primary={school.schoolName}
                          secondary={
                            <Box>
                              <Typography variant="body2" component="span">
                                追蹤日期: {format(new Date(school.followUpDate), 'yyyy/MM/dd', { locale: zhTW })}
                              </Typography>
                              {school.tzuContact && (
                                <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                                  慈大聯絡人: {school.tzuContact}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < stats.followUpSchools.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

export default Dashboard