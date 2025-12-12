import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { contactsApi } from '../../services/api'
import { Contact, CreateContactData, UpdateContactData } from '../../types'

interface ContactsState {
  contacts: Contact[]
  isLoading: boolean
  error: string | null
}

const initialState: ContactsState = {
  contacts: [],
  isLoading: false,
  error: null,
}

export const fetchContacts = createAsyncThunk(
  'contacts/fetchContacts',
  async (schoolId?: string) => {
    const response = await contactsApi.getContacts(schoolId)
    return response
  }
)

export const createContact = createAsyncThunk(
  'contacts/createContact',
  async (contactData: CreateContactData) => {
    const response = await contactsApi.createContact(contactData)
    return response
  }
)

export const updateContact = createAsyncThunk(
  'contacts/updateContact',
  async ({ id, data }: { id: string; data: UpdateContactData }) => {
    const response = await contactsApi.updateContact(id, data)
    return response
  }
)

export const deleteContact = createAsyncThunk(
  'contacts/deleteContact',
  async (id: string) => {
    await contactsApi.deleteContact(id)
    return id
  }
)

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.isLoading = false
        // 確保 payload 是數組
        const contacts = Array.isArray(action.payload) ? action.payload : []
        state.contacts = contacts
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || '獲取聯絡人失敗'
      })
      .addCase(createContact.fulfilled, (state, action) => {
        state.contacts.push(action.payload)
      })
      .addCase(updateContact.fulfilled, (state, action) => {
        const index = state.contacts.findIndex(contact => contact.id === action.payload.id)
        if (index !== -1) {
          state.contacts[index] = action.payload
        }
      })
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.contacts = state.contacts.filter(contact => contact.id !== action.payload)
      })
  },
})

export const { clearError } = contactsSlice.actions
export default contactsSlice.reducer