// Enums
export enum SchoolType {
  HIGH_SCHOOL = 'high_school', // 高中
  TECHNICAL_COLLEGE = 'technical_college', // 技術學院
  UNIVERSITY = 'university', // 大學
  VOCATIONAL = 'vocational', // 技職學校
  OTHER = 'other'
}

export enum RelationshipStatus {
  NO_RESPONSE = 'no_response', // 無回應
  RESPONDED = 'responded', // 有回應
  HAS_ALUMNI = 'has_alumni' // 有校友
}

export enum SchoolOwnership {
  PUBLIC = 'public', // 公立
  PRIVATE = 'private' // 私立
}

export enum ContactMethod {
  EMAIL = 'email',
  PHONE = 'phone',
  VISIT = 'visit',
  VIDEO_CALL = 'video_call',
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  WHATSAPP = 'whatsapp',
  MEETING = 'meeting',
  OTHER = 'other'
}

export enum MOUStatus {
  NONE = 'none',
  NEGOTIATING = 'negotiating',
  SIGNED = 'signed',
  EXPIRED = 'expired'
}

// Core interfaces
export interface School {
  id: string
  name: string
  country: string
  region: string
  schoolType: SchoolType
  website?: string
  facebook?: string
  instagram?: string
  email?: string
  ownership?: SchoolOwnership
  hasMOU?: boolean
  notes?: string
  relationshipStatus: RelationshipStatus
  createdAt: string
  updatedAt: string
}

export interface Contact {
  id: string
  schoolId: string
  name: string
  email: string
  phone?: string
  position?: string
  organization?: string
  facebook?: string
  instagram?: string
  whatsapp?: string
  notes?: string
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export interface Interaction {
  id: string
  schoolId: string
  contactId?: string
  subject?: string
  contactMethod: ContactMethod
  date: string
  notes: string
  tzuContact?: string
  followUpRequired: boolean
  followUpDate?: string
  followUpReport?: string
  createdBy: string
  createdAt: string
}

export interface Partnership {
  id: string
  schoolId: string
  mouStatus: MOUStatus
  mouSignedDate?: string
  mouExpiryDate?: string
  referralCount: number
  eventsHeld: number
  createdAt: string
  updatedAt: string
}

export interface Preference {
  id: string
  schoolId: string
  preferredContactMethod: ContactMethod
  programsOfInterest: string[]
  bestContactTime: string
  timezone: string
  specialRequirements?: string
  createdAt: string
  updatedAt: string
}

// Create/Update data types
export interface CreateSchoolData {
  name: string
  country: string
  region: string
  schoolType: SchoolType
  website?: string
  facebook?: string
  instagram?: string
  email?: string
  ownership?: SchoolOwnership
  hasMOU?: boolean
  notes?: string
  relationshipStatus: RelationshipStatus
}

export interface UpdateSchoolData extends Partial<CreateSchoolData> {}

export interface CreateContactData {
  schoolId: string
  name: string
  email: string
  phone?: string
  position?: string
  organization?: string
  facebook?: string
  instagram?: string
  whatsapp?: string
  notes?: string
  isPrimary: boolean
}

export interface UpdateContactData extends Partial<Omit<CreateContactData, 'schoolId'>> {}

export interface CreateInteractionData {
  schoolId: string
  contactId?: string
  subject: string
  contactMethod: ContactMethod
  date: string
  notes: string
  tzuContact: string
  followUpRequired: boolean
  followUpDate?: string
  followUpReport?: string
}

export interface UpdateInteractionData extends Partial<Omit<CreateInteractionData, 'schoolId'>> {}

export interface UpdatePartnershipData {
  mouStatus?: MOUStatus
  mouSignedDate?: string
  mouExpiryDate?: string
  referralCount?: number
  eventsHeld?: number
}

export interface CreatePreferenceData {
  schoolId: string
  preferredContactMethod: ContactMethod
  programsOfInterest: string[]
  bestContactTime: string
  timezone: string
  specialRequirements?: string
}

export interface UpdatePreferenceData extends Partial<Omit<CreatePreferenceData, 'schoolId'>> {}

// Search and filter types
export interface SearchFilters {
  country?: string
  region?: string
  schoolType?: SchoolType
  relationshipStatus?: RelationshipStatus
  mouStatus?: MOUStatus
  ownership?: SchoolOwnership
  hasMOU?: boolean
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
  token: string
}

// Form validation types
export interface ValidationError {
  field: string
  message: string
}

export interface FormErrors {
  [key: string]: string
}