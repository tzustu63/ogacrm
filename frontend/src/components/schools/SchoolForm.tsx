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
  FormHelperText
} from '@mui/material'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store'
import { createSchool, updateSchool, clearError } from '../../store/slices/schoolsSlice'
import { School, SchoolType, RelationshipStatus, SchoolOwnership, CreateSchoolData, UpdateSchoolData } from '../../types'

const COUNTRIES = ['菲律賓', '印尼', '印度', '越南', '馬來西亞', '泰國', '香港', '澳門']

interface SchoolFormProps {
  open: boolean
  onClose: () => void
  school?: School | null
  mode: 'create' | 'edit'
}

const SchoolForm: React.FC<SchoolFormProps> = ({
  open,
  onClose,
  school,
  mode
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const { isLoading, error } = useSelector((state: RootState) => state.schools)

  const [formData, setFormData] = useState({
    name: '',
    country: '',
    region: '',
    schoolType: SchoolType.HIGH_SCHOOL,
    website: '',
    facebook: '',
    instagram: '',
    email: '',
    ownership: '' as SchoolOwnership | '',
    hasMOU: '',
    notes: '',
    relationshipStatus: RelationshipStatus.NO_RESPONSE
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      // Clear Redux error state when dialog opens
      dispatch(clearError())
      
      if (school && mode === 'edit') {
        setFormData({
          name: school.name || '',
          country: school.country || '',
          region: school.region || '',
          schoolType: school.schoolType || SchoolType.HIGH_SCHOOL,
          website: school.website || '',
          facebook: school.facebook || '',
          instagram: school.instagram || '',
          email: school.email || '',
          ownership: school.ownership || '',
          hasMOU: school.hasMOU !== undefined ? (school.hasMOU ? 'true' : 'false') : '',
          notes: school.notes || '',
          relationshipStatus: school.relationshipStatus || RelationshipStatus.NO_RESPONSE
        })
      } else {
        setFormData({
          name: '',
          country: '',
          region: '',
          schoolType: SchoolType.HIGH_SCHOOL,
          website: '',
          facebook: '',
          instagram: '',
          email: '',
          ownership: '',
          hasMOU: '',
          notes: '',
          relationshipStatus: RelationshipStatus.NO_RESPONSE
        })
      }
      setFormErrors({})
    }
  }, [school, mode, open, dispatch])

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = '學校名稱為必填項目'
    }

    if (!formData.country.trim()) {
      errors.country = '國家為必填項目'
    }

    if (!formData.region.trim()) {
      errors.region = '地區為必填項目'
    }

    if (formData.website && !isValidUrl(formData.website)) {
      errors.website = '請輸入有效的網址'
    }

    if (formData.facebook && !isValidUrl(formData.facebook)) {
      errors.facebook = '請輸入有效的網址'
    }

    if (formData.instagram && !isValidUrl(formData.instagram)) {
      errors.instagram = '請輸入有效的網址'
    }

    if (formData.email && !isValidEmail(formData.email)) {
      errors.email = '請輸入有效的 Email 地址'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      if (mode === 'create') {
        const createData: CreateSchoolData = {
          name: formData.name.trim(),
          country: formData.country.trim(),
          region: formData.region.trim(),
          schoolType: formData.schoolType,
          website: formData.website.trim() || undefined,
          facebook: formData.facebook.trim() || undefined,
          instagram: formData.instagram.trim() || undefined,
          email: formData.email.trim() || undefined,
          ownership: formData.ownership || undefined,
          hasMOU: formData.hasMOU ? formData.hasMOU === 'true' : undefined,
          notes: formData.notes.trim() || undefined,
          relationshipStatus: formData.relationshipStatus
        }
        await dispatch(createSchool(createData)).unwrap()
      } else if (school) {
        const updateData: UpdateSchoolData = {
          name: formData.name.trim(),
          country: formData.country.trim(),
          region: formData.region.trim(),
          schoolType: formData.schoolType,
          website: formData.website.trim() || undefined,
          facebook: formData.facebook.trim() || undefined,
          instagram: formData.instagram.trim() || undefined,
          email: formData.email.trim() || undefined,
          ownership: formData.ownership || undefined,
          hasMOU: formData.hasMOU ? formData.hasMOU === 'true' : undefined,
          notes: formData.notes.trim() || undefined,
          relationshipStatus: formData.relationshipStatus
        }
        await dispatch(updateSchool({ id: school.id, data: updateData })).unwrap()
      }
      onClose()
    } catch (error) {
      console.error('提交表單失敗:', error)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      country: '',
      region: '',
      schoolType: SchoolType.HIGH_SCHOOL,
        website: '',
        facebook: '',
        instagram: '',
        email: '',
        ownership: '',
      hasMOU: '',
      notes: '',
      relationshipStatus: RelationshipStatus.NO_RESPONSE
    })
    setFormErrors({})
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {mode === 'create' ? '新增學校' : '編輯學校'}
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="學校名稱"
              value={formData.name}
              onChange={handleInputChange('name')}
              error={!!formErrors.name}
              helperText={formErrors.name}
              required
              fullWidth
            />

            <FormControl fullWidth required error={!!formErrors.country}>
              <InputLabel>國家</InputLabel>
              <Select
                value={formData.country}
                onChange={handleInputChange('country')}
                label="國家"
              >
                {COUNTRIES.map((country) => (
                  <MenuItem key={country} value={country}>
                    {country}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.country && <FormHelperText>{formErrors.country}</FormHelperText>}
            </FormControl>

            <TextField
              label="區域"
              value={formData.region}
              onChange={handleInputChange('region')}
              error={!!formErrors.region}
              helperText={formErrors.region}
              required
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>屬性</InputLabel>
              <Select
                value={formData.schoolType}
                onChange={handleInputChange('schoolType')}
                label="屬性"
              >
                <MenuItem value={SchoolType.HIGH_SCHOOL}>高中</MenuItem>
                <MenuItem value={SchoolType.TECHNICAL_COLLEGE}>技術學院</MenuItem>
                <MenuItem value={SchoolType.UNIVERSITY}>大學</MenuItem>
                <MenuItem value={SchoolType.VOCATIONAL}>技職學校</MenuItem>
                <MenuItem value={SchoolType.OTHER}>其他</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>關係狀態</InputLabel>
              <Select
                value={formData.relationshipStatus}
                onChange={handleInputChange('relationshipStatus')}
                label="關係狀態"
              >
                <MenuItem value={RelationshipStatus.NO_RESPONSE}>無回應</MenuItem>
                <MenuItem value={RelationshipStatus.RESPONDED}>有回應</MenuItem>
                <MenuItem value={RelationshipStatus.HAS_ALUMNI}>有校友</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Website"
              value={formData.website}
              onChange={handleInputChange('website')}
              error={!!formErrors.website}
              helperText={formErrors.website || '選填項目'}
              placeholder="https://example.edu"
              fullWidth
            />

            <TextField
              label="FB"
              value={formData.facebook}
              onChange={handleInputChange('facebook')}
              error={!!formErrors.facebook}
              helperText={formErrors.facebook || '選填項目'}
              placeholder="https://facebook.com/..."
              fullWidth
            />

            <TextField
              label="IG"
              value={formData.instagram}
              onChange={handleInputChange('instagram')}
              error={!!formErrors.instagram}
              helperText={formErrors.instagram || '選填項目'}
              placeholder="https://instagram.com/..."
              fullWidth
            />

            <TextField
              label="Email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={!!formErrors.email}
              helperText={formErrors.email || '選填項目'}
              type="email"
              placeholder="example@school.edu"
              fullWidth
            />

            <Box display="flex" gap={2}>
              <FormControl fullWidth>
                <InputLabel>公私立</InputLabel>
                <Select
                  value={formData.ownership}
                  onChange={handleInputChange('ownership')}
                  label="公私立"
                >
                  <MenuItem value="">請選擇</MenuItem>
                  <MenuItem value={SchoolOwnership.PUBLIC}>公</MenuItem>
                  <MenuItem value={SchoolOwnership.PRIVATE}>私</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>是否有MOU</InputLabel>
                <Select
                  value={formData.hasMOU}
                  onChange={handleInputChange('hasMOU')}
                  label="是否有MOU"
                >
                  <MenuItem value="">請選擇</MenuItem>
                  <MenuItem value="true">有</MenuItem>
                  <MenuItem value="false">無</MenuItem>
                </Select>
              </FormControl>
            </Box>

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
            離開
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

export default SchoolForm