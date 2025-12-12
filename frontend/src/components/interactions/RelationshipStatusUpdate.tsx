import React, { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  Save as SaveIcon
} from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store'
import { updateSchool } from '../../store/slices/schoolsSlice'
import { RelationshipStatus, School } from '../../types'

interface RelationshipStatusUpdateProps {
  school: School
  onStatusUpdated?: (newStatus: RelationshipStatus) => void
}

const RelationshipStatusUpdate: React.FC<RelationshipStatusUpdateProps> = ({
  school,
  onStatusUpdated
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const { isLoading, error } = useSelector((state: RootState) => state.schools)

  const [selectedStatus, setSelectedStatus] = useState<RelationshipStatus>(school.relationshipStatus)
  const [hasChanges, setHasChanges] = useState(false)

  const getStatusLabel = (status: RelationshipStatus) => {
    const labels = {
      [RelationshipStatus.NO_RESPONSE]: '無回應',
      [RelationshipStatus.RESPONDED]: '有回應',
      [RelationshipStatus.HAS_ALUMNI]: '有校友'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: RelationshipStatus) => {
    const colors = {
      [RelationshipStatus.NO_RESPONSE]: 'default' as const,
      [RelationshipStatus.RESPONDED]: 'info' as const,
      [RelationshipStatus.HAS_ALUMNI]: 'success' as const
    }
    return colors[status] || 'default'
  }

  const getStatusDescription = (status: RelationshipStatus) => {
    const descriptions = {
      [RelationshipStatus.NO_RESPONSE]: '尚未收到回應',
      [RelationshipStatus.RESPONDED]: '已收到回應',
      [RelationshipStatus.HAS_ALUMNI]: '已有校友就讀'
    }
    return descriptions[status] || ''
  }

  const handleStatusChange = (event: any) => {
    const newStatus = event.target.value as RelationshipStatus
    setSelectedStatus(newStatus)
    setHasChanges(newStatus !== school.relationshipStatus)
  }

  const handleSaveStatus = async () => {
    if (!hasChanges) return

    try {
      await dispatch(updateSchool({
        id: school.id,
        data: { relationshipStatus: selectedStatus }
      })).unwrap()

      setHasChanges(false)
      
      if (onStatusUpdated) {
        onStatusUpdated(selectedStatus)
      }
    } catch (error) {
      console.error('更新關係狀態失敗:', error)
    }
  }

  const handleReset = () => {
    setSelectedStatus(school.relationshipStatus)
    setHasChanges(false)
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">關係狀態管理</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            目前狀態
          </Typography>
          <Chip
            label={getStatusLabel(school.relationshipStatus)}
            color={getStatusColor(school.relationshipStatus)}
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            {getStatusDescription(school.relationshipStatus)}
          </Typography>
        </Box>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>更新關係狀態</InputLabel>
          <Select
            value={selectedStatus}
            onChange={handleStatusChange}
            label="更新關係狀態"
          >
            {Object.values(RelationshipStatus).map((status) => (
              <MenuItem key={status} value={status}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={getStatusLabel(status)}
                    color={getStatusColor(status)}
                    size="small"
                  />
                  <Typography variant="body2">
                    {getStatusDescription(status)}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {hasChanges && (
          <Box display="flex" gap={2}>
            <Button
              onClick={handleReset}
              disabled={isLoading}
            >
              重置
            </Button>
            <Button
              onClick={handleSaveStatus}
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              儲存變更
            </Button>
          </Box>
        )}

        {!hasChanges && selectedStatus !== school.relationshipStatus && (
          <Alert severity="success" sx={{ mt: 2 }}>
            關係狀態已成功更新為「{getStatusLabel(selectedStatus)}」
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default RelationshipStatusUpdate