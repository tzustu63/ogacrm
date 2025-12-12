import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Alert,
  Divider,
} from '@mui/material'
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
} from '@mui/icons-material'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { zhTW } from 'date-fns/locale'
import { ContactMethod, Preference } from '@/types'
import { TimezoneSelector, ProgramSelector } from './'

interface PreferenceFormProps {
  preference: Preference | null
  onSave: (preferenceData: Partial<Preference>) => void
  onCancel?: () => void
  isLoading?: boolean
  isEditing?: boolean
  onEdit?: () => void
}



const PreferenceForm: React.FC<PreferenceFormProps> = ({
  preference,
  onSave,
  onCancel,
  isLoading = false,
  isEditing = false,
  onEdit,
}) => {
  const [formData, setFormData] = useState<Partial<Preference>>({
    preferredContactMethod: ContactMethod.EMAIL,
    programsOfInterest: [],
    bestContactTime: '09:00',
    timezone: 'Asia/Taipei',
    specialRequirements: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (preference) {
      setFormData({
        preferredContactMethod: preference.preferredContactMethod,
        programsOfInterest: preference.programsOfInterest,
        bestContactTime: preference.bestContactTime,
        timezone: preference.timezone,
        specialRequirements: preference.specialRequirements || '',
      })
    }
  }, [preference])

  const handleInputChange = (field: keyof Preference, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.preferredContactMethod) {
      newErrors.preferredContactMethod = '請選擇偏好聯繫方式'
    }

    if (!formData.programsOfInterest || formData.programsOfInterest.length === 0) {
      newErrors.programsOfInterest = '請至少選擇一個感興趣的科系'
    }

    if (!formData.bestContactTime) {
      newErrors.bestContactTime = '請設定最佳聯繫時間'
    }

    if (!formData.timezone) {
      newErrors.timezone = '請選擇時區'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData)
    }
  }

  const handleCancel = () => {
    if (preference) {
      setFormData({
        preferredContactMethod: preference.preferredContactMethod,
        programsOfInterest: preference.programsOfInterest,
        bestContactTime: preference.bestContactTime,
        timezone: preference.timezone,
        specialRequirements: preference.specialRequirements || '',
      })
    }
    setErrors({})
    onCancel?.()
  }

  const getContactMethodLabel = (method: ContactMethod) => {
    const labels: Record<ContactMethod, string> = {
      [ContactMethod.EMAIL]: '電子郵件',
      [ContactMethod.PHONE]: '電話',
      [ContactMethod.FACEBOOK]: 'FB',
      [ContactMethod.INSTAGRAM]: 'IG',
      [ContactMethod.WHATSAPP]: 'WhatsApp',
      [ContactMethod.MEETING]: '見面',
      [ContactMethod.VISIT]: '實地拜訪',
      [ContactMethod.VIDEO_CALL]: '視訊通話',
      [ContactMethod.OTHER]: '其他',
    }
    return labels[method] || method
  }

  const formatTimeForDisplay = (time: string) => {
    try {
      const [hours, minutes] = time.split(':')
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
    } catch {
      return time
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhTW}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">偏好設定</Typography>
          {!isEditing && onEdit && (
            <Button
              startIcon={<EditIcon />}
              onClick={onEdit}
              disabled={isLoading}
            >
              編輯
            </Button>
          )}
        </Box>

        {isEditing ? (
          <Grid container spacing={3}>
            {/* Preferred Contact Method */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.preferredContactMethod}>
                <InputLabel>偏好聯繫方式 *</InputLabel>
                <Select
                  value={formData.preferredContactMethod || ''}
                  label="偏好聯繫方式 *"
                  onChange={(e) => handleInputChange('preferredContactMethod', e.target.value)}
                >
                  {Object.values(ContactMethod).map((method) => (
                    <MenuItem key={method} value={method}>
                      {getContactMethodLabel(method)}
                    </MenuItem>
                  ))}
                </Select>
                {errors.preferredContactMethod && (
                  <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                    {errors.preferredContactMethod}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Timezone */}
            <Grid item xs={12} md={6}>
              <TimezoneSelector
                value={formData.timezone}
                onChange={(timezone) => handleInputChange('timezone', timezone)}
                label="時區 *"
                error={!!errors.timezone}
                helperText={errors.timezone}
              />
            </Grid>

            {/* Best Contact Time */}
            <Grid item xs={12} md={6}>
              <TimePicker
                label="最佳聯繫時間 *"
                value={formData.bestContactTime ? new Date(`2000-01-01T${formData.bestContactTime}:00`) : null}
                onChange={(time) => {
                  if (time) {
                    const timeString = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`
                    handleInputChange('bestContactTime', timeString)
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.bestContactTime,
                    helperText: errors.bestContactTime,
                  }
                }}
              />
            </Grid>

            {/* Programs of Interest */}
            <Grid item xs={12}>
              <ProgramSelector
                value={formData.programsOfInterest || []}
                onChange={(programs) => handleInputChange('programsOfInterest', programs)}
                label="感興趣的科系 *"
                error={!!errors.programsOfInterest}
                helperText={errors.programsOfInterest}
              />
            </Grid>

            {/* Special Requirements */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="特殊需求"
                placeholder="請描述任何特殊需求或偏好..."
                value={formData.specialRequirements || ''}
                onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                helperText="例如：特定時間限制、溝通語言偏好、特殊安排等"
              />
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  儲存設定
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
          // Display Mode
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  偏好聯繫方式
                </Typography>
                <Chip
                  label={getContactMethodLabel(preference?.preferredContactMethod || ContactMethod.EMAIL)}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  時區
                </Typography>
                <Typography variant="body1">
                  {preference?.timezone || '未設定'}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  最佳聯繫時間
                </Typography>
                <Typography variant="body1">
                  {preference?.bestContactTime ? formatTimeForDisplay(preference.bestContactTime) : '未設定'}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  感興趣的科系
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {preference?.programsOfInterest && preference.programsOfInterest.length > 0 ? (
                    preference.programsOfInterest.map((program) => (
                      <Chip
                        key={program}
                        label={program}
                        variant="outlined"
                        size="small"
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      未設定感興趣的科系
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>

            {preference?.specialRequirements && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    特殊需求
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {preference.specialRequirements}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        )}

        {!preference && !isEditing && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              尚未設定偏好資訊。點擊「編輯」按鈕開始設定學校的聯繫偏好和需求。
            </Typography>
          </Alert>
        )}
      </Paper>
    </LocalizationProvider>
  )
}

export default PreferenceForm