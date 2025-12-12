import axios from 'axios'

export const exportApi = {
  async exportSchools(params: {
    format: 'csv' | 'excel' | 'json'
    filters?: Record<string, any>
    fields?: string[]
  }): Promise<Blob> {
    const token = localStorage.getItem('token')
    const response = await axios.post('/api/export/schools', {
      format: params.format || 'excel',
      ...params.filters,
      fields: params.fields
    }, {
      responseType: 'blob',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      }
    })
    return response.data as Blob
  },

  async exportContacts(params: {
    format: 'csv' | 'excel' | 'json'
    schoolId?: string
    fields?: string[]
  }): Promise<Blob> {
    const token = localStorage.getItem('token')
    const response = await axios.post('/api/export/contacts', params, {
      responseType: 'blob',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      }
    })
    return response.data as Blob
  },

  async exportInteractions(params: {
    format: 'csv' | 'excel' | 'json'
    schoolId?: string
    dateRange?: {
      startDate: string
      endDate: string
    }
    fields?: string[]
  }): Promise<Blob> {
    const token = localStorage.getItem('token')
    const response = await axios.post('/api/export/interactions', params, {
      responseType: 'blob',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      }
    })
    return response.data as Blob
  },

  async getExportHistory(): Promise<Array<{
    id: string
    type: string
    format: string
    status: 'pending' | 'completed' | 'failed'
    createdAt: string
    downloadUrl?: string
  }>> {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/export/history', {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      }
    })
    return response.data
  },

  async downloadExport(id: string): Promise<Blob> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`/api/export/download/${id}`, {
      responseType: 'blob',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      }
    })
    return response.data as Blob
  },
}