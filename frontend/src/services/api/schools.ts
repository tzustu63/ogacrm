import { httpClient } from '../httpClient'
import { 
  School, 
  CreateSchoolData, 
  UpdateSchoolData, 
  PaginatedResponse 
} from '../../types'

export const schoolsApi = {
  async getSchools(params?: { 
    page?: number
    limit?: number
    search?: string
    country?: string
    region?: string
    schoolType?: string
    relationshipStatus?: string
    ownership?: string
    hasMOU?: boolean
  }): Promise<PaginatedResponse<School>> {
    const queryParams = new URLSearchParams()
    
    if (params?.page) queryParams.append('page', params.page.toString())
    // 限制最大 limit 為 1000，避免超過後端限制
    if (params?.limit) queryParams.append('limit', Math.min(params.limit, 1000).toString())
    if (params?.search) queryParams.append('query', params.search)
    if (params?.country) queryParams.append('country', params.country)
    if (params?.region) queryParams.append('region', params.region)
    if (params?.schoolType) queryParams.append('schoolType', params.schoolType)
    if (params?.relationshipStatus) queryParams.append('relationshipStatus', params.relationshipStatus)
    if (params?.ownership) queryParams.append('ownership', params.ownership)
    if (params?.hasMOU !== undefined) queryParams.append('hasMOU', params.hasMOU.toString())

    const url = `/schools${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    // 後端返回格式: { success: true, data: [...], pagination: {...} }
    const response = await httpClient.get<any>(url)
    // 確保 data 是數組
    const schoolsData = Array.isArray(response?.data) ? response.data : []
    // 轉換為前端期望的格式
    return {
      data: schoolsData,
      pagination: response?.pagination || {
        page: response?.pagination?.currentPage || 1,
        limit: response?.pagination?.limit || schoolsData.length,
        total: response?.pagination?.totalCount || response?.pagination?.total || schoolsData.length,
        totalPages: response?.pagination?.totalPages || 1
      }
    }
  },

  async getSchoolById(id: string): Promise<School> {
    // 後端返回格式: { success: true, data: {...} }
    const response = await httpClient.get<any>(`/schools/${id}`)
    return response?.data || response
  },

  async createSchool(data: CreateSchoolData): Promise<School> {
    // 後端返回格式: { success: true, data: {...} }
    const response = await httpClient.post<any>('/schools', data)
    return response?.data || response
  },

  async updateSchool(id: string, data: UpdateSchoolData): Promise<School> {
    // 後端返回格式: { success: true, data: {...} }
    const response = await httpClient.put<any>(`/schools/${id}`, data)
    return response?.data || response
  },

  async deleteSchool(id: string): Promise<void> {
    return httpClient.delete<void>(`/schools/${id}`)
  },

  async getSchoolStats(id: string): Promise<{
    totalContacts: number
    totalInteractions: number
    lastInteractionDate?: string
    partnershipStatus: string
  }> {
    // 後端返回格式: { success: true, data: {...} }
    const response = await httpClient.get<any>(`/schools/${id}/stats`)
    return response?.data || response
  },
}