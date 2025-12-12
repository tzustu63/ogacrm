import { httpClient } from '../httpClient'
import { Contact, CreateContactData, UpdateContactData } from '../../types'

export const contactsApi = {
  async getContacts(schoolId?: string): Promise<Contact[]> {
    const url = schoolId ? `/schools/${schoolId}/contacts` : '/contacts'
    // 後端返回格式: { success: true, data: [...], pagination: {...} }
    const response = await httpClient.get<any>(url)
    // 確保返回數組
    return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : [])
  },

  async getContactById(id: string): Promise<Contact> {
    // 後端返回格式: { success: true, data: {...} }
    const response = await httpClient.get<any>(`/contacts/${id}`)
    return response?.data || response
  },

  async createContact(data: CreateContactData): Promise<Contact> {
    // 後端返回格式: { success: true, data: {...} }
    // 使用 /api/contacts 路由，因為後端的 POST 路由在這裡
    const response = await httpClient.post<any>('/contacts', data)
    return response?.data || response
  },

  async updateContact(id: string, data: UpdateContactData): Promise<Contact> {
    // 後端返回格式: { success: true, data: {...} }
    const response = await httpClient.put<any>(`/contacts/${id}`, data)
    return response?.data || response
  },

  async deleteContact(id: string): Promise<void> {
    return httpClient.delete<void>(`/contacts/${id}`)
  },

  async setPrimaryContact(schoolId: string, contactId: string): Promise<Contact> {
    // 後端返回格式: { success: true, data: {...} }
    const response = await httpClient.patch<any>(`/schools/${schoolId}/contacts/${contactId}/primary`)
    return response?.data || response
  },

  async bulkCreateContacts(schoolId: string, contacts: Omit<CreateContactData, 'schoolId'>[]): Promise<Contact[]> {
    // 後端返回格式: { success: true, data: [...] }
    const response = await httpClient.post<any>(`/schools/${schoolId}/contacts/bulk`, { contacts })
    return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : [])
  },
}