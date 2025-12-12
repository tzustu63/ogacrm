import React, { useState } from 'react'
import { Typography, Box, Container, Grid, Tabs, Tab } from '@mui/material'

import { MOUStatusPanel, ExpiryReminders, StatisticsDashboard } from '@/components/partnerships'
import { Partnership, School } from '@/types'

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
      id={`partnerships-tabpanel-${index}`}
      aria-labelledby={`partnerships-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

const Partnerships: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)
  const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null)

  // Mock data for demonstration
  const mockPartnerships: Partnership[] = [
    {
      id: '1',
      schoolId: '1',
      mouStatus: 'signed' as any,
      mouSignedDate: '2024-01-15',
      mouExpiryDate: '2024-12-31',
      referralCount: 25,
      eventsHeld: 3,
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
    },
    {
      id: '2',
      schoolId: '2',
      mouStatus: 'negotiating' as any,
      referralCount: 5,
      eventsHeld: 1,
      createdAt: '2024-02-01',
      updatedAt: '2024-02-01',
    },
    {
      id: '3',
      schoolId: '3',
      mouStatus: 'signed' as any,
      mouSignedDate: '2023-06-01',
      mouExpiryDate: '2024-12-15',
      referralCount: 40,
      eventsHeld: 5,
      createdAt: '2023-06-01',
      updatedAt: '2023-06-01',
    },
  ]

  const mockSchools: School[] = [
    {
      id: '1',
      name: '台北市立第一高中',
      country: '台灣',
      region: '台北市',
      schoolType: 'high_school' as any,
      relationshipStatus: 'partnered' as any,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: '2',
      name: '新加坡國立大學',
      country: '新加坡',
      region: '新加坡',
      schoolType: 'university' as any,
      relationshipStatus: 'active' as any,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: '3',
      name: '香港科技大學',
      country: '香港',
      region: '香港',
      schoolType: 'university' as any,
      relationshipStatus: 'partnered' as any,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ]

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleUpdatePartnership = (updates: Partial<Partnership>) => {
    console.log('Updating partnership:', updates)
    // In real app, dispatch update action
  }

  const handleRefreshReminders = () => {
    console.log('Refreshing reminders')
    // In real app, dispatch refresh action
  }

  const handleViewSchool = (schoolId: string) => {
    console.log('Viewing school:', schoolId)
    // In real app, navigate to school detail
  }

  const handleUpdateMOU = (partnershipId: string) => {
    console.log('Updating MOU:', partnershipId)
    const partnership = mockPartnerships.find(p => p.id === partnershipId)
    setSelectedPartnership(partnership || null)
    setTabValue(0) // Switch to MOU management tab
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          合作管理
        </Typography>
        <Typography variant="body1" color="text.secondary">
          管理學校合作關係、MOU 狀態追蹤和合作績效分析
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="MOU 狀態管理" />
          <Tab label="到期提醒" />
          <Tab label="統計資料" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <MOUStatusPanel
              partnership={selectedPartnership || mockPartnerships[0]}
              onUpdate={handleUpdatePartnership}
            />
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <ExpiryReminders
          partnerships={mockPartnerships}
          schools={mockSchools}
          onRefresh={handleRefreshReminders}
          onViewSchool={handleViewSchool}
          onUpdateMOU={handleUpdateMOU}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <StatisticsDashboard
          partnerships={mockPartnerships}
          schools={mockSchools}
          onViewSchool={handleViewSchool}
        />
      </TabPanel>
    </Container>
  )
}

export default Partnerships