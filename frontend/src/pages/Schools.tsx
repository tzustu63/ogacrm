import React, { useState } from 'react'
import { Box } from '@mui/material'
import SchoolList from '../components/schools/SchoolList'
import SchoolForm from '../components/schools/SchoolForm'
import SchoolDetail from '../components/schools/SchoolDetail'
import { School } from '../types'

const Schools: React.FC = () => {
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')

  const handleCreateSchool = () => {
    setSelectedSchool(null)
    setFormMode('create')
    setFormOpen(true)
  }

  const handleEditSchool = (school: School) => {
    setSelectedSchool(school)
    setFormMode('edit')
    setFormOpen(true)
  }

  const handleViewSchool = (school: School) => {
    setSelectedSchool(school)
    setDetailOpen(true)
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setSelectedSchool(null)
  }

  const handleDetailClose = () => {
    setDetailOpen(false)
    setSelectedSchool(null)
  }

  const handleEditFromDetail = () => {
    setDetailOpen(false)
    setFormMode('edit')
    setFormOpen(true)
  }

  return (
    <Box>
      <SchoolList
        onCreateSchool={handleCreateSchool}
        onEditSchool={handleEditSchool}
        onViewSchool={handleViewSchool}
      />

      <SchoolForm
        open={formOpen}
        onClose={handleFormClose}
        school={selectedSchool}
        mode={formMode}
      />

      <SchoolDetail
        open={detailOpen}
        onClose={handleDetailClose}
        onEdit={handleEditFromDetail}
        school={selectedSchool}
      />
    </Box>
  )
}

export default Schools