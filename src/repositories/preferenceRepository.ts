import { Pool } from 'pg';
import { AbstractRepository } from '../interfaces/repository';
import { Preference, ContactMethod } from '../types';

export interface CreatePreferenceData {
  schoolId: string;
  preferredContactMethod: ContactMethod;
  programsOfInterest: string[];
  bestContactTime: string;
  timezone: string;
  specialRequirements?: string;
}

export interface UpdatePreferenceData {
  preferredContactMethod?: ContactMethod;
  programsOfInterest?: string[];
  bestContactTime?: string;
  timezone?: string;
  specialRequirements?: string;
}

export interface PreferenceFilters {
  schoolId?: string;
  preferredContactMethod?: ContactMethod;
  timezone?: string;
  programsOfInterest?: string; // Search within programs array
}

export class PreferenceRepository extends AbstractRepository<Preference, CreatePreferenceData, UpdatePreferenceData> {
  constructor(pool: Pool) {
    super(pool, 'preferences');
  }

  async create(data: CreatePreferenceData): Promise<Preference> {
    this.validatePreferenceData(data);
    
    const query = `
      INSERT INTO preferences (school_id, preferred_contact_method, programs_of_interest, 
                              best_contact_time, timezone, special_requirements)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, school_id as "schoolId", preferred_contact_method as "preferredContactMethod",
                programs_of_interest as "programsOfInterest", best_contact_time as "bestContactTime",
                timezone, special_requirements as "specialRequirements",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    const params = [
      data.schoolId,
      data.preferredContactMethod,
      data.programsOfInterest,
      data.bestContactTime,
      data.timezone,
      data.specialRequirements || null
    ];

    const result = await this.executeQuerySingle<Preference>(query, params);
    if (!result) {
      throw new Error('Failed to create preference record');
    }
    
    return result;
  }

  async findById(id: string): Promise<Preference | null> {
    const query = `
      SELECT id, school_id as "schoolId", preferred_contact_method as "preferredContactMethod",
             programs_of_interest as "programsOfInterest", best_contact_time as "bestContactTime",
             timezone, special_requirements as "specialRequirements",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM preferences 
      WHERE id = $1
    `;
    
    return this.executeQuerySingle<Preference>(query, [id]);
  }

  async findBySchoolId(schoolId: string): Promise<Preference | null> {
    const query = `
      SELECT id, school_id as "schoolId", preferred_contact_method as "preferredContactMethod",
             programs_of_interest as "programsOfInterest", best_contact_time as "bestContactTime",
             timezone, special_requirements as "specialRequirements",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM preferences 
      WHERE school_id = $1
    `;
    
    return this.executeQuerySingle<Preference>(query, [schoolId]);
  }

  async findAll(filters?: PreferenceFilters): Promise<Preference[]> {
    let query = `
      SELECT id, school_id as "schoolId", preferred_contact_method as "preferredContactMethod",
             programs_of_interest as "programsOfInterest", best_contact_time as "bestContactTime",
             timezone, special_requirements as "specialRequirements",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM preferences
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      if (filters.schoolId) {
        conditions.push(`school_id = $${paramIndex++}`);
        params.push(filters.schoolId);
      }
      
      if (filters.preferredContactMethod) {
        conditions.push(`preferred_contact_method = $${paramIndex++}`);
        params.push(filters.preferredContactMethod);
      }
      
      if (filters.timezone) {
        conditions.push(`timezone = $${paramIndex++}`);
        params.push(filters.timezone);
      }
      
      if (filters.programsOfInterest) {
        conditions.push(`$${paramIndex++} = ANY(programs_of_interest)`);
        params.push(filters.programsOfInterest);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';

    return this.executeQuery<Preference>(query, params);
  }

  async update(id: string, data: UpdatePreferenceData): Promise<Preference | null> {
    if (Object.keys(data).length === 0) {
      return this.findById(id);
    }

    this.validatePreferenceUpdateData(data);

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.preferredContactMethod !== undefined) {
      updateFields.push(`preferred_contact_method = $${paramIndex++}`);
      params.push(data.preferredContactMethod);
    }
    
    if (data.programsOfInterest !== undefined) {
      updateFields.push(`programs_of_interest = $${paramIndex++}`);
      params.push(data.programsOfInterest);
    }
    
    if (data.bestContactTime !== undefined) {
      updateFields.push(`best_contact_time = $${paramIndex++}`);
      params.push(data.bestContactTime);
    }
    
    if (data.timezone !== undefined) {
      updateFields.push(`timezone = $${paramIndex++}`);
      params.push(data.timezone);
    }
    
    if (data.specialRequirements !== undefined) {
      updateFields.push(`special_requirements = $${paramIndex++}`);
      params.push(data.specialRequirements);
    }

    const query = `
      UPDATE preferences 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, school_id as "schoolId", preferred_contact_method as "preferredContactMethod",
                programs_of_interest as "programsOfInterest", best_contact_time as "bestContactTime",
                timezone, special_requirements as "specialRequirements",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    params.push(id);

    return this.executeQuerySingle<Preference>(query, params);
  }

  async updateBySchoolId(schoolId: string, data: UpdatePreferenceData): Promise<Preference | null> {
    if (Object.keys(data).length === 0) {
      return this.findBySchoolId(schoolId);
    }

    this.validatePreferenceUpdateData(data);

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.preferredContactMethod !== undefined) {
      updateFields.push(`preferred_contact_method = $${paramIndex++}`);
      params.push(data.preferredContactMethod);
    }
    
    if (data.programsOfInterest !== undefined) {
      updateFields.push(`programs_of_interest = $${paramIndex++}`);
      params.push(data.programsOfInterest);
    }
    
    if (data.bestContactTime !== undefined) {
      updateFields.push(`best_contact_time = $${paramIndex++}`);
      params.push(data.bestContactTime);
    }
    
    if (data.timezone !== undefined) {
      updateFields.push(`timezone = $${paramIndex++}`);
      params.push(data.timezone);
    }
    
    if (data.specialRequirements !== undefined) {
      updateFields.push(`special_requirements = $${paramIndex++}`);
      params.push(data.specialRequirements);
    }

    const query = `
      UPDATE preferences 
      SET ${updateFields.join(', ')}
      WHERE school_id = $${paramIndex}
      RETURNING id, school_id as "schoolId", preferred_contact_method as "preferredContactMethod",
                programs_of_interest as "programsOfInterest", best_contact_time as "bestContactTime",
                timezone, special_requirements as "specialRequirements",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    params.push(schoolId);

    return this.executeQuerySingle<Preference>(query, params);
  }

  async deleteBySchoolId(schoolId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = 'DELETE FROM preferences WHERE school_id = $1';
      const result = await client.query(query, [schoolId]);
      return result.rowCount !== null && result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async findByTimezone(timezone: string): Promise<Preference[]> {
    const query = `
      SELECT id, school_id as "schoolId", preferred_contact_method as "preferredContactMethod",
             programs_of_interest as "programsOfInterest", best_contact_time as "bestContactTime",
             timezone, special_requirements as "specialRequirements",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM preferences 
      WHERE timezone = $1
      ORDER BY created_at DESC
    `;
    
    return this.executeQuery<Preference>(query, [timezone]);
  }

  async findByProgram(program: string): Promise<Preference[]> {
    const query = `
      SELECT id, school_id as "schoolId", preferred_contact_method as "preferredContactMethod",
             programs_of_interest as "programsOfInterest", best_contact_time as "bestContactTime",
             timezone, special_requirements as "specialRequirements",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM preferences 
      WHERE $1 = ANY(programs_of_interest)
      ORDER BY created_at DESC
    `;
    
    return this.executeQuery<Preference>(query, [program]);
  }

  async addProgramToInterest(id: string, program: string): Promise<Preference | null> {
    const query = `
      UPDATE preferences 
      SET programs_of_interest = array_append(programs_of_interest, $1)
      WHERE id = $2 AND NOT ($1 = ANY(programs_of_interest))
      RETURNING id, school_id as "schoolId", preferred_contact_method as "preferredContactMethod",
                programs_of_interest as "programsOfInterest", best_contact_time as "bestContactTime",
                timezone, special_requirements as "specialRequirements",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    return this.executeQuerySingle<Preference>(query, [program, id]);
  }

  async removeProgramFromInterest(id: string, program: string): Promise<Preference | null> {
    const query = `
      UPDATE preferences 
      SET programs_of_interest = array_remove(programs_of_interest, $1)
      WHERE id = $2
      RETURNING id, school_id as "schoolId", preferred_contact_method as "preferredContactMethod",
                programs_of_interest as "programsOfInterest", best_contact_time as "bestContactTime",
                timezone, special_requirements as "specialRequirements",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    return this.executeQuerySingle<Preference>(query, [program, id]);
  }

  private validatePreferenceData(data: CreatePreferenceData): void {
    if (!data.schoolId || data.schoolId.trim().length === 0) {
      throw new Error('School ID is required');
    }
    
    if (!Object.values(ContactMethod).includes(data.preferredContactMethod)) {
      throw new Error('Invalid preferred contact method');
    }
    
    if (!data.programsOfInterest || data.programsOfInterest.length === 0) {
      throw new Error('At least one program of interest is required');
    }
    
    // Validate programs array contains non-empty strings
    if (data.programsOfInterest.some(program => !program || program.trim().length === 0)) {
      throw new Error('Programs of interest cannot contain empty values');
    }
    
    if (!data.bestContactTime || data.bestContactTime.trim().length === 0) {
      throw new Error('Best contact time is required');
    }
    
    if (!data.timezone || data.timezone.trim().length === 0) {
      throw new Error('Timezone is required');
    }
    
    if (!this.isValidTimezone(data.timezone)) {
      throw new Error('Invalid timezone format');
    }
  }

  private validatePreferenceUpdateData(data: UpdatePreferenceData): void {
    if (data.preferredContactMethod !== undefined && !Object.values(ContactMethod).includes(data.preferredContactMethod)) {
      throw new Error('Invalid preferred contact method');
    }
    
    if (data.programsOfInterest !== undefined) {
      if (data.programsOfInterest.length === 0) {
        throw new Error('At least one program of interest is required');
      }
      
      if (data.programsOfInterest.some(program => !program || program.trim().length === 0)) {
        throw new Error('Programs of interest cannot contain empty values');
      }
    }
    
    if (data.bestContactTime !== undefined && (!data.bestContactTime || data.bestContactTime.trim().length === 0)) {
      throw new Error('Best contact time cannot be empty');
    }
    
    if (data.timezone !== undefined) {
      if (!data.timezone || data.timezone.trim().length === 0) {
        throw new Error('Timezone cannot be empty');
      }
      
      if (!this.isValidTimezone(data.timezone)) {
        throw new Error('Invalid timezone format');
      }
    }
  }

  private isValidTimezone(timezone: string): boolean {
    // Basic timezone validation - accepts common formats like:
    // UTC, GMT, America/New_York, Asia/Tokyo, Europe/London, +08:00, -05:00
    const timezoneRegex = /^(UTC|GMT|[A-Za-z]+\/[A-Za-z_]+|[+-]\d{2}:\d{2})$/;
    return timezoneRegex.test(timezone);
  }
}