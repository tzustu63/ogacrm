import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,

  Box,
  Alert,
  CircularProgress,
  Autocomplete
} from '@mui/material'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store'
import { createContact, updateContact } from '../../store/slices/contactsSlice'
import { fetchSchools } from '../../store/slices/schoolsSlice'
import { Contact, CreateContactData, UpdateContactData, School } from '../../types'

interface ContactFormProps {
  open: boolean
  onClose: () => void
  contact?: Contact | null
  mode: 'create' | 'edit'
  preselectedSchoolId?: string
}

const ContactForm: React.FC<ContactFormProps> = ({
  open,
  onClose,
  contact,
  mode,
  preselectedSchoolId
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const { isLoading, error } = useSelector((state: RootState) => state.contacts)
  const { schools } = useSelector((state: RootState) => state.schools)

  const [formData, setFormData] = useState({
    schoolId: preselectedSchoolId || '',
    name: '',
    email: '',
    phone: '',
    position: '',
    organization: '',
    facebook: '',
    instagram: '',
    whatsapp: '',
    notes: ''
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open && (!Array.isArray(schools) || schools.length === 0)) {
      dispatch(fetchSchools({ limit: 1000 }))
    }
  }, [dispatch, open, schools])

  useEffect(() => {
    if (contact && mode === 'edit') {
      setFormData({
        schoolId: contact.schoolId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone || '',
        position: contact.position || '',
        organization: contact.organization || '',
        facebook: contact.facebook || '',
        instagram: contact.instagram || '',
        whatsapp: contact.whatsapp || '',
        notes: contact.notes || ''
      })
    } else {
      setFormData({
        schoolId: preselectedSchoolId || '',
        name: '',
        email: '',
        phone: '',
        position: '',
        organization: '',
        facebook: '',
        instagram: '',
        whatsapp: '',
        notes: ''
      })
    }
    setFormErrors({})
  }, [contact, mode, open, preselectedSchoolId])

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.schoolId) {
      errors.schoolId = '請選擇學校'
    }

    if (!formData.name.trim()) {
      errors.name = '姓名為必填項目'
    }

    if (!formData.email.trim()) {
      errors.email = '電郵為必填項目'
    } else if (!isValidEmail(formData.email)) {
      errors.email = '請輸入有效的電郵地址'
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      errors.phone = '請輸入有效的電話號碼'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isValidPhone = (phone: string) => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/
    return phoneRegex.test(phone)
  }

  const handleInputChange = (field: string) => (event: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }))
    
    // Clear error when user starts typing
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
      schoolId: newValue?.id || ''
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
        const createData: CreateContactData = {
          schoolId: formData.schoolId,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          position: formData.position.trim() || undefined,
          organization: formData.organization.trim() || undefined,
          facebook: formData.facebook.trim() || undefined,
          instagram: formData.instagram.trim() || undefined,
          whatsapp: formData.whatsapp.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          isPrimary: false
        }
        await dispatch(createContact(createData)).unwrap()
      } else if (contact) {
        const updateData: UpdateContactData = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          position: formData.position.trim() || undefined,
          organization: formData.organization.trim() || undefined,
          facebook: formData.facebook.trim() || undefined,
          instagram: formData.instagram.trim() || undefined,
          whatsapp: formData.whatsapp.trim() || undefined,
          notes: formData.notes.trim() || undefined
        }
        await dispatch(updateContact({ id: contact.id, data: updateData })).unwrap()
      }
      onClose()
    } catch (error) {
      console.error('提交表單失敗:', error)
    }
  }

  const handleClose = () => {
    setFormData({
      schoolId: preselectedSchoolId || '',
      name: '',
      email: '',
      phone: '',
      position: '',
      organization: '',
      facebook: '',
      instagram: '',
      whatsapp: '',
      notes: ''
    })
    setFormErrors({})
    onClose()
  }

  const selectedSchool = Array.isArray(schools) ? schools.find(school => school.id === formData.schoolId) : undefined

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {mode === 'create' ? '新增聯絡人' : '編輯聯絡人'}
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

            <TextField
              label="姓名"
              value={formData.name}
              onChange={handleInputChange('name')}
              error={!!formErrors.name}
              helperText={formErrors.name}
              required
              fullWidth
            />

            <TextField
              label="電郵地址"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={!!formErrors.email}
              helperText={formErrors.email}
              required
              fullWidth
            />

            <TextField
              label="電話號碼"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              error={!!formErrors.phone}
              helperText={formErrors.phone || '選填項目'}
              fullWidth
            />

            <TextField
              label="職位"
              value={formData.position}
              onChange={handleInputChange('position')}
              helperText="選填項目"
              fullWidth
            />

            <TextField
              label="單位"
              value={formData.organization}
              onChange={handleInputChange('organization')}
              helperText="選填項目"
              fullWidth
            />

            <TextField
              label="FB"
              value={formData.facebook}
              onChange={handleInputChange('facebook')}
              helperText="選填項目，請輸入完整的 Facebook URL"
              placeholder="https://facebook.com/..."
              fullWidth
            />

            <TextField
              label="IG"
              value={formData.instagram}
              onChange={handleInputChange('instagram')}
              helperText="選填項目，請輸入完整的 Instagram URL"
              placeholder="https://instagram.com/..."
              fullWidth
            />

            <TextField
              label="WhatsApp"
              value={formData.whatsapp}
              onChange={handleInputChange('whatsapp')}
              helperText="選填項目"
              placeholder="電話號碼或 WhatsApp 連結"
              fullWidth
            />

            <TextField
              label="備註"
              value={formData.notes}
              onChange={handleInputChange('notes')}
              helperText="選填項目"
              multiline
              rows={3}
              fullWidth
            />
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

export default ContactForm