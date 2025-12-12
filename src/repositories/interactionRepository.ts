import { Pool } from 'pg';
import { AbstractRepository } from '../interfaces/repository';
import { Interaction, ContactMethod, RelationshipStatus } from '../types';

export interface CreateInteractionData {
  schoolId: string;
  contactId?: string | undefined;
  subject: string;
  contactMethod: ContactMethod;
  date: Date;
  notes: string;
  tzuContact: string;
  followUpRequired?: boolean | undefined;
  followUpDate?: Date | undefined;
  followUpReport?: string | undefined;
  createdBy: string;
}

export interface UpdateInteractionData {
  contactId?: string | undefined;
  subject?: string | undefined;
  contactMethod?: ContactMethod | undefined;
  date?: Date | undefined;
  notes?: string | undefined;
  tzuContact?: string | undefined;
  followUpRequired?: boolean | undefined;
  followUpDate?: Date | undefined;
  followUpReport?: string | undefined;
  createdBy?: string | undefined;
}

export interface InteractionFilters {
  schoolId?: string;
  contactMethod?: ContactMethod;
  dateFrom?: Date;
  dateTo?: Date;
  followUpRequired?: boolean;
  createdBy?: string;
  query?: string;
}

export class InteractionRepository extends AbstractRepository<Interaction, CreateInteractionData, UpdateInteractionData> {
  constructor(pool: Pool) {
    super(pool, 'interactions');
  }

  async create(data: CreateInteractionData): Promise<Interaction> {
    this.validateInteractionData(data);
    
    const query = `
      INSERT INTO interactions (school_id, contact_id, subject, contact_method, date, notes, tzu_contact, follow_up_required, follow_up_date, follow_up_report, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, school_id as "schoolId", contact_id as "contactId", subject, contact_method as "contactMethod", date, notes, 
                tzu_contact as "tzuContact", follow_up_required as "followUpRequired", follow_up_date as "followUpDate", 
                follow_up_report as "followUpReport", created_by as "createdBy", created_at as "createdAt"
    `;
    
    const params = [
      data.schoolId,
      data.contactId || null,
      data.subject,
      data.contactMethod,
      data.date,
      data.notes,
      data.tzuContact,
      data.followUpRequired || false,
      data.followUpDate || null,
      data.followUpReport || null,
      data.createdBy
    ];

    const result = await this.executeQuerySingle<Interaction>(query, params);
    if (!result) {
      throw new Error('Failed to create interaction record');
    }

    // Update school's first and last contact dates
    await this.updateSchoolContactDates(data.schoolId);
    
    return result;
  }

  async findById(id: string): Promise<Interaction | null> {
    const query = `
      SELECT id, school_id as "schoolId", contact_id as "contactId", subject, contact_method as "contactMethod", date, notes,
             tzu_contact as "tzuContact", follow_up_required as "followUpRequired", follow_up_date as "followUpDate",
             follow_up_report as "followUpReport", created_by as "createdBy", created_at as "createdAt"
      FROM interactions 
      WHERE id = $1
    `;
    
    return this.executeQuerySingle<Interaction>(query, [id]);
  }

  async findAll(filters?: InteractionFilters): Promise<Interaction[]> {
    let query = `
      SELECT id, school_id as "schoolId", contact_id as "contactId", subject, contact_method as "contactMethod", date, notes,
             tzu_contact as "tzuContact", follow_up_required as "followUpRequired", follow_up_date as "followUpDate",
             follow_up_report as "followUpReport", created_by as "createdBy", created_at as "createdAt"
      FROM interactions
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      if (filters.schoolId) {
        conditions.push(`school_id = $${paramIndex++}`);
        params.push(filters.schoolId);
      }
      
      if (filters.contactMethod) {
        conditions.push(`contact_method = $${paramIndex++}`);
        params.push(filters.contactMethod);
      }
      
      if (filters.dateFrom) {
        conditions.push(`date >= $${paramIndex++}`);
        params.push(filters.dateFrom);
      }
      
      if (filters.dateTo) {
        conditions.push(`date <= $${paramIndex++}`);
        params.push(filters.dateTo);
      }
      
      if (filters.followUpRequired !== undefined) {
        conditions.push(`follow_up_required = $${paramIndex++}`);
        params.push(filters.followUpRequired);
      }
      
      if (filters.createdBy) {
        conditions.push(`created_by = $${paramIndex++}`);
        params.push(filters.createdBy);
      }
      
      if (filters.query) {
        conditions.push(`(notes ILIKE $${paramIndex++} OR created_by ILIKE $${paramIndex++})`);
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm);
        paramIndex += 1; // We added 2 params but incremented once already
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY date DESC, created_at DESC';

    return this.executeQuery<Interaction>(query, params);
  }

  async findBySchoolId(schoolId: string): Promise<Interaction[]> {
    return this.findAll({ schoolId });
  }

  async findInteractionHistory(schoolId: string): Promise<Interaction[]> {
    const query = `
      SELECT id, school_id as "schoolId", contact_id as "contactId", subject, contact_method as "contactMethod", date, notes,
             tzu_contact as "tzuContact", follow_up_required as "followUpRequired", follow_up_date as "followUpDate",
             follow_up_report as "followUpReport", created_by as "createdBy", created_at as "createdAt"
      FROM interactions 
      WHERE school_id = $1
      ORDER BY date DESC, created_at DESC
    `;
    
    return this.executeQuery<Interaction>(query, [schoolId]);
  }

  async update(id: string, data: UpdateInteractionData): Promise<Interaction | null> {
    if (Object.keys(data).length === 0) {
      return this.findById(id);
    }

    this.validateInteractionUpdateData(data);

    // Get current interaction to check school_id for date updates
    const currentInteraction = await this.findById(id);
    if (!currentInteraction) {
      return null;
    }

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.contactId !== undefined) {
      updateFields.push(`contact_id = $${paramIndex++}`);
      params.push(data.contactId);
    }
    
    if (data.subject !== undefined) {
      updateFields.push(`subject = $${paramIndex++}`);
      params.push(data.subject);
    }
    
    if (data.contactMethod !== undefined) {
      updateFields.push(`contact_method = $${paramIndex++}`);
      params.push(data.contactMethod);
    }
    
    if (data.date !== undefined) {
      updateFields.push(`date = $${paramIndex++}`);
      params.push(data.date);
    }
    
    if (data.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      params.push(data.notes);
    }
    
    if (data.tzuContact !== undefined) {
      updateFields.push(`tzu_contact = $${paramIndex++}`);
      params.push(data.tzuContact);
    }
    
    if (data.followUpRequired !== undefined) {
      updateFields.push(`follow_up_required = $${paramIndex++}`);
      params.push(data.followUpRequired);
    }
    
    if (data.followUpDate !== undefined) {
      updateFields.push(`follow_up_date = $${paramIndex++}`);
      params.push(data.followUpDate);
    }
    
    if (data.followUpReport !== undefined) {
      updateFields.push(`follow_up_report = $${paramIndex++}`);
      params.push(data.followUpReport);
    }
    
    if (data.createdBy !== undefined) {
      updateFields.push(`created_by = $${paramIndex++}`);
      params.push(data.createdBy);
    }

    const query = `
      UPDATE interactions 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, school_id as "schoolId", contact_id as "contactId", subject, contact_method as "contactMethod", date, notes,
                tzu_contact as "tzuContact", follow_up_required as "followUpRequired", follow_up_date as "followUpDate",
                follow_up_report as "followUpReport", created_by as "createdBy", created_at as "createdAt"
    `;
    
    params.push(id);

    const result = await this.executeQuerySingle<Interaction>(query, params);
    
    // If date was updated, recalculate school contact dates
    if (data.date !== undefined && result) {
      await this.updateSchoolContactDates(result.schoolId);
    }
    
    return result;
  }

  async updateRelationshipStatus(schoolId: string, status: RelationshipStatus): Promise<boolean> {
    const query = `
      UPDATE schools 
      SET relationship_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    
    const result = await this.executeQuery(query, [status, schoolId]);
    return result.length > 0;
  }

  async getSchoolContactDates(schoolId: string): Promise<{ firstContact?: Date; lastContact?: Date }> {
    const query = `
      SELECT 
        MIN(date) as first_contact,
        MAX(date) as last_contact
      FROM interactions 
      WHERE school_id = $1
    `;
    
    const result = await this.executeQuerySingle<{ first_contact: Date | null; last_contact: Date | null }>(query, [schoolId]);
    
    const response: { firstContact?: Date; lastContact?: Date } = {};
    
    if (result?.first_contact) {
      response.firstContact = result.first_contact;
    }
    
    if (result?.last_contact) {
      response.lastContact = result.last_contact;
    }
    
    return response;
  }

  async countBySchoolId(schoolId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM interactions WHERE school_id = $1';
    const result = await this.executeQuerySingle<{ count: string }>(query, [schoolId]);
    return parseInt(result?.count || '0');
  }

  async findPendingFollowUps(beforeDate?: Date): Promise<Interaction[]> {
    const cutoffDate = beforeDate || new Date();
    
    const query = `
      SELECT id, school_id as "schoolId", contact_id as "contactId", subject, contact_method as "contactMethod", date, notes,
             tzu_contact as "tzuContact", follow_up_required as "followUpRequired", follow_up_date as "followUpDate",
             follow_up_report as "followUpReport", created_by as "createdBy", created_at as "createdAt"
      FROM interactions 
      WHERE follow_up_required = true 
        AND follow_up_date IS NOT NULL 
        AND follow_up_date <= $1
      ORDER BY follow_up_date ASC
    `;
    
    return this.executeQuery<Interaction>(query, [cutoffDate]);
  }

  async validateSchoolExists(schoolId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM schools WHERE id = $1';
    const result = await this.executeQuerySingle(query, [schoolId]);
    return result !== null;
  }

  private async updateSchoolContactDates(schoolId: string): Promise<void> {
    // This method updates the school's first and last contact dates based on interactions
    // Note: The current schema doesn't have these fields in schools table, 
    // but this method provides the logic for when they are added
    const dates = await this.getSchoolContactDates(schoolId);
    
    // For now, we'll just ensure the data is available for queries
    // In a future schema update, we could add first_contact_date and last_contact_date to schools table
    // and update them here
  }

  private validateInteractionData(data: CreateInteractionData): void {
    if (!data.schoolId || data.schoolId.trim().length === 0) {
      throw new Error('School ID is required');
    }
    
    if (!Object.values(ContactMethod).includes(data.contactMethod)) {
      throw new Error('Invalid contact method');
    }
    
    if (!data.date) {
      throw new Error('Interaction date is required');
    }
    
    if (data.date > new Date()) {
      throw new Error('Interaction date cannot be in the future');
    }
    
    if (!data.notes || data.notes.trim().length === 0) {
      throw new Error('Notes are required');
    }
    
    if (data.notes.length > 5000) {
      throw new Error('Notes too long (maximum 5000 characters)');
    }
    
    if (!data.createdBy || data.createdBy.trim().length === 0) {
      throw new Error('Created by is required');
    }
    
    if (data.followUpRequired && data.followUpDate && data.followUpDate <= data.date) {
      throw new Error('Follow-up date must be after interaction date');
    }
  }

  private validateInteractionUpdateData(data: UpdateInteractionData): void {
    if (data.contactMethod !== undefined && !Object.values(ContactMethod).includes(data.contactMethod)) {
      throw new Error('Invalid contact method');
    }
    
    if (data.date !== undefined) {
      if (!data.date) {
        throw new Error('Interaction date cannot be empty');
      }
      
      if (data.date > new Date()) {
        throw new Error('Interaction date cannot be in the future');
      }
    }
    
    if (data.notes !== undefined) {
      if (!data.notes || data.notes.trim().length === 0) {
        throw new Error('Notes cannot be empty');
      }
      
      if (data.notes.length > 5000) {
        throw new Error('Notes too long (maximum 5000 characters)');
      }
    }
    
    if (data.createdBy !== undefined && (!data.createdBy || data.createdBy.trim().length === 0)) {
      throw new Error('Created by cannot be empty');
    }
  }
}