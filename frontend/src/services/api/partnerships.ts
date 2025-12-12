import { httpClient } from '../httpClient'
import { Partnership, UpdatePartnershipData } from '@/types'

export const partnershipsApi = {
  async getPartnerships(): Promise<Partnership[]> {
    return httpClient.get<Partnership[]>('/partnerships')
  },

  async getPartnershipBySchoolId(schoolId: string): Promise<Partnership> {
    return httpClient.get<Partnership>(`/schools/${schoolId}/partnership`)
  },

  async updatePartnership(schoolId: string, data: UpdatePartnershipData): Promise<Partnership> {
    return httpClient.put<Partnership>(`/schools/${schoolId}/partnership`, data)
  },

  async getExpiringMOUs(days: number = 30): Promise<Partnership[]> {
    return httpClient.get<Partnership[]>(`/partnerships/expiring?days=${days}`)
  },

  async recordReferral(schoolId: string, count: number = 1): Promise<Partnership> {
    return httpClient.post<Partnership>(`/schools/${schoolId}/partnership/referral`, { count })
  },

  async recordEvent(schoolId: string, eventData: {
    eventType: string
    eventDate: string
    notes?: string
  }): Promise<Partnership> {
    return httpClient.post<Partnership>(`/schools/${schoolId}/partnership/event`, eventData)
  },

  async getPartnershipStats(): Promise<{
    totalPartnerships: number
    signedMOUs: number
    expiringMOUs: number
    totalReferrals: number
    totalEvents: number
  }> {
    return httpClient.get<any>('/partnerships/stats')
  },
}