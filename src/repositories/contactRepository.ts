import { Pool } from 'pg';
import { AbstractRepository } from '../interfaces/repository';
import { Contact } from '../types';
import { validateEmail } from '../utils/validation';

export interface CreateContactData {
  schoolId: string;
  name: string;
  email: string;
  phone?: string | undefined;
  position?: string | undefined;
  organization?: string | undefined;
  facebook?: string | undefined;
  instagram?: string | undefined;
  whatsapp?: string | undefined;
  notes?: string | undefined;
  isPrimary?: boolean | undefined;
}

export interface UpdateContactData {
  name?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  position?: string | undefined;
  organization?: string | undefined;
  facebook?: string | undefined;
  instagram?: string | undefined;
  whatsapp?: string | undefined;
  notes?: string | undefined;
  isPrimary?: boolean | undefined;
}

export interface ContactFilters {
  schoolId?: string;
  email?: string;
  isPrimary?: boolean;
  query?: string;
}

export class ContactRepository extends AbstractRepository<Contact, CreateContactData, UpdateContactData> {
  constructor(pool: Pool) {
    super(pool, 'contacts');
  }

  async create(data: CreateContactData): Promise<Contact> {
    this.validateContactData(data);
    
    // Check if setting as primary contact
    if (data.isPrimary === true) {
      await this.clearPrimaryContact(data.schoolId);
    }
    
    const query = `
      INSERT INTO contacts (school_id, name, email, phone, position, organization, facebook, instagram, whatsapp, notes, is_primary)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, school_id as "schoolId", name, email, phone, position, organization, 
                facebook, instagram, whatsapp, notes,
                is_primary as "isPrimary", created_at as "createdAt", 
                updated_at as "updatedAt"
    `;
    
    const params = [
      data.schoolId,
      data.name,
      data.email,
      data.phone || null,
      data.position || null,
      data.organization || null,
      data.facebook || null,
      data.instagram || null,
      data.whatsapp || null,
      data.notes || null,
      data.isPrimary || false
    ];

    const result = await this.executeQuerySingle<Contact>(query, params);
    if (!result) {
      throw new Error('Failed to create contact record');
    }
    
    return result;
  }

  async findById(id: string): Promise<Contact | null> {
    const query = `
      SELECT id, school_id as "schoolId", name, email, phone, position, organization,
             facebook, instagram, whatsapp, notes,
             is_primary as "isPrimary", created_at as "createdAt",
             updated_at as "updatedAt"
      FROM contacts 
      WHERE id = $1
    `;
    
    return this.executeQuerySingle<Contact>(query, [id]);
  }

  async findAll(filters?: ContactFilters): Promise<Contact[]> {
    let query = `
      SELECT id, school_id as "schoolId", name, email, phone, position, organization,
             facebook, instagram, whatsapp, notes,
             is_primary as "isPrimary", created_at as "createdAt",
             updated_at as "updatedAt"
      FROM contacts
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      if (filters.schoolId) {
        conditions.push(`school_id = $${paramIndex++}`);
        params.push(filters.schoolId);
      }
      
      if (filters.email) {
        conditions.push(`email = $${paramIndex++}`);
        params.push(filters.email);
      }
      
      if (filters.isPrimary !== undefined) {
        conditions.push(`is_primary = $${paramIndex++}`);
        params.push(filters.isPrimary);
      }
      
      if (filters.query) {
        conditions.push(`(name ILIKE $${paramIndex++} OR email ILIKE $${paramIndex++} OR position ILIKE $${paramIndex++})`);
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm, searchTerm);
        paramIndex += 2; // We added 3 params but incremented once already
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY is_primary DESC, name ASC';

    return this.executeQuery<Contact>(query, params);
  }

  async findBySchoolId(schoolId: string): Promise<Contact[]> {
    return this.findAll({ schoolId });
  }

  async findPrimaryContact(schoolId: string): Promise<Contact | null> {
    const query = `
      SELECT id, school_id as "schoolId", name, email, phone, position, organization,
             facebook, instagram, whatsapp, notes,
             is_primary as "isPrimary", created_at as "createdAt",
             updated_at as "updatedAt"
      FROM contacts 
      WHERE school_id = $1 AND is_primary = true
      LIMIT 1
    `;
    
    return this.executeQuerySingle<Contact>(query, [schoolId]);
  }

  async update(id: string, data: UpdateContactData): Promise<Contact | null> {
    if (Object.keys(data).length === 0) {
      return this.findById(id);
    }

    this.validateContactUpdateData(data);

    // Get current contact to check school_id for primary contact logic
    const currentContact = await this.findById(id);
    if (!currentContact) {
      return null;
    }

    // If setting as primary contact, clear other primary contacts for this school
    if (data.isPrimary === true) {
      await this.clearPrimaryContact(currentContact.schoolId, id);
    }

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    
    if (data.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      params.push(data.email);
    }
    
    if (data.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      params.push(data.phone);
    }
    
    if (data.position !== undefined) {
      updateFields.push(`position = $${paramIndex++}`);
      params.push(data.position);
    }
    
    if (data.organization !== undefined) {
      updateFields.push(`organization = $${paramIndex++}`);
      params.push(data.organization);
    }
    
    if (data.facebook !== undefined) {
      updateFields.push(`facebook = $${paramIndex++}`);
      params.push(data.facebook);
    }
    
    if (data.instagram !== undefined) {
      updateFields.push(`instagram = $${paramIndex++}`);
      params.push(data.instagram);
    }
    
    if (data.whatsapp !== undefined) {
      updateFields.push(`whatsapp = $${paramIndex++}`);
      params.push(data.whatsapp);
    }
    
    if (data.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      params.push(data.notes);
    }
    
    if (data.isPrimary !== undefined) {
      updateFields.push(`is_primary = $${paramIndex++}`);
      params.push(data.isPrimary);
    }

    const query = `
      UPDATE contacts 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, school_id as "schoolId", name, email, phone, position, organization,
                facebook, instagram, whatsapp, notes,
                is_primary as "isPrimary", created_at as "createdAt",
                updated_at as "updatedAt"
    `;
    
    params.push(id);

    return this.executeQuerySingle<Contact>(query, params);
  }

  async countBySchoolId(schoolId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM contacts WHERE school_id = $1';
    const result = await this.executeQuerySingle<{ count: string }>(query, [schoolId]);
    return parseInt(result?.count || '0');
  }

  async validateSchoolExists(schoolId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM schools WHERE id = $1';
    const result = await this.executeQuerySingle(query, [schoolId]);
    return result !== null;
  }

  private async clearPrimaryContact(schoolId: string, excludeContactId?: string): Promise<void> {
    let query = 'UPDATE contacts SET is_primary = false WHERE school_id = $1 AND is_primary = true';
    const params = [schoolId];
    
    if (excludeContactId) {
      query += ' AND id != $2';
      params.push(excludeContactId);
    }
    
    await this.executeQuery(query, params);
  }

  private validateContactData(data: CreateContactData): void {
    if (!data.schoolId || data.schoolId.trim().length === 0) {
      throw new Error('School ID is required');
    }
    
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Contact name is required');
    }
    
    if (!data.email || data.email.trim().length === 0) {
      throw new Error('Email is required');
    }
    
    if (!validateEmail(data.email)) {
      throw new Error('Invalid email format');
    }
    
    if (data.phone && data.phone.length > 20) {
      throw new Error('Phone number too long');
    }
    
    if (data.position && data.position.length > 100) {
      throw new Error('Position title too long');
    }
  }

  private validateContactUpdateData(data: UpdateContactData): void {
    if (data.name !== undefined && (!data.name || data.name.trim().length === 0)) {
      throw new Error('Contact name cannot be empty');
    }
    
    if (data.email !== undefined) {
      if (!data.email || data.email.trim().length === 0) {
        throw new Error('Email cannot be empty');
      }
      
      if (!validateEmail(data.email)) {
        throw new Error('Invalid email format');
      }
    }
    
    if (data.phone !== undefined && data.phone && data.phone.length > 20) {
      throw new Error('Phone number too long');
    }
    
    if (data.position !== undefined && data.position && data.position.length > 100) {
      throw new Error('Position title too long');
    }
  }
}