import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { searchApi } from '@/services/api'
import { School, SearchFilters } from '@/types'

interface SearchState {
  results: School[]
  filters: SearchFilters
  isLoading: boolean
  error: string | null
  query: string
}

const initialState: SearchState = {
  results: [],
  filters: {},
  isLoading: false,
  error: null,
  query: '',
}

export const searchSchools = createAsyncThunk(
  'search/searchSchools',
  async (params: { query?: string; filters?: SearchFilters }) => {
    const response = await searchApi.searchSchools(params)
    return response
  }
)

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload
    },
    setFilters: (state, action: PayloadAction<SearchFilters>) => {
      state.filters = action.payload
    },
    clearFilters: (state) => {
      state.filters = {}
    },
    clearResults: (state) => {
      state.results = []
      state.query = ''
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchSchools.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(searchSchools.fulfilled, (state, action) => {
        state.isLoading = false
        state.results = action.payload
      })
      .addCase(searchSchools.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || '搜尋失敗'
      })
  },
})

export const { setQuery, setFilters, clearFilters, clearResults, clearError } = searchSlice.actions
export default searchSlice.reducer