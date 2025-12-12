import { httpClient } from '../httpClient'
import { School, SearchFilters } from '@/types'

export const searchApi = {
  async searchSchools(params: {
    query?: string
    filters?: SearchFilters
    page?: number
    limit?: number
  }): Promise<School[]> {
    const queryParams = new URLSearchParams()
    
    if (params.query) queryParams.append('q', params.query)
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())
    
    // Add filters
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString())
      })
    }

    const url = `/search${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return httpClient.get<School[]>(url)
  },

  async getSearchSuggestions(query: string): Promise<string[]> {
    return httpClient.get<string[]>(`/search/suggestions?q=${encodeURIComponent(query)}`)
  },

  async getFilterOptions(): Promise<{
    countries: string[]
    regions: string[]
    schoolTypes: string[]
    relationshipStatuses: string[]
  }> {
    // 後端返回格式: { success: true, data: { countries, regions, schoolTypes, relationshipStatuses } }
    const response = await httpClient.get<any>('/search/filter-options')
    // 確保返回的數據格式正確
    return response?.data || {
      countries: [],
      regions: [],
      schoolTypes: [],
      relationshipStatuses: []
    }
  },

  async saveSearch(searchData: {
    name: string
    query?: string
    filters?: SearchFilters
  }): Promise<{ id: string; name: string }> {
    return httpClient.post<any>('/search/saved', searchData)
  },

  async getSavedSearches(): Promise<Array<{
    id: string
    name: string
    query?: string
    filters?: SearchFilters
    createdAt: string
  }>> {
    return httpClient.get<any>('/search/saved')
  },

  async deleteSavedSearch(id: string): Promise<void> {
    return httpClient.delete<void>(`/search/saved/${id}`)
  },
}