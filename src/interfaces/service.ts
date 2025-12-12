import { ApiResponse, PaginatedResponse, SearchCriteria } from '../types';

export interface BaseService<T, CreateData, UpdateData> {
  create(data: CreateData): Promise<ApiResponse<T>>;
  getById(id: string): Promise<ApiResponse<T>>;
  getAll(criteria?: SearchCriteria): Promise<PaginatedResponse<T>>;
  update(id: string, data: UpdateData): Promise<ApiResponse<T>>;
  delete(id: string): Promise<ApiResponse<boolean>>;
}

export interface SearchService<T> {
  search(criteria: SearchCriteria): Promise<PaginatedResponse<T>>;
  buildSearchQuery(criteria: SearchCriteria): { query: string; params: any[] };
}

export interface ValidationService {
  validateCreate<T>(data: any): Promise<{ isValid: boolean; error?: string; value?: T }>;
  validateUpdate<T>(data: any): Promise<{ isValid: boolean; error?: string; value?: T }>;
  validateId(id: string): boolean;
}