import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { partnershipsApi } from '@/services/api'
import { Partnership, UpdatePartnershipData } from '@/types'

interface PartnershipsState {
  partnerships: Partnership[]
  isLoading: boolean
  error: string | null
}

const initialState: PartnershipsState = {
  partnerships: [],
  isLoading: false,
  error: null,
}

export const fetchPartnerships = createAsyncThunk(
  'partnerships/fetchPartnerships',
  async () => {
    const response = await partnershipsApi.getPartnerships()
    return response
  }
)

export const updatePartnership = createAsyncThunk(
  'partnerships/updatePartnership',
  async ({ schoolId, data }: { schoolId: string; data: UpdatePartnershipData }) => {
    const response = await partnershipsApi.updatePartnership(schoolId, data)
    return response
  }
)

const partnershipsSlice = createSlice({
  name: 'partnerships',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPartnerships.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchPartnerships.fulfilled, (state, action) => {
        state.isLoading = false
        state.partnerships = action.payload
      })
      .addCase(fetchPartnerships.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || '獲取合作資訊失敗'
      })
      .addCase(updatePartnership.fulfilled, (state, action) => {
        const index = state.partnerships.findIndex(p => p.schoolId === action.payload.schoolId)
        if (index !== -1) {
          state.partnerships[index] = action.payload
        } else {
          state.partnerships.push(action.payload)
        }
      })
  },
})

export const { clearError } = partnershipsSlice.actions
export default partnershipsSlice.reducer