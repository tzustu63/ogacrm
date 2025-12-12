import React, { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Collapse,
  IconButton
} from '@mui/material'
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store'
import { createContact } from '../../store/slices/contactsSlice'
import { CreateContactData } from '../../types'

interface QuickAddContactProps {
  schoolId: string
  onContactAdded?: () => void
}

const QuickAddContact: React.FC<QuickAddContactProps> = ({
  schoolId,
  onContactAdded
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const { isLoading, error } = useSelector((state: RootState) => state.contacts)

  const [expanded, setExpanded] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: ''
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const errors: Record<string, string> = {}

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

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      const createData: CreateContactData = {
        schoolId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        position: formData.position.trim() || undefined,
        isPrimary: false
      }
      
      await dispatch(createContact(createData)).unwrap()
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        position: ''
      })
      setFormErrors({})
      setExpanded(false)
      
      if (onContactAdded) {
        onContactAdded()
      }
    } catch (error) {
      console.error('新增聯絡人失敗:', error)
    }
  }

  const handleToggleExpanded = () => {
    setExpanded(!expanded)
    if (!expanded) {
      // Reset form when expanding
      setFormData({
        name: '',
        email: '',
        phone: '',
        position: ''
      })
      setFormErrors({})
    }
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="div">
            快速新增聯絡人
          </Typography>
          <IconButton onClick={handleToggleExpanded}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Box mt={2}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" gap={2}>
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
                </Box>

                <Box display="flex" gap={2}>
                  <TextField
                    label="電話號碼"
                    value={formData.phone}
                    onChange={handleInputChange('phone')}
                    error={!!formErrors.phone}
                    helperText={formErrors.phone}
                    fullWidth
                  />
                  <TextField
                    label="職位"
                    value={formData.position}
                    onChange={handleInputChange('position')}
                    fullWidth
                  />
                </Box>

                <Box display="flex" justifyContent="flex-end" gap={2}>
                  <Button
                    onClick={handleToggleExpanded}
                    disabled={isLoading}
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isLoading}
                    startIcon={isLoading ? <CircularProgress size={20} /> : <AddIcon />}
                  >
                    新增聯絡人
                  </Button>
                </Box>
              </Box>
            </form>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  )
}

export default QuickAddContact