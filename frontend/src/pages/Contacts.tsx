import React, { useState } from 'react'
import { Box } from '@mui/material'
import ContactList from '../components/contacts/ContactList'
import ContactForm from '../components/contacts/ContactForm'
import { Contact } from '../types'

const Contacts: React.FC = () => {
  const [formOpen, setFormOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')

  const handleCreateContact = () => {
    setSelectedContact(null)
    setFormMode('create')
    setFormOpen(true)
  }

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact)
    setFormMode('edit')
    setFormOpen(true)
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setSelectedContact(null)
  }

  return (
    <Box>
      <ContactList
        onCreateContact={handleCreateContact}
        onEditContact={handleEditContact}
      />

      <ContactForm
        open={formOpen}
        onClose={handleFormClose}
        contact={selectedContact}
        mode={formMode}
      />
    </Box>
  )
}

export default Contacts