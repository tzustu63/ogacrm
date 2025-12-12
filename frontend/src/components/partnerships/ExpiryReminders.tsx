import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,

  Alert,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Badge,
} from '@mui/material'
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Notifications as NotificationsIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { Partnership, School } from '@/types'

interface ExpiryReminderItem {
  partnership: Partnership
  school: School
  daysUntilExpiry: number
  isExpired: boolean
}

interface ExpiryRemindersProps {
  partnerships: Partnership[]
  schools: School[]
  onRefresh?: () => void
  onViewSchool?: (schoolId: string) => void
  onUpdateMOU?: (partnershipId: string) => void
}

const ExpiryReminders: React.FC<ExpiryRemindersProps> = ({
  partnerships,
  schools,
  onRefresh,
  onViewSchool,
  onUpdateMOU,
}) => {
  const [reminderItems, setReminderItems] = useState<ExpiryReminderItem[]>([])
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedItem, setSelectedItem] = useState<ExpiryReminderItem | null>(null)

  useEffect(() => {
    const items: ExpiryReminderItem[] = []
    const now = new Date()

    partnerships.forEach(partnership => {
      if (partnership.mouStatus === 'signed' && partnership.mouExpiryDate) {
        const school = schools.find(s => s.id === partnership.schoolId)
        if (school) {
          const expiryDate = new Date(partnership.mouExpiryDate)
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          const isExpired = expiryDate < now
          
          // Show items that are expired or expiring within 60 days
          if (isExpired || daysUntilExpiry <= 60) {
            items.push({
              partnership,
              school,
              daysUntilExpiry,
              isExpired,
            })
          }
        }
      }
    })

    // Sort by urgency: expired first, then by days until expiry
    items.sort((a, b) => {
      if (a.isExpired && !b.isExpired) return -1
      if (!a.isExpired && b.isExpired) return 1
      if (a.isExpired && b.isExpired) return a.daysUntilExpiry - b.daysUntilExpiry
      return a.daysUntilExpiry - b.daysUntilExpiry
    })

    setReminderItems(items)
  }, [partnerships, schools])

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: ExpiryReminderItem) => {
    setAnchorEl(event.currentTarget)
    setSelectedItem(item)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedItem(null)
  }

  const handleViewSchool = () => {
    if (selectedItem) {
      onViewSchool?.(selectedItem.school.id)
    }
    handleMenuClose()
  }

  const handleUpdateMOU = () => {
    if (selectedItem) {
      onUpdateMOU?.(selectedItem.partnership.id)
    }
    handleMenuClose()
  }

  const getUrgencyLevel = (item: ExpiryReminderItem) => {
    if (item.isExpired) return 'expired'
    if (item.daysUntilExpiry <= 7) return 'critical'
    if (item.daysUntilExpiry <= 30) return 'warning'
    return 'notice'
  }

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'expired': return 'error'
      case 'critical': return 'error'
      case 'warning': return 'warning'
      case 'notice': return 'info'
      default: return 'default'
    }
  }

  const getUrgencyIcon = (level: string) => {
    switch (level) {
      case 'expired': return <ErrorIcon />
      case 'critical': return <ErrorIcon />
      case 'warning': return <WarningIcon />
      case 'notice': return <WarningIcon />
      default: return <NotificationsIcon />
    }
  }

  const getUrgencyMessage = (item: ExpiryReminderItem) => {
    if (item.isExpired) {
      return `已到期 ${Math.abs(item.daysUntilExpiry)} 天`
    }
    if (item.daysUntilExpiry <= 0) {
      return '今天到期'
    }
    return `${item.daysUntilExpiry} 天後到期`
  }

  const expiredCount = reminderItems.filter(item => item.isExpired).length
  const criticalCount = reminderItems.filter(item => !item.isExpired && item.daysUntilExpiry <= 7).length
  const warningCount = reminderItems.filter(item => !item.isExpired && item.daysUntilExpiry > 7 && item.daysUntilExpiry <= 30).length

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={reminderItems.length} color="error">
            <NotificationsIcon />
          </Badge>
          <Typography variant="h6">MOU 到期提醒</Typography>
        </Box>
        <IconButton onClick={onRefresh} size="small">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Summary */}
      {reminderItems.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {expiredCount > 0 && (
              <Chip
                icon={<ErrorIcon />}
                label={`${expiredCount} 個已到期`}
                color="error"
                size="small"
              />
            )}
            {criticalCount > 0 && (
              <Chip
                icon={<ErrorIcon />}
                label={`${criticalCount} 個即將到期`}
                color="error"
                size="small"
              />
            )}
            {warningCount > 0 && (
              <Chip
                icon={<WarningIcon />}
                label={`${warningCount} 個需要關注`}
                color="warning"
                size="small"
              />
            )}
          </Box>
        </Box>
      )}

      {reminderItems.length === 0 ? (
        <Alert severity="success">
          <Typography variant="body2">
            目前沒有需要關注的 MOU 到期提醒。所有已簽訂的 MOU 都在有效期內。
          </Typography>
        </Alert>
      ) : (
        <List>
          {reminderItems.map((item, index) => {
            const urgencyLevel = getUrgencyLevel(item)
            return (
              <React.Fragment key={item.partnership.id}>
                <ListItem
                  sx={{
                    bgcolor: urgencyLevel === 'expired' ? 'error.light' : 
                            urgencyLevel === 'critical' ? 'error.light' :
                            urgencyLevel === 'warning' ? 'warning.light' : 'transparent',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemIcon>
                    {getUrgencyIcon(urgencyLevel)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight="medium">
                          {item.school.name}
                        </Typography>
                        <Chip
                          label={getUrgencyMessage(item)}
                          color={getUrgencyColor(urgencyLevel) as any}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          到期日期: {new Date(item.partnership.mouExpiryDate!).toLocaleDateString('zh-TW')}
                        </Typography>
                        {item.partnership.mouSignedDate && (
                          <Typography variant="body2" color="text.secondary">
                            簽訂日期: {new Date(item.partnership.mouSignedDate).toLocaleDateString('zh-TW')}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <IconButton
                    edge="end"
                    onClick={(e) => handleMenuOpen(e, item)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </ListItem>
                {index < reminderItems.length - 1 && <Divider />}
              </React.Fragment>
            )
          })}
        </List>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewSchool}>
          查看學校詳情
        </MenuItem>
        <MenuItem onClick={handleUpdateMOU}>
          更新 MOU 狀態
        </MenuItem>
      </Menu>
    </Paper>
  )
}

export default ExpiryReminders