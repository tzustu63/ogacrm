import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { schoolsApi } from '@/services/api'
import { School, CreateSchoolData, UpdateSchoolData, PaginatedResponse } from '@/types'

interface SchoolsState {
  schools: School[]
  currentSchool: School | null
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const initialState: SchoolsState = {
  schools: [],
  currentSchool: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
}

export const fetchSchools = createAsyncThunk(
  'schools/fetchSchools',
  async (params?: { 
    page?: number; 
    limit?: number; 
    search?: string;
    country?: string;
    region?: string;
    schoolType?: string;
    relationshipStatus?: string;
    ownership?: string;
    hasMOU?: boolean;
  }) => {
    const response = await schoolsApi.getSchools(params)
    return response
  }
)

export const fetchSchoolById = createAsyncThunk(
  'schools/fetchSchoolById',
  async (id: string) => {
    const response = await schoolsApi.getSchoolById(id)
    return response
  }
)

export const createSchool = createAsyncThunk(
  'schools/createSchool',
  async (schoolData: CreateSchoolData) => {
    const response = await schoolsApi.createSchool(schoolData)
    return response
  }
)

export const updateSchool = createAsyncThunk(
  'schools/updateSchool',
  async ({ id, data }: { id: string; data: UpdateSchoolData }) => {
    const response = await schoolsApi.updateSchool(id, data)
    return response
  }
)

export const deleteSchool = createAsyncThunk(
  'schools/deleteSchool',
  async (id: string) => {
    await schoolsApi.deleteSchool(id)
    return id
  }
)

const schoolsSlice = createSlice({
  name: 'schools',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearCurrentSchool: (state) => {
      state.currentSchool = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch schools
      .addCase(fetchSchools.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchSchools.fulfilled, (state, action) => {
        state.isLoading = false
        // API 層已經處理了響應格式轉換，這裡直接使用
        const response = action.payload as PaginatedResponse<School>
        // 確保 data 是數組
        const schoolsData = Array.isArray(response?.data) ? response.data : []
        state.schools = schoolsData
        state.pagination = {
          page: response?.pagination?.page || 1,
          limit: response?.pagination?.limit || schoolsData.length,
          total: response?.pagination?.total || schoolsData.length,
          totalPages: response?.pagination?.totalPages || 1
        }
      })
      .addCase(fetchSchools.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || '獲取學校列表失敗'
      })
      // Fetch school by ID
      .addCase(fetchSchoolById.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchSchoolById.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentSchool = action.payload
      })
      .addCase(fetchSchoolById.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || '獲取學校詳情失敗'
      })
      // Create school
      .addCase(createSchool.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createSchool.fulfilled, (state, action) => {
        state.isLoading = false
        // 確保 payload 是有效的 School 對象且有 id
        const school = action.payload
        if (school && school.id) {
          state.schools.unshift(school)
        }
      })
      .addCase(createSchool.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || '創建學校失敗'
      })
      // Update school
      .addCase(updateSchool.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateSchool.fulfilled, (state, action) => {
        state.isLoading = false
        const index = state.schools.findIndex(school => school.id === action.payload.id)
        if (index !== -1) {
          state.schools[index] = action.payload
        }
        if (state.currentSchool?.id === action.payload.id) {
          state.currentSchool = action.payload
        }
      })
      .addCase(updateSchool.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || '更新學校失敗'
      })
      // Delete school
      .addCase(deleteSchool.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteSchool.fulfilled, (state, action) => {
        state.isLoading = false
        state.schools = state.schools.filter(school => school.id !== action.payload)
        if (state.currentSchool?.id === action.payload) {
          state.currentSchool = null
        }
      })
      .addCase(deleteSchool.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || '刪除學校失敗'
      })
  },
})

export const { clearError, clearCurrentSchool } = schoolsSlice.actions
export default schoolsSlice.reducer