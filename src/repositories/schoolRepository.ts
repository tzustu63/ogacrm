import { Pool } from 'pg';
import { AbstractRepository } from '../interfaces/repository';
import { School, SchoolType, RelationshipStatus, SearchCriteria } from '../types';
import { validateEmail } from '../utils/validation';

export interface CreateSchoolData {
  name: string;
  country: string;
  region: string;
  schoolType: SchoolType;
  website?: string | undefined;
  facebook?: string | undefined;
  instagram?: string | undefined;
  email?: string | undefined;
  ownership?: string | undefined; // 'public' | 'private'
  hasMOU?: boolean | undefined;
  notes?: string | undefined;
  relationshipStatus?: RelationshipStatus | undefined;
}

export interface UpdateSchoolData {
  name?: string | undefined;
  country?: string | undefined;
  region?: string | undefined;
  schoolType?: SchoolType | undefined;
  website?: string | undefined;
  facebook?: string | undefined;
  instagram?: string | undefined;
  email?: string | undefined;
  ownership?: string | undefined; // 'public' | 'private'
  hasMOU?: boolean | undefined;
  notes?: string | undefined;
  relationshipStatus?: RelationshipStatus | undefined;
}

export interface SchoolFilters {
  country?: string;
  region?: string;
  schoolType?: SchoolType;
  relationshipStatus?: RelationshipStatus;
  query?: string;
}

export class SchoolRepository extends AbstractRepository<School, CreateSchoolData, UpdateSchoolData> {
  constructor(pool: Pool) {
    super(pool, 'schools');
  }

  async create(data: CreateSchoolData): Promise<School> {
    // Clean up URL fields before validation
    const cleanedData = { ...data };
    if (cleanedData.website) cleanedData.website = cleanedData.website.trim().replace(/\s+/g, '');
    if (cleanedData.facebook) cleanedData.facebook = cleanedData.facebook.trim().replace(/\s+/g, '');
    if (cleanedData.instagram) cleanedData.instagram = cleanedData.instagram.trim().replace(/\s+/g, '');
    
    this.validateSchoolData(cleanedData);
    
    const query = `
      INSERT INTO schools (name, country, region, school_type, website, facebook, instagram, 
                          email, ownership, has_mou, notes, relationship_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, name, country, region, school_type as "schoolType", website, 
                facebook, instagram, email, ownership, 
                has_mou as "hasMOU", notes, relationship_status as "relationshipStatus", 
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    const params = [
      cleanedData.name,
      cleanedData.country,
      cleanedData.region,
      cleanedData.schoolType,
      cleanedData.website || null,
      cleanedData.facebook || null,
      cleanedData.instagram || null,
      cleanedData.email || null,
      cleanedData.ownership || null,
      cleanedData.hasMOU !== undefined ? cleanedData.hasMOU : null,
      cleanedData.notes || null,
      cleanedData.relationshipStatus || RelationshipStatus.NO_RESPONSE
    ];

    const result = await this.executeQuerySingle<School>(query, params);
    if (!result) {
      throw new Error('Failed to create school record');
    }
    
    return result;
  }

  async findById(id: string): Promise<School | null> {
    const query = `
      SELECT id, name, country, region, school_type as "schoolType", website,
             facebook, instagram, email, ownership,
             has_mou as "hasMOU", notes, relationship_status as "relationshipStatus", 
             created_at as "createdAt", updated_at as "updatedAt"
      FROM schools 
      WHERE id = $1
    `;
    
    return this.executeQuerySingle<School>(query, [id]);
  }

  async findAll(filters?: SchoolFilters): Promise<School[]> {
    let query = `
      SELECT id, name, country, region, school_type as "schoolType", website,
             facebook, instagram, email, ownership,
             has_mou as "hasMOU", notes, relationship_status as "relationshipStatus", 
             created_at as "createdAt", updated_at as "updatedAt"
      FROM schools
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      if (filters.country) {
        conditions.push(`country = $${paramIndex++}`);
        params.push(filters.country);
      }
      
      if (filters.region) {
        conditions.push(`region = $${paramIndex++}`);
        params.push(filters.region);
      }
      
      if (filters.schoolType) {
        conditions.push(`school_type = $${paramIndex++}`);
        params.push(filters.schoolType);
      }
      
      if (filters.relationshipStatus) {
        conditions.push(`relationship_status = $${paramIndex++}`);
        params.push(filters.relationshipStatus);
      }
      
      if (filters.query) {
        conditions.push(`(name ILIKE $${paramIndex++} OR country ILIKE $${paramIndex++} OR region ILIKE $${paramIndex++})`);
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm, searchTerm);
        paramIndex += 2; // We added 3 params but incremented once already
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY name ASC';

    return this.executeQuery<School>(query, params);
  }

  async update(id: string, data: UpdateSchoolData): Promise<School | null> {
    if (Object.keys(data).length === 0) {
      return this.findById(id);
    }

    // Clean up URL fields before validation
    const cleanedData = { ...data };
    if (cleanedData.website) cleanedData.website = cleanedData.website.trim().replace(/\s+/g, '');
    if (cleanedData.facebook) cleanedData.facebook = cleanedData.facebook.trim().replace(/\s+/g, '');
    if (cleanedData.instagram) cleanedData.instagram = cleanedData.instagram.trim().replace(/\s+/g, '');

    this.validateSchoolUpdateData(cleanedData);

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (cleanedData.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      params.push(cleanedData.name);
    }
    
    if (cleanedData.country !== undefined) {
      updateFields.push(`country = $${paramIndex++}`);
      params.push(cleanedData.country);
    }
    
    if (cleanedData.region !== undefined) {
      updateFields.push(`region = $${paramIndex++}`);
      params.push(cleanedData.region);
    }
    
    if (cleanedData.schoolType !== undefined) {
      updateFields.push(`school_type = $${paramIndex++}`);
      params.push(cleanedData.schoolType);
    }
    
    if (cleanedData.website !== undefined) {
      updateFields.push(`website = $${paramIndex++}`);
      params.push(cleanedData.website);
    }
    
    if (cleanedData.relationshipStatus !== undefined) {
      updateFields.push(`relationship_status = $${paramIndex++}`);
      params.push(cleanedData.relationshipStatus);
    }
    
    if (cleanedData.facebook !== undefined) {
      updateFields.push(`facebook = $${paramIndex++}`);
      params.push(cleanedData.facebook);
    }
    
    if (cleanedData.instagram !== undefined) {
      updateFields.push(`instagram = $${paramIndex++}`);
      params.push(cleanedData.instagram);
    }
    
    if (cleanedData.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      params.push(cleanedData.email);
    }
    
    if (cleanedData.ownership !== undefined) {
      updateFields.push(`ownership = $${paramIndex++}`);
      params.push(cleanedData.ownership);
    }
    
    if (cleanedData.hasMOU !== undefined) {
      updateFields.push(`has_mou = $${paramIndex++}`);
      params.push(cleanedData.hasMOU);
    }
    
    if (cleanedData.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      params.push(cleanedData.notes);
    }

    const query = `
      UPDATE schools 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, name, country, region, school_type as "schoolType", website,
                facebook, instagram, email, ownership,
                has_mou as "hasMOU", notes, relationship_status as "relationshipStatus", 
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    params.push(id);

    return this.executeQuerySingle<School>(query, params);
  }

  async search(criteria: SearchCriteria): Promise<School[]> {
    let query = `
      SELECT id, name, country, region, school_type as "schoolType", website,
             relationship_status as "relationshipStatus", created_at as "createdAt",
             updated_at as "updatedAt"
      FROM schools
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Handle text search
    if (criteria.query) {
      conditions.push(`(
        name ILIKE $${paramIndex++} OR 
        country ILIKE $${paramIndex++} OR 
        region ILIKE $${paramIndex++}
      )`);
      const searchTerm = `%${criteria.query}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      paramIndex += 2; // We added 3 params but incremented once already
    }

    // Handle filters
    if (criteria.filters) {
      if (criteria.filters.country) {
        conditions.push(`country = $${paramIndex++}`);
        params.push(criteria.filters.country);
      }
      
      if (criteria.filters.region) {
        conditions.push(`region = $${paramIndex++}`);
        params.push(criteria.filters.region);
      }
      
      if (criteria.filters.schoolType) {
        conditions.push(`school_type = $${paramIndex++}`);
        params.push(criteria.filters.schoolType);
      }
      
      if (criteria.filters.relationshipStatus) {
        conditions.push(`relationship_status = $${paramIndex++}`);
        params.push(criteria.filters.relationshipStatus);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Handle sorting
    if (criteria.sort) {
      const sortField = this.mapSortField(criteria.sort.field);
      const sortOrder = criteria.sort.order === 'desc' ? 'DESC' : 'ASC';
      query += ` ORDER BY ${sortField} ${sortOrder}`;
    } else {
      query += ' ORDER BY name ASC';
    }

    // Handle pagination
    if (criteria.pagination) {
      const offset = (criteria.pagination.page - 1) * criteria.pagination.limit;
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(criteria.pagination.limit, offset);
    }

    return this.executeQuery<School>(query, params);
  }

  async countByFilters(filters?: SchoolFilters): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM schools';
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      if (filters.country) {
        conditions.push(`country = $${paramIndex++}`);
        params.push(filters.country);
      }
      
      if (filters.region) {
        conditions.push(`region = $${paramIndex++}`);
        params.push(filters.region);
      }
      
      if (filters.schoolType) {
        conditions.push(`school_type = $${paramIndex++}`);
        params.push(filters.schoolType);
      }
      
      if (filters.relationshipStatus) {
        conditions.push(`relationship_status = $${paramIndex++}`);
        params.push(filters.relationshipStatus);
      }
      
      if (filters.query) {
        conditions.push(`(name ILIKE $${paramIndex++} OR country ILIKE $${paramIndex++} OR region ILIKE $${paramIndex++})`);
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm, searchTerm);
        paramIndex += 2;
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await this.executeQuerySingle<{ count: string }>(query, params);
    return parseInt(result?.count || '0');
  }

  private validateSchoolData(data: CreateSchoolData): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('School name is required');
    }
    
    if (!data.country || data.country.trim().length === 0) {
      throw new Error('Country is required');
    }
    
    if (!data.region || data.region.trim().length === 0) {
      throw new Error('Region is required');
    }
    
    if (!Object.values(SchoolType).includes(data.schoolType)) {
      throw new Error('Invalid school type');
    }
    
    if (data.website && data.website.trim() && !this.isValidUrl(data.website)) {
      throw new Error('Invalid website URL');
    }
    
    if (data.relationshipStatus && !Object.values(RelationshipStatus).includes(data.relationshipStatus)) {
      throw new Error('Invalid relationship status');
    }
  }

  private validateSchoolUpdateData(data: UpdateSchoolData): void {
    if (data.name !== undefined && (!data.name || data.name.trim().length === 0)) {
      throw new Error('School name cannot be empty');
    }
    
    if (data.country !== undefined && (!data.country || data.country.trim().length === 0)) {
      throw new Error('Country cannot be empty');
    }
    
    if (data.region !== undefined && (!data.region || data.region.trim().length === 0)) {
      throw new Error('Region cannot be empty');
    }
    
    if (data.schoolType !== undefined && !Object.values(SchoolType).includes(data.schoolType)) {
      throw new Error('Invalid school type');
    }
    
    if (data.website !== undefined && data.website && !this.isValidUrl(data.website)) {
      throw new Error('Invalid website URL');
    }
    
    if (data.relationshipStatus !== undefined && !Object.values(RelationshipStatus).includes(data.relationshipStatus)) {
      throw new Error('Invalid relationship status');
    }
  }

  private isValidUrl(url: string): boolean {
    if (!url || !url.trim()) {
      return true; // Empty URLs are valid (optional field)
    }
    
    // Clean up URL: remove spaces
    let cleanUrl = url.trim().replace(/\s+/g, '');
    
    try {
      // Try to parse as URL, allow both http:// and https://
      const urlObj = new URL(cleanUrl);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      // If URL parsing fails, try adding http:// prefix
      try {
        new URL('http://' + cleanUrl);
        return true;
      } catch {
        return false;
      }
    }
  }

  private mapSortField(field: string): string {
    const fieldMap: { [key: string]: string } = {
      'name': 'name',
      'country': 'country',
      'region': 'region',
      'schoolType': 'school_type',
      'relationshipStatus': 'relationship_status',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at'
    };
    
    return fieldMap[field] || 'name';
  }
}