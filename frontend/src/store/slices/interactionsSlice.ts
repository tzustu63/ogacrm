import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { interactionsApi } from '../../services/api'
import { Interaction, CreateInteractionData, UpdateInteractionData } from '../../types'

interface InteractionsState {
  interactions: Interaction[]
  isLoading: boolean
  error: string | null
}

const initialState: InteractionsState = {
  interactions: [],
  isLoading: false,
  error: null,
}

export const fetchInteractions = createAsyncThunk(
  'interactions/fetchInteractions',
  async (schoolId?: string) => {
    const response = await interactionsApi.getInteractions(schoolId)
    return response
  }
)

export const createInteraction = createAsyncThunk(
  'interactions/createInteraction',
  async (interactionData: CreateInteractionData) => {
    const response = await interactionsApi.createInteraction(interactionData)
    return response
  }
)

export const updateInteraction = createAsyncThunk(
  'interactions/updateInteraction',
  async ({ id, data }: { id: string; data: UpdateInteractionData }) => {
    const response = await interactionsApi.updateInteraction(id, data)
    return response
  }
)

export const deleteInteraction = createAsyncThunk(
  'interactions/deleteInteraction',
  async (id: string) => {
    await interactionsApi.deleteInteraction(id)
    return id
  }
)

const interactionsSlice = createSlice({
  name: 'interactions',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInteractions.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.isLoading = false
        // 確保 payload 是數組
        const interactions = Array.isArray(action.payload) ? action.payload : []
        state.interactions = interactions
      })
      .addCase(fetchInteractions.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || '獲取互動記錄失敗'
      })
      .addCase(createInteraction.fulfilled, (state, action) => {
        // 將新記錄添加到列表開頭（如果不存在）
        const exists = state.interactions.find(i => i.id === action.payload.id)
        if (!exists) {
          state.interactions.unshift(action.payload)
        }
      })
      .addCase(updateInteraction.fulfilled, (state, action) => {
        const index = state.interactions.findIndex(interaction => interaction.id === action.payload.id)
        if (index !== -1) {
          state.interactions[index] = action.payload
        }
      })
      .addCase(deleteInteraction.fulfilled, (state, action) => {
        state.interactions = state.interactions.filter(interaction => interaction.id !== action.payload)
      })
  },
})

export const { clearError } = interactionsSlice.actions
export default interactionsSlice.reducer