// Enums
export enum SchoolType {
  HIGH_SCHOOL = 'high_school',
  TECHNICAL_COLLEGE = 'technical_college',
  UNIVERSITY = 'university',
  VOCATIONAL = 'vocational',
  OTHER = 'other'
}

export enum RelationshipStatus {
  NO_RESPONSE = 'no_response',
  RESPONDED = 'responded',
  HAS_ALUMNI = 'has_alumni',
  POTENTIAL = 'potential',
  ACTIVE = 'active',
  PARTNERED = 'partnered',
  PAUSED = 'paused'
}

export enum SchoolOwnership {
  PUBLIC = 'public',
  PRIVATE = 'private'
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

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  RECRUITER = 'recruiter',
  VIEWER = 'viewer'
}

// Core Data Models
export interface School {
  id: string;
  name: string;
  country: string;
  region: string;
  schoolType: SchoolType;
  website?: string;
  facebook?: string;
  instagram?: string;
  email?: string;
  ownership?: SchoolOwnership;
  hasMOU?: boolean;
  notes?: string;
  relationshipStatus: RelationshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Interaction {
  id: string;
  schoolId: string;
  contactMethod: ContactMethod;
  date: Date;
  notes: string;
  followUpRequired: boolean;
  followUpDate?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface Partnership {
  id: string;
  schoolId: string;
  mouStatus: MOUStatus;
  mouSignedDate?: Date;
  mouExpiryDate?: Date;
  referralCount: number;
  eventsHeld: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Preference {
  id: string;
  schoolId: string;
  preferredContactMethod: ContactMethod;
  programsOfInterest: string[];
  bestContactTime: string;
  timezone: string;
  specialRequirements?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp?: string | Date;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication and Authorization Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessLog {
  id: string;
  userId?: string;
  action: string;
  resource?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

export interface UserSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
  expiresAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

// Search and Filter Types
export interface SearchCriteria {
  query?: string;
  filters?: {
    country?: string;
    region?: string;
    schoolType?: SchoolType;
    relationshipStatus?: RelationshipStatus;
    mouStatus?: MOUStatus;
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
}