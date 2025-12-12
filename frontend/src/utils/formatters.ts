import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-tw'

dayjs.extend(relativeTime)
dayjs.locale('zh-tw')

export const formatters = {
  // Date formatting
  formatDate: (date: string | Date, format: string = 'YYYY-MM-DD'): string => {
    return dayjs(date).format(format)
  },

  formatDateTime: (date: string | Date): string => {
    return dayjs(date).format('YYYY-MM-DD HH:mm')
  },

  formatRelativeTime: (date: string | Date): string => {
    return dayjs(date).fromNow()
  },

  // Enum formatting
  formatSchoolType: (type: string): string => {
    const typeMap: Record<string, string> = {
      high_school: '高中',
      university: '大學',
      vocational: '技職學校',
      other: '其他',
    }
    return typeMap[type] || type
  },

  formatRelationshipStatus: (status: string): string => {
    const statusMap: Record<string, string> = {
      potential: '潛在合作',
      active: '積極洽談',
      partnered: '正式合作',
      paused: '暫停合作',
    }
    return statusMap[status] || status
  },

  formatContactMethod: (method: string): string => {
    const methodMap: Record<string, string> = {
      email: '電子郵件',
      phone: '電話',
      visit: '實地拜訪',
      video_call: '視訊會議',
      other: '其他',
    }
    return methodMap[method] || method
  },

  formatMOUStatus: (status: string): string => {
    const statusMap: Record<string, string> = {
      none: '無',
      negotiating: '洽談中',
      signed: '已簽訂',
      expired: '已到期',
    }
    return statusMap[status] || status
  },

  // Number formatting
  formatNumber: (num: number): string => {
    return new Intl.NumberFormat('zh-TW').format(num)
  },

  formatCurrency: (amount: number, currency: string = 'TWD'): string => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency,
    }).format(amount)
  },

  // Text formatting
  truncateText: (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  },

  capitalizeFirst: (text: string): string => {
    return text.charAt(0).toUpperCase() + text.slice(1)
  },

  // File size formatting
  formatFileSize: (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  },

  // Phone number formatting
  formatPhoneNumber: (phone: string): string => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '')
    
    // Format based on length (assuming Taiwan phone numbers)
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3')
    } else if (cleaned.length === 9) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3')
    }
    
    return phone // Return original if can't format
  },

  // Email masking for privacy
  maskEmail: (email: string): string => {
    const [username, domain] = email.split('@')
    if (username.length <= 2) return email
    
    const maskedUsername = username.charAt(0) + '*'.repeat(username.length - 2) + username.charAt(username.length - 1)
    return `${maskedUsername}@${domain}`
  },
}