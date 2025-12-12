import { httpClient } from '../httpClient'
import { Interaction, CreateInteractionData, UpdateInteractionData } from '../../types'

export const interactionsApi = {
  async getSchoolsWithInteractions(): Promise<Array<{ id: string; name: string; country: string; region: string }>> {
    // 添加時間戳參數避免瀏覽器緩存
    const response = await httpClient.get<{ success: boolean; data: Array<{ id: string; name: string; country: string; region: string }>; message?: string }>(`/interactions/schools?_t=${Date.now()}`)
    // 後端返回格式: { success: true, data: [...] }
    // httpClient.get 已經返回 response.data，所以這裡 response 就是 { success: true, data: [...] }
    if (response && response.success && Array.isArray(response.data)) {
      return response.data
    }
    // 兼容其他可能的格式
    if (response && Array.isArray(response)) {
      return response
    }
    if (response && 'data' in response && Array.isArray((response as any).data)) {
      return (response as any).data
    }
    return []
  },

  async getInteractions(schoolId?: string): Promise<Interaction[]> {
    const url = schoolId ? `/schools/${schoolId}/interactions` : '/interactions'
    // 後端返回格式: { success: true, data: [...], pagination: {...} }
    const response = await httpClient.get<any>(url)
    // 確保返回數組
    return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : [])
  },

  async getInteractionById(id: string): Promise<Interaction> {
    // 後端返回格式: { success: true, data: {...} }
    const response = await httpClient.get<any>(`/interactions/${id}`)
    return response?.data || response
  },

  async createInteraction(data: CreateInteractionData): Promise<Interaction> {
    // 後端返回格式: { success: true, data: {...} }
    // 可以使用 /api/interactions 或 /api/schools/:schoolId/interactions
    // 這裡使用 /api/interactions，因為後端的 POST 路由在這裡
    const response = await httpClient.post<any>('/interactions', data)
    return response?.data || response
  },

  async updateInteraction(id: string, data: UpdateInteractionData): Promise<Interaction> {
    // 後端返回格式: { success: true, data: {...} }
    const response = await httpClient.put<any>(`/interactions/${id}`, data)
    return response?.data || response
  },

  async deleteInteraction(id: string): Promise<void> {
    return httpClient.delete<void>(`/interactions/${id}`)
  },

  async getInteractionStats(schoolId?: string): Promise<{
    totalInteractions: number
    interactionsByMethod: Record<string, number>
    recentInteractions: Interaction[]
    followUpRequired: number
  }> {
    const url = schoolId ? `/schools/${schoolId}/interactions/stats` : '/interactions/stats'
    return httpClient.get<any>(url)
  },

  async markFollowUpComplete(id: string): Promise<Interaction> {
    return httpClient.patch<Interaction>(`/interactions/${id}/follow-up-complete`)
  },
}