import React, { useState } from 'react'
import { Typography, Box, Container, Tabs, Tab, Paper } from '@mui/material'
import { useParams } from 'react-router-dom'
import { PreferenceForm } from '@/components/preferences'
import { ContactMethod, Preference } from '@/types'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`school-tabpanel-${index}`}
      aria-labelledby={`school-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

const SchoolDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [tabValue, setTabValue] = useState(0)
  const [isEditingPreferences, setIsEditingPreferences] = useState(false)

  // Mock preference data
  const mockPreference: Preference = {
    id: '1',
    schoolId: id || '1',
    preferredContactMethod: ContactMethod.EMAIL,
    programsOfInterest: ['資訊工程學系', '電機工程學系', '企業管理學系'],
    bestContactTime: '14:00',
    timezone: 'Asia/Taipei',
    specialRequirements: '請使用中文溝通，偏好在下午時段聯繫。對於技術相關課程特別感興趣。',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleSavePreferences = (preferenceData: Partial<Preference>) => {
    console.log('Saving preferences:', preferenceData)
    setIsEditingPreferences(false)
    // In real app, dispatch save action
  }

  const handleCancelPreferences = () => {
    setIsEditingPreferences(false)
  }

  const handleEditPreferences = () => {
    setIsEditingPreferences(true)
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          學校詳情
        </Typography>
        <Typography variant="body1" color="text.secondary">
          學校 ID: {id}
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="基本資訊" />
          <Tab label="聯絡人" />
          <Tab label="互動記錄" />
          <Tab label="偏好設定" />
          <Tab label="合作狀態" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            學校基本資訊
          </Typography>
          <Typography variant="body1">
            基本資訊內容將在後續任務中實作
          </Typography>
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            聯絡人管理
          </Typography>
          <Typography variant="body1">
            聯絡人管理內容將在後續任務中實作
          </Typography>
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            互動記錄
          </Typography>
          <Typography variant="body1">
            互動記錄內容將在後續任務中實作
          </Typography>
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <PreferenceForm
          preference={mockPreference}
          onSave={handleSavePreferences}
          onCancel={handleCancelPreferences}
          onEdit={handleEditPreferences}
          isEditing={isEditingPreferences}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            合作狀態
          </Typography>
          <Typography variant="body1">
            合作狀態內容將在後續任務中實作
          </Typography>
        </Paper>
      </TabPanel>
    </Container>
  )
}

export default SchoolDetail