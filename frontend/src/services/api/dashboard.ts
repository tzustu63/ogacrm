import httpClient from '../httpClient'

export interface DashboardStats {
  totalSchools: number
  contactedSchools: number
  weeklyInteractions: {
    total: number
    byContact: Array<{
      tzuContact: string
      count: number
    }>
  }
  followUpSchools: Array<{
    schoolId: string
    schoolName: string
    followUpDate: string
    tzuContact: string
  }>
}

export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    const response = await httpClient.get<{ success: boolean; data: DashboardStats }>('/dashboard/stats')
    return response.data || response
  },
}

