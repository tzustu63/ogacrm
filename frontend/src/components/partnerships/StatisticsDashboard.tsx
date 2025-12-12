import React, { useMemo } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  Event as EventIcon,
  Assignment as AssignmentIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'
import { Partnership, School, MOUStatus } from '@/types'

interface StatisticsData {
  totalPartnerships: number
  signedMOUs: number
  totalReferrals: number
  totalEvents: number
  mouStatusBreakdown: Record<MOUStatus, number>
  topPerformingSchools: Array<{
    school: School
    partnership: Partnership
    totalScore: number
  }>
}

interface StatisticsDashboardProps {
  partnerships: Partnership[]
  schools: School[]
  onViewSchool?: (schoolId: string) => void
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({
  partnerships,
  schools,
  onViewSchool,
}) => {
  const statistics = useMemo((): StatisticsData => {
    const mouStatusBreakdown = {
      [MOUStatus.NONE]: 0,
      [MOUStatus.NEGOTIATING]: 0,
      [MOUStatus.SIGNED]: 0,
      [MOUStatus.EXPIRED]: 0,
    }

    let totalReferrals = 0
    let totalEvents = 0
    let signedMOUs = 0

    const schoolPerformance = new Map<string, { partnership: Partnership; school: School; score: number }>()

    partnerships.forEach(partnership => {
      mouStatusBreakdown[partnership.mouStatus]++
      totalReferrals += partnership.referralCount
      totalEvents += partnership.eventsHeld

      if (partnership.mouStatus === MOUStatus.SIGNED) {
        signedMOUs++
      }

      const school = schools.find(s => s.id === partnership.schoolId)
      if (school) {
        // Calculate performance score based on referrals and events
        const score = partnership.referralCount * 2 + partnership.eventsHeld * 1
        schoolPerformance.set(partnership.schoolId, {
          partnership,
          school,
          score,
        })
      }
    })

    const topPerformingSchools = Array.from(schoolPerformance.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => ({
        school: item.school,
        partnership: item.partnership,
        totalScore: item.score,
      }))

    return {
      totalPartnerships: partnerships.length,
      signedMOUs,
      totalReferrals,
      totalEvents,
      mouStatusBreakdown,
      topPerformingSchools,
    }
  }, [partnerships, schools])

  const getMOUStatusLabel = (status: MOUStatus) => {
    const labels = {
      none: '無',
      negotiating: '洽談中',
      signed: '已簽訂',
      expired: '已到期',
    }
    return labels[status] || status
  }

  const getMOUStatusColor = (status: MOUStatus) => {
    const colors = {
      none: 'default' as const,
      negotiating: 'warning' as const,
      signed: 'success' as const,
      expired: 'error' as const,
    }
    return colors[status] || 'default'
  }

  const getSignedMOUPercentage = () => {
    return statistics.totalPartnerships > 0 
      ? (statistics.signedMOUs / statistics.totalPartnerships) * 100 
      : 0
  }

  return (
    <Box>
      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SchoolIcon color="primary" />
                <Box>
                  <Typography variant="h4" component="div">
                    {statistics.totalPartnerships}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    總合作學校數
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentIcon color="success" />
                <Box>
                  <Typography variant="h4" component="div">
                    {statistics.signedMOUs}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    已簽訂 MOU
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={getSignedMOUPercentage()}
                    sx={{ mt: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {getSignedMOUPercentage().toFixed(1)}% 簽約率
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon color="info" />
                <Box>
                  <Typography variant="h4" component="div">
                    {statistics.totalReferrals}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    總推薦學生數
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon color="warning" />
                <Box>
                  <Typography variant="h4" component="div">
                    {statistics.totalEvents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    總說明會次數
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* MOU Status Breakdown */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              MOU 狀態分布
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(statistics.mouStatusBreakdown).map(([status, count]) => {
                const percentage = statistics.totalPartnerships > 0 
                  ? (count / statistics.totalPartnerships) * 100 
                  : 0
                
                return (
                  <Box key={status}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={getMOUStatusLabel(status as MOUStatus)}
                          color={getMOUStatusColor(status as MOUStatus)}
                          size="small"
                        />
                        <Typography variant="body2">
                          {count} 個學校
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {percentage.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={percentage}
                      color={getMOUStatusColor(status as MOUStatus) === 'default' ? 'primary' : getMOUStatusColor(status as MOUStatus) as any}
                    />
                  </Box>
                )
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Top Performing Schools */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              表現優異學校 (前10名)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>排名</TableCell>
                    <TableCell>學校名稱</TableCell>
                    <TableCell align="center">推薦數</TableCell>
                    <TableCell align="center">說明會</TableCell>
                    <TableCell align="center">總分</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statistics.topPerformingSchools.map((item, index) => (
                    <TableRow key={item.school.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          #{index + 1}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {item.school.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.school.country}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {item.partnership.referralCount}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {item.partnership.eventsHeld}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={item.totalScore}
                          color={index < 3 ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => onViewSchool?.(item.school.id)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {statistics.topPerformingSchools.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          暫無資料
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default StatisticsDashboard