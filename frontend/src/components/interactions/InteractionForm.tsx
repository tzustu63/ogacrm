import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Autocomplete
} from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store'
import { createInteraction, updateInteraction } from '../../store/slices/interactionsSlice'
import { fetchSchools } from '../../store/slices/schoolsSlice'
import { fetchContacts } from '../../store/slices/contactsSlice'
import { Interaction, CreateInteractionData, UpdateInteractionData, ContactMethod, School, Contact } from '../../types'
import dayjs, { Dayjs } from 'dayjs'

interface InteractionFormProps {
  open: boolean
  onClose: () => void
  interaction?: Interaction | null
  mode: 'create' | 'edit'
  preselectedSchoolId?: string
  onSuccess?: () => void // 成功提交後的回調
}

const InteractionForm: React.FC<InteractionFormProps> = ({
  open,
  onClose,
  interaction,
  mode,
  preselectedSchoolId,
  onSuccess
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const { isLoading, error } = useSelector((state: RootState) => state.interactions)
  const { schools } = useSelector((state: RootState) => state.schools)
  const { contacts } = useSelector((state: RootState) => state.contacts)

  const [formData, setFormData] = useState({
    schoolId: preselectedSchoolId || '',
    contactId: '',
    subject: '',
    contactMethod: ContactMethod.EMAIL,
    date: dayjs(),
    notes: '',
    tzuContact: '',
    followUpRequired: false,
    followUpDate: null as Dayjs | null,
    followUpReport: ''
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open && (!Array.isArray(schools) || schools.length === 0)) {
      dispatch(fetchSchools({ limit: 1000 }))
    }
  }, [dispatch, open, schools])

  useEffect(() => {
    if (open && formData.schoolId) {
      dispatch(fetchContacts(formData.schoolId))
    }
  }, [dispatch, open, formData.schoolId])

  useEffect(() => {
    if (interaction && mode === 'edit') {
      setFormData({
        schoolId: interaction.schoolId,
        contactId: interaction.contactId || '',
        subject: interaction.subject || '',
        contactMethod: interaction.contactMethod,
        date: dayjs(interaction.date),
        notes: interaction.notes,
        tzuContact: interaction.tzuContact || '',
        followUpRequired: interaction.followUpRequired,
        followUpDate: interaction.followUpDate ? dayjs(interaction.followUpDate) : null,
        followUpReport: interaction.followUpReport || ''
      })
    } else {
      setFormData({
        schoolId: preselectedSchoolId || '',
        contactId: '',
        subject: '',
        contactMethod: ContactMethod.EMAIL,
        date: dayjs(),
        notes: '',
        tzuContact: '',
        followUpRequired: false,
        followUpDate: null,
        followUpReport: ''
      })
    }
    setFormErrors({})
  }, [interaction, mode, open, preselectedSchoolId])

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.schoolId) {
      errors.schoolId = '請選擇學校'
    }

    if (!formData.subject.trim()) {
      errors.subject = '主題為必填項目'
    }

    if (!formData.notes.trim()) {
      errors.notes = '互動內容為必填項目'
    }

    if (!formData.tzuContact.trim()) {
      errors.tzuContact = '慈大聯絡人為必填項目'
    }

    if (formData.followUpRequired && !formData.followUpDate) {
      errors.followUpDate = '需要後續追蹤時，追蹤日期為必填項目'
    }

    if (formData.followUpDate && formData.followUpDate.isBefore(dayjs(), 'day')) {
      errors.followUpDate = '追蹤日期必須是未來時間'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: string) => (event: any) => {
    const value = field === 'followUpRequired' ? event.target.checked : event.target.value
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear follow-up date and report when follow-up is not required
    if (field === 'followUpRequired' && !value) {
      setFormData(prev => ({
        ...prev,
        followUpDate: null,
        followUpReport: ''
      }))
    }
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleDateChange = (field: 'date' | 'followUpDate') => (newValue: Dayjs | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: newValue
    }))
    
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleSchoolChange = (_event: any, newValue: School | null) => {
    setFormData(prev => ({
      ...prev,
      schoolId: newValue?.id || '',
      contactId: '' // 重置聯絡人選擇
    }))
    
    if (formErrors.schoolId) {
      setFormErrors(prev => ({
        ...prev,
        schoolId: ''
      }))
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      if (mode === 'create') {
        const createData: CreateInteractionData = {
          schoolId: formData.schoolId,
          contactId: formData.contactId || undefined,
          subject: formData.subject.trim(),
          contactMethod: formData.contactMethod,
          date: formData.date.toISOString(),
          notes: formData.notes.trim(),
          tzuContact: formData.tzuContact.trim(),
          followUpRequired: formData.followUpRequired,
          followUpDate: formData.followUpDate?.toISOString(),
          followUpReport: formData.followUpRequired ? (formData.followUpReport.trim() || undefined) : undefined
        }
        await dispatch(createInteraction(createData)).unwrap()
      } else if (interaction) {
        const updateData: UpdateInteractionData = {
          contactId: formData.contactId || undefined,
          subject: formData.subject.trim(),
          contactMethod: formData.contactMethod,
          date: formData.date.toISOString(),
          notes: formData.notes.trim(),
          tzuContact: formData.tzuContact.trim(),
          followUpRequired: formData.followUpRequired,
          followUpDate: formData.followUpDate?.toISOString(),
          followUpReport: formData.followUpRequired ? (formData.followUpReport.trim() || undefined) : undefined
        }
        await dispatch(updateInteraction({ id: interaction.id, data: updateData })).unwrap()
      }
      // 成功後調用回調
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (error) {
      console.error('提交表單失敗:', error)
    }
  }

  const handleClose = () => {
    setFormData({
      schoolId: preselectedSchoolId || '',
      contactId: '',
      subject: '',
      contactMethod: ContactMethod.EMAIL,
      date: dayjs(),
      notes: '',
      tzuContact: '',
      followUpRequired: false,
      followUpDate: null,
      followUpReport: ''
    })
    setFormErrors({})
    onClose()
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

  const selectedSchool = Array.isArray(schools) ? schools.find(school => school.id === formData.schoolId) : undefined

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {mode === 'create' ? '新增互動記錄' : '編輯互動記錄'}
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {!preselectedSchoolId && (
              <Autocomplete
                options={Array.isArray(schools) ? schools : []}
                getOptionLabel={(option) => option.name}
                value={selectedSchool || null}
                onChange={handleSchoolChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="學校"
                    error={!!formErrors.schoolId}
                    helperText={formErrors.schoolId}
                    required
                  />
                )}
                disabled={mode === 'edit'}
              />
            )}

            {formData.schoolId && (
              <Autocomplete
                options={Array.isArray(contacts) ? contacts : []}
                getOptionLabel={(option) => `${option.name}${option.position ? ` (${option.position})` : ''}`}
                value={Array.isArray(contacts) ? contacts.find(c => c.id === formData.contactId) || null : null}
                onChange={(event, newValue: Contact | null) => {
                  setFormData(prev => ({
                    ...prev,
                    contactId: newValue?.id || ''
                  }))
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="聯絡人"
                    helperText="選填項目"
                  />
                )}
              />
            )}

            <TextField
              label="主題"
              value={formData.subject}
              onChange={handleInputChange('subject')}
              error={!!formErrors.subject}
              helperText={formErrors.subject}
              required
              fullWidth
            />

            <FormControl fullWidth required>
              <InputLabel>方式</InputLabel>
              <Select
                value={formData.contactMethod}
                onChange={handleInputChange('contactMethod')}
                label="方式"
              >
                <MenuItem value={ContactMethod.PHONE}>電話</MenuItem>
                <MenuItem value={ContactMethod.EMAIL}>Email</MenuItem>
                <MenuItem value={ContactMethod.FACEBOOK}>FB</MenuItem>
                <MenuItem value={ContactMethod.INSTAGRAM}>IG</MenuItem>
                <MenuItem value={ContactMethod.WHATSAPP}>WhatsApp</MenuItem>
                <MenuItem value={ContactMethod.MEETING}>見面</MenuItem>
              </Select>
            </FormControl>

            <DateTimePicker
              label="日期"
              value={formData.date}
              onChange={handleDateChange('date')}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true
                }
              }}
            />

            <TextField
              label="慈大聯絡人"
              value={formData.tzuContact}
              onChange={handleInputChange('tzuContact')}
              error={!!formErrors.tzuContact}
              helperText={formErrors.tzuContact}
              required
              fullWidth
            />

            <TextField
              label="互動內容"
              value={formData.notes}
              onChange={handleInputChange('notes')}
              error={!!formErrors.notes}
              helperText={formErrors.notes}
              required
              multiline
              rows={4}
              fullWidth
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.followUpRequired}
                  onChange={handleInputChange('followUpRequired')}
                />
              }
              label="需要後續追蹤"
            />

            {formData.followUpRequired && (
              <>
                <DateTimePicker
                  label="追蹤日期時間"
                  value={formData.followUpDate}
                  onChange={handleDateChange('followUpDate')}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: formData.followUpRequired,
                      error: !!formErrors.followUpDate,
                      helperText: formErrors.followUpDate
                    }
                  }}
                  minDateTime={dayjs()}
                />
                <TextField
                  label="回報"
                  value={formData.followUpReport}
                  onChange={handleInputChange('followUpReport')}
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="請填寫追蹤回報內容"
                />
              </>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>
            取消
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            {mode === 'create' ? '新增' : '更新'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default InteractionForm