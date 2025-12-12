import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Avatar,
  Tooltip
} from '@mui/material'
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/lab'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  VideoCall as VideoCallIcon,
  Business as BusinessIcon,
  MoreHoriz as MoreIcon,
  Schedule as ScheduleIcon,

} from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store'
import { fetchInteractions } from '../../store/slices/interactionsSlice'
import { Interaction, ContactMethod } from '../../types'

interface InteractionTimelineProps {
  schoolId?: string
  onCreateInteraction: () => void
  onEditInteraction: (interaction: Interaction) => void
}

const InteractionTimeline: React.FC<InteractionTimelineProps> = ({
  schoolId,
  onCreateInteraction,
  onEditInteraction
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const { interactions, isLoading, error } = useSelector(
    (state: RootState) => state.interactions
  )

  const [sortedInteractions, setSortedInteractions] = useState<Interaction[]>([])

  useEffect(() => {
    dispatch(fetchInteractions(schoolId))
  }, [dispatch, schoolId])

  useEffect(() => {
    // Sort interactions by date (newest first)
    const sorted = [...interactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    setSortedInteractions(sorted)
  }, [interactions])

  const getContactMethodIcon = (method: ContactMethod) => {
    const iconProps = { fontSize: 'small' as const }
    switch (method) {
      case ContactMethod.EMAIL:
        return <EmailIcon {...iconProps} />
      case ContactMethod.PHONE:
        return <PhoneIcon {...iconProps} />
      case ContactMethod.VIDEO_CALL:
        return <VideoCallIcon {...iconProps} />
      case ContactMethod.VISIT:
        return <BusinessIcon {...iconProps} />
      default:
        return <MoreIcon {...iconProps} />
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
      [ContactMethod.VIDEO_CALL]: '視訊通話',
      [ContactMethod.VISIT]: '拜訪',
      [ContactMethod.OTHER]: '其他'
    }
    return labels[method] || method
  }

  const getContactMethodColor = (method: ContactMethod) => {
    const colors = {
      [ContactMethod.EMAIL]: 'primary' as const,
      [ContactMethod.PHONE]: 'success' as const,
      [ContactMethod.FACEBOOK]: 'primary' as const,
      [ContactMethod.INSTAGRAM]: 'secondary' as const,
      [ContactMethod.WHATSAPP]: 'success' as const,
      [ContactMethod.MEETING]: 'warning' as const,
      [ContactMethod.VIDEO_CALL]: 'info' as const,
      [ContactMethod.VISIT]: 'warning' as const,
      [ContactMethod.OTHER]: 'grey' as const
    }
    return colors[method] || 'grey'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays} 天前`
    } else {
      return date.toLocaleDateString('zh-TW')
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading && interactions.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          互動歷史
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

      {sortedInteractions.length === 0 && !isLoading ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                尚無互動記錄
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={onCreateInteraction}
              >
                新增第一筆互動記錄
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Timeline>
          {sortedInteractions.map((interaction, index) => (
            <TimelineItem key={interaction.id}>
              <TimelineSeparator>
                <TimelineDot color={getContactMethodColor(interaction.contactMethod)}>
                  {getContactMethodIcon(interaction.contactMethod)}
                </TimelineDot>
                {index < sortedInteractions.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              
              <TimelineContent>
                <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {getContactMethodLabel(interaction.contactMethod)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(interaction.date)} {formatTime(interaction.date)}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={1}>
                      {interaction.followUpRequired && (
                        <Tooltip title={`需要後續追蹤${interaction.followUpDate ? ` - ${formatDate(interaction.followUpDate)}` : ''}`}>
                          <Chip
                            icon={<ScheduleIcon />}
                            label="需追蹤"
                            color="warning"
                            size="small"
                          />
                        </Tooltip>
                      )}
                      
                      <IconButton
                        size="small"
                        onClick={() => onEditInteraction(interaction)}
                        title="編輯"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {interaction.notes}
                  </Typography>

                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                      {interaction.createdBy.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="caption" color="text.secondary">
                      記錄者: {interaction.createdBy}
                    </Typography>
                  </Box>
                </Paper>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      )}
    </Box>
  )
}

export default InteractionTimeline