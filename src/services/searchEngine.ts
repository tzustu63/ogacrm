import { Pool } from 'pg';
import { School, Contact, Interaction, SearchCriteria, SchoolType, RelationshipStatus, MOUStatus } from '../types';
import { SchoolRepository } from '../repositories/schoolRepository';
import { ContactRepository } from '../repositories/contactRepository';
import { InteractionRepository } from '../repositories/interactionRepository';

export interface SearchResult {
  schools: School[];
  totalCount: number;
}

export interface FilterOptions {
  country?: string;
  region?: string;
  schoolType?: SchoolType;
  relationshipStatus?: RelationshipStatus;
  mouStatus?: MOUStatus;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface ExportFormat {
  format: 'csv' | 'json' | 'excel';
  fields?: string[];
}

export class SearchEngine {
  private pool: Pool;
  private schoolRepository: SchoolRepository;
  private contactRepository: ContactRepository;
  private interactionRepository: InteractionRepository;

  constructor(pool: Pool) {
    this.pool = pool;
    this.schoolRepository = new SchoolRepository(pool);
    this.contactRepository = new ContactRepository(pool);
    this.interactionRepository = new InteractionRepository(pool);
  }

  /**
   * Execute comprehensive search across schools, contacts, and interactions
   */
  async search(
    query?: string,
    filters?: FilterOptions,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<SearchResult> {
    const criteria: SearchCriteria = {};
    
    if (query) {
      criteria.query = query;
    }
    
    if (filters) {
      criteria.filters = {
        ...(filters.country && { country: filters.country }),
        ...(filters.region && { region: filters.region }),
        ...(filters.schoolType && { schoolType: filters.schoolType }),
        ...(filters.relationshipStatus && { relationshipStatus: filters.relationshipStatus }),
        ...(filters.mouStatus && { mouStatus: filters.mouStatus })
      };
    }
    
    if (sort) {
      criteria.sort = sort;
    }
    
    if (pagination) {
      criteria.pagination = pagination;
    }

    // If query is provided, search across multiple entities
    if (query && query.trim()) {
      return this.performFullTextSearch(criteria);
    }

    // Otherwise, just filter schools
    return this.performFilteredSearch(criteria);
  }

  /**
   * Build filter criteria from filter options
   */
  buildFilterCriteria(filterOptions: FilterOptions): SearchCriteria {
    const criteria: SearchCriteria = {};
    
    const filters: any = {};
    if (filterOptions.country) filters.country = filterOptions.country;
    if (filterOptions.region) filters.region = filterOptions.region;
    if (filterOptions.schoolType) filters.schoolType = filterOptions.schoolType;
    if (filterOptions.relationshipStatus) filters.relationshipStatus = filterOptions.relationshipStatus;
    if (filterOptions.mouStatus) filters.mouStatus = filterOptions.mouStatus;
    
    if (Object.keys(filters).length > 0) {
      criteria.filters = filters;
    }
    
    return criteria;
  }

  /**
   * Export search results in specified format
   */
  async exportResults(
    schools: School[],
    format: ExportFormat
  ): Promise<string | object> {
    switch (format.format) {
      case 'json':
        return this.exportToJson(schools, format.fields);
      case 'csv':
        return this.exportToCsv(schools, format.fields);
      case 'excel':
        // For now, return CSV format for Excel compatibility
        return this.exportToCsv(schools, format.fields);
      default:
        throw new Error(`Unsupported export format: ${format.format}`);
    }
  }

  /**
   * Clear all filters and return all schools
   */
  async clearFilters(
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<SearchResult> {
    const criteria: SearchCriteria = {};
    
    if (sort) {
      criteria.sort = sort;
    }
    
    if (pagination) {
      criteria.pagination = pagination;
    }

    const schools = await this.schoolRepository.search(criteria);
    const totalCount = await this.schoolRepository.countByFilters();

    return {
      schools,
      totalCount
    };
  }

  /**
   * Perform full-text search across schools, contacts, and interaction notes
   */
  private async performFullTextSearch(criteria: SearchCriteria): Promise<SearchResult> {
    const query = criteria.query!.trim();
    
    // Search in schools
    const schoolResults = await this.searchInSchools(query, criteria.filters);
    
    // Search in contacts and get associated school IDs
    const contactSchoolIds = await this.searchInContacts(query);
    
    // Search in interaction notes and get associated school IDs
    const interactionSchoolIds = await this.searchInInteractions(query);
    
    // Combine all school IDs
    const allSchoolIds = new Set([
      ...schoolResults.map(s => s.id),
      ...contactSchoolIds,
      ...interactionSchoolIds
    ]);

    // Get all unique schools
    let combinedSchools: School[] = [];
    if (allSchoolIds.size > 0) {
      combinedSchools = await this.getSchoolsByIds(Array.from(allSchoolIds), criteria.filters);
    }

    // Apply sorting
    if (criteria.sort) {
      combinedSchools = this.sortSchools(combinedSchools, criteria.sort);
    } else {
      // Default sort by name
      combinedSchools.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Apply pagination
    const totalCount = combinedSchools.length;
    if (criteria.pagination) {
      const { page, limit } = criteria.pagination;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      combinedSchools = combinedSchools.slice(startIndex, endIndex);
    }

    return {
      schools: combinedSchools,
      totalCount
    };
  }

  /**
   * Perform filtered search (no text query)
   */
  private async performFilteredSearch(criteria: SearchCriteria): Promise<SearchResult> {
    const schools = await this.schoolRepository.search(criteria);
    const totalCount = await this.schoolRepository.countByFilters(criteria.filters);

    return {
      schools,
      totalCount
    };
  }

  /**
   * Search within schools table
   */
  private async searchInSchools(query: string, filters?: FilterOptions): Promise<School[]> {
    const searchCriteria: SearchCriteria = {
      query
    };
    
    if (filters) {
      const criteriaFilters: any = {};
      if (filters.country) criteriaFilters.country = filters.country;
      if (filters.region) criteriaFilters.region = filters.region;
      if (filters.schoolType) criteriaFilters.schoolType = filters.schoolType;
      if (filters.relationshipStatus) criteriaFilters.relationshipStatus = filters.relationshipStatus;
      if (filters.mouStatus) criteriaFilters.mouStatus = filters.mouStatus;
      
      if (Object.keys(criteriaFilters).length > 0) {
        searchCriteria.filters = criteriaFilters;
      }
    }
    
    return this.schoolRepository.search(searchCriteria);
  }

  /**
   * Search within contacts and return associated school IDs
   */
  private async searchInContacts(query: string): Promise<string[]> {
    const client = await this.pool.connect();
    try {
      const searchQuery = `
        SELECT DISTINCT school_id 
        FROM contacts 
        WHERE name ILIKE $1 OR email ILIKE $1 OR position ILIKE $1
      `;
      const searchTerm = `%${query}%`;
      const result = await client.query(searchQuery, [searchTerm]);
      return result.rows.map(row => row.school_id);
    } finally {
      client.release();
    }
  }

  /**
   * Search within interaction notes and return associated school IDs
   */
  private async searchInInteractions(query: string): Promise<string[]> {
    const client = await this.pool.connect();
    try {
      const searchQuery = `
        SELECT DISTINCT school_id 
        FROM interactions 
        WHERE notes ILIKE $1
      `;
      const searchTerm = `%${query}%`;
      const result = await client.query(searchQuery, [searchTerm]);
      return result.rows.map(row => row.school_id);
    } finally {
      client.release();
    }
  }

  /**
   * Get schools by IDs with optional filters
   */
  private async getSchoolsByIds(schoolIds: string[], filters?: FilterOptions): Promise<School[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT id, name, country, region, school_type as "schoolType", website,
               relationship_status as "relationshipStatus", created_at as "createdAt",
               updated_at as "updatedAt"
        FROM schools 
        WHERE id = ANY($1)
      `;
      
      const params: any[] = [schoolIds];
      let paramIndex = 2;

      // Apply additional filters
      if (filters) {
        if (filters.country) {
          query += ` AND country = $${paramIndex++}`;
          params.push(filters.country);
        }
        
        if (filters.region) {
          query += ` AND region = $${paramIndex++}`;
          params.push(filters.region);
        }
        
        if (filters.schoolType) {
          query += ` AND school_type = $${paramIndex++}`;
          params.push(filters.schoolType);
        }
        
        if (filters.relationshipStatus) {
          query += ` AND relationship_status = $${paramIndex++}`;
          params.push(filters.relationshipStatus);
        }
      }

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Sort schools array
   */
  private sortSchools(schools: School[], sort: SortOptions): School[] {
    return schools.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sort.field) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'country':
          aValue = a.country;
          bValue = b.country;
          break;
        case 'region':
          aValue = a.region;
          bValue = b.region;
          break;
        case 'schoolType':
          aValue = a.schoolType;
          bValue = b.schoolType;
          break;
        case 'relationshipStatus':
          aValue = a.relationshipStatus;
          bValue = b.relationshipStatus;
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'updatedAt':
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sort.order === 'desc' ? -comparison : comparison;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        const comparison = aValue.getTime() - bValue.getTime();
        return sort.order === 'desc' ? -comparison : comparison;
      }

      // Fallback comparison
      if (aValue < bValue) return sort.order === 'desc' ? 1 : -1;
      if (aValue > bValue) return sort.order === 'desc' ? -1 : 1;
      return 0;
    });
  }

  /**
   * Export schools to JSON format
   */
  private exportToJson(schools: School[], fields?: string[]): object {
    if (!fields || fields.length === 0) {
      return { schools };
    }

    const filteredSchools = schools.map(school => {
      const filtered: any = {};
      fields.forEach(field => {
        if (field in school) {
          filtered[field] = (school as any)[field];
        }
      });
      return filtered;
    });

    return { schools: filteredSchools };
  }

  /**
   * Export schools to CSV format
   */
  private exportToCsv(schools: School[], fields?: string[]): string {
    if (schools.length === 0) {
      return '';
    }

    const selectedFields = fields && fields.length > 0 
      ? fields 
      : ['id', 'name', 'country', 'region', 'schoolType', 'website', 'relationshipStatus', 'createdAt', 'updatedAt'];

    // Create header
    const header = selectedFields.join(',');
    
    // Create rows
    const rows = schools.map(school => {
      return selectedFields.map(field => {
        const value = (school as any)[field];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape commas and quotes in CSV
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });

    return [header, ...rows].join('\n');
  }
}