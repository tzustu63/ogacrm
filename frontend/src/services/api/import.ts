import axios from 'axios'

export interface ImportResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    schoolName?: string
    error: string
  }>
  imported: Array<{
    id: string
    name: string
  }>
}

export const importApi = {
  async importSchools(file: File, options?: { skipErrors?: boolean; updateExisting?: boolean }): Promise<ImportResult> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (options?.skipErrors) {
      formData.append('skipErrors', 'true')
    }
    
    if (options?.updateExisting) {
      formData.append('updateExisting', 'true')
    }

    const token = localStorage.getItem('token')
    
    const response = await axios.post('/api/import/schools', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token && { Authorization: `Bearer ${token}` })
      },
    })
    
    return response.data?.data || response.data || response
  },

  async downloadTemplate(): Promise<Blob> {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/import/template', {
      responseType: 'blob',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      }
    })
    return response.data as Blob
  },
}
