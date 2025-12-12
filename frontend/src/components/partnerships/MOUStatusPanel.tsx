import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,

  Button,
  Chip,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material'
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { zhTW } from 'date-fns/locale'
import { MOUStatus, Partnership } from '@/types'

interface MOUStatusPanelProps {
  partnership: Partnership | null
  onUpdate: (updates: Partial<Partnership>) => void
  isLoading?: boolean
}

const MOUStatusPanel: React.FC<MOUStatusPanelProps> = ({
  partnership,
  onUpdate,
  isLoading = false,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Partnership>>({})
  const [showExpiryWarning, setShowExpiryWarning] = useState(false)

  const handleEdit = () => {
    setEditData({
      mouStatus: partnership?.mouStatus || MOUStatus.NONE,
      mouSignedDate: partnership?.mouSignedDate,
      mouExpiryDate: partnership?.mouExpiryDate,
    })
    setIsEditing(true)
  }

  const handleSave = () => {
    onUpdate(editData)
    setIsEditing(false)
    setEditData({})
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditData({})
  }

  const handleStatusChange = (status: MOUStatus) => {
    setEditData(prev => ({ ...prev, mouStatus: status }))
    
    // If status is signed, require expiry date
    if (status === MOUStatus.SIGNED && !editData.mouExpiryDate) {
      setShowExpiryWarning(true)
    }
  }

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

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  }

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const now = new Date()
    return expiry < now
  }

  const getDaysUntilExpiry = (expiryDate: string) => {
    if (!expiryDate) return null
    const expiry = new Date(expiryDate)
    const now = new Date()
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhTW}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">MOU 狀態管理</Typography>
          {!isEditing && (
            <IconButton onClick={handleEdit} disabled={isLoading}>
              <EditIcon />
            </IconButton>
          )}
        </Box>

        {isEditing ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>MOU 狀態</InputLabel>
                <Select
                  value={editData.mouStatus || MOUStatus.NONE}
                  label="MOU 狀態"
                  onChange={(e) => handleStatusChange(e.target.value as MOUStatus)}
                >
                  {Object.values(MOUStatus).map((status) => (
                    <MenuItem key={status} value={status}>
                      {getMOUStatusLabel(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {editData.mouStatus === MOUStatus.SIGNED && (
              <>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="簽訂日期"
                    value={editData.mouSignedDate ? new Date(editData.mouSignedDate) : null}
                    onChange={(date) => 
                      setEditData(prev => ({ 
                        ...prev, 
                        mouSignedDate: date?.toISOString() 
                      }))
                    }
                    slotProps={{
                      textField: { fullWidth: true }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="到期日期 *"
                    value={editData.mouExpiryDate ? new Date(editData.mouExpiryDate) : null}
                    onChange={(date) => 
                      setEditData(prev => ({ 
                        ...prev, 
                        mouExpiryDate: date?.toISOString() 
                      }))
                    }
                    slotProps={{
                      textField: { 
                        fullWidth: true,
                        required: true,
                        error: !editData.mouExpiryDate,
                        helperText: !editData.mouExpiryDate ? '已簽訂的 MOU 必須設定到期日期' : ''
                      }
                    }}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={isLoading || (editData.mouStatus === MOUStatus.SIGNED && !editData.mouExpiryDate)}
                >
                  儲存
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  取消
                </Button>
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  MOU 狀態
                </Typography>
                <Chip
                  label={getMOUStatusLabel(partnership?.mouStatus || MOUStatus.NONE)}
                  color={getMOUStatusColor(partnership?.mouStatus || MOUStatus.NONE)}
                  size="medium"
                />
              </Box>
            </Grid>

            {partnership?.mouStatus === MOUStatus.SIGNED && (
              <>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      簽訂日期
                    </Typography>
                    <Typography variant="body1">
                      {partnership.mouSignedDate 
                        ? new Date(partnership.mouSignedDate).toLocaleDateString('zh-TW')
                        : '未設定'
                      }
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      到期日期
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1">
                        {partnership.mouExpiryDate 
                          ? new Date(partnership.mouExpiryDate).toLocaleDateString('zh-TW')
                          : '未設定'
                        }
                      </Typography>
                      {partnership.mouExpiryDate && isExpiringSoon(partnership.mouExpiryDate) && (
                        <Chip
                          icon={<WarningIcon />}
                          label={`${getDaysUntilExpiry(partnership.mouExpiryDate)} 天後到期`}
                          color="warning"
                          size="small"
                        />
                      )}
                      {partnership.mouExpiryDate && isExpired(partnership.mouExpiryDate) && (
                        <Chip
                          icon={<WarningIcon />}
                          label="已到期"
                          color="error"
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                </Grid>
              </>
            )}
          </Grid>
        )}

        {/* Expiry Warning Alert */}
        {partnership?.mouExpiryDate && isExpiringSoon(partnership.mouExpiryDate) && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              此 MOU 將在 {getDaysUntilExpiry(partnership.mouExpiryDate)} 天後到期，請及時處理續約事宜。
            </Typography>
          </Alert>
        )}

        {partnership?.mouExpiryDate && isExpired(partnership.mouExpiryDate) && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">
              此 MOU 已於 {new Date(partnership.mouExpiryDate).toLocaleDateString('zh-TW')} 到期，請更新狀態或重新簽訂。
            </Typography>
          </Alert>
        )}

        {/* Expiry Warning Dialog */}
        <Dialog open={showExpiryWarning} onClose={() => setShowExpiryWarning(false)}>
          <DialogTitle>設定到期日期</DialogTitle>
          <DialogContent>
            <Typography>
              已簽訂的 MOU 必須設定到期日期，請在上方選擇適當的到期日期。
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowExpiryWarning(false)}>了解</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </LocalizationProvider>
  )
}

export default MOUStatusPanel