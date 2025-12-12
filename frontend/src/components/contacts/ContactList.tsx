import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Avatar
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../../store'
import { fetchContacts, deleteContact } from '../../store/slices/contactsSlice'
import { fetchSchools } from '../../store/slices/schoolsSlice'
import { Contact } from '../../types'

interface ContactListProps {
  onCreateContact: () => void
  onEditContact: (contact: Contact) => void
  schoolId?: string
}

const ContactList: React.FC<ContactListProps> = ({
  onCreateContact,
  onEditContact,
  schoolId
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const { contacts, isLoading, error } = useSelector(
    (state: RootState) => state.contacts
  )
  const { schools } = useSelector((state: RootState) => state.schools)

  const [searchTerm, setSearchTerm] = useState('')
  const [schoolFilter, setSchoolFilter] = useState(schoolId || '')
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])

  useEffect(() => {
    dispatch(fetchContacts(schoolId))
    if (!schoolId) {
      dispatch(fetchSchools({ limit: 1000 })) // Load all schools for filter
    }
  }, [dispatch, schoolId])

  useEffect(() => {
    // 確保 contacts 是數組
    const contactsArray = Array.isArray(contacts) ? contacts : []
    let filtered = contactsArray

    if (searchTerm) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.position && contact.position.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (schoolFilter && !schoolId) {
      filtered = filtered.filter(contact => contact.schoolId === schoolFilter)
    }

    setFilteredContacts(filtered)
  }, [contacts, searchTerm, schoolFilter, schoolId])

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }

  const handleSchoolFilter = (event: any) => {
    setSchoolFilter(event.target.value)
  }

  const handleDeleteContact = async (contactId: string) => {
    if (window.confirm('確定要刪除這個聯絡人嗎？')) {
      try {
        await dispatch(deleteContact(contactId)).unwrap()
      } catch (error) {
        console.error('刪除聯絡人失敗:', error)
      }
    }
  }

  const getSchoolName = (schoolId: string) => {
    const school = Array.isArray(schools) ? schools.find(s => s.id === schoolId) : undefined
    return school?.name || '未知學校'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading && contacts.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          {schoolId ? '學校聯絡人' : '聯絡人管理'}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateContact}
        >
          新增聯絡人
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              placeholder="搜尋聯絡人姓名、電郵或職位..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            
            {!schoolId && (
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>學校篩選</InputLabel>
                <Select
                  value={schoolFilter}
                  onChange={handleSchoolFilter}
                  label="學校篩選"
                >
                  <MenuItem value="">全部學校</MenuItem>
                  {Array.isArray(schools) && schools.map((school) => (
                    <MenuItem key={school.id} value={school.id}>
                      {school.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)', overflowX: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>聯絡人</TableCell>
              {!schoolId && <TableCell>學校</TableCell>}
              <TableCell>職位</TableCell>
              <TableCell>單位</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>電話</TableCell>
              <TableCell>FB</TableCell>
              <TableCell>IG</TableCell>
              <TableCell>WhatsApp</TableCell>
              <TableCell>備註</TableCell>
              <TableCell>建立日期</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(filteredContacts) && filteredContacts.map((contact) => (
              <TableRow key={contact.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {getInitials(contact.name)}
                    </Avatar>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {contact.name}
                    </Typography>
                  </Box>
                </TableCell>
                {!schoolId && (
                  <TableCell>
                    <Typography variant="body2">
                      {getSchoolName(contact.schoolId)}
                    </Typography>
                  </TableCell>
                )}
                <TableCell>
                  {contact.position || (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {contact.organization || (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email.replace(/^mailto:/i, '')}?bcc=tzustu@harvestwize.com`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1976d2', textDecoration: 'none', cursor: 'pointer' }}
                    >
                      link
                    </a>
                  ) : (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {contact.phone || (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {contact.facebook ? (
                    <a
                      href={contact.facebook.startsWith('http') ? contact.facebook : `https://${contact.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1976d2', textDecoration: 'none' }}
                    >
                      link
                    </a>
                  ) : (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {contact.instagram ? (
                    <a
                      href={contact.instagram.startsWith('http') ? contact.instagram : `https://${contact.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1976d2', textDecoration: 'none' }}
                    >
                      link
                    </a>
                  ) : (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {contact.whatsapp ? (
                    <a
                      href={contact.whatsapp.startsWith('http') ? contact.whatsapp : `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1976d2', textDecoration: 'none' }}
                    >
                      link
                    </a>
                  ) : (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {contact.notes ? (
                    <Typography variant="body2" title={contact.notes} sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contact.notes}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(contact.createdAt).toLocaleDateString('zh-TW')}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => onEditContact(contact)}
                    title="編輯"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteContact(contact.id)}
                    title="刪除"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredContacts.length === 0 && !isLoading && (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            {searchTerm || schoolFilter ? '沒有找到符合條件的聯絡人' : '尚無聯絡人資料'}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default ContactList