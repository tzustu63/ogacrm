import { Pool } from 'pg';
import { AbstractRepository } from '../interfaces/repository';
import { Partnership, MOUStatus } from '../types';

export interface CreatePartnershipData {
  schoolId: string;
  mouStatus?: MOUStatus;
  mouSignedDate?: Date | undefined;
  mouExpiryDate?: Date | undefined;
  referralCount?: number;
  eventsHeld?: number;
}

export interface UpdatePartnershipData {
  mouStatus?: MOUStatus;
  mouSignedDate?: Date | undefined;
  mouExpiryDate?: Date | undefined;
  referralCount?: number;
  eventsHeld?: number;
}

export interface PartnershipFilters {
  schoolId?: string;
  mouStatus?: MOUStatus;
  expiringBefore?: Date;
  expiringAfter?: Date;
}

export class PartnershipRepository extends AbstractRepository<Partnership, CreatePartnershipData, UpdatePartnershipData> {
  constructor(pool: Pool) {
    super(pool, 'partnerships');
  }

  async create(data: CreatePartnershipData): Promise<Partnership> {
    this.validatePartnershipData(data);
    
    const query = `
      INSERT INTO partnerships (school_id, mou_status, mou_signed_date, mou_expiry_date, referral_count, events_held)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, school_id as "schoolId", mou_status as "mouStatus", 
                mou_signed_date as "mouSignedDate", mou_expiry_date as "mouExpiryDate",
                referral_count as "referralCount", events_held as "eventsHeld",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    const params = [
      data.schoolId,
      data.mouStatus || MOUStatus.NONE,
      data.mouSignedDate || null,
      data.mouExpiryDate || null,
      data.referralCount || 0,
      data.eventsHeld || 0
    ];

    const result = await this.executeQuerySingle<Partnership>(query, params);
    if (!result) {
      throw new Error('Failed to create partnership record');
    }
    
    return result;
  }

  async findById(id: string): Promise<Partnership | null> {
    const query = `
      SELECT id, school_id as "schoolId", mou_status as "mouStatus",
             mou_signed_date as "mouSignedDate", mou_expiry_date as "mouExpiryDate",
             referral_count as "referralCount", events_held as "eventsHeld",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM partnerships 
      WHERE id = $1
    `;
    
    return this.executeQuerySingle<Partnership>(query, [id]);
  }

  async findBySchoolId(schoolId: string): Promise<Partnership | null> {
    const query = `
      SELECT id, school_id as "schoolId", mou_status as "mouStatus",
             mou_signed_date as "mouSignedDate", mou_expiry_date as "mouExpiryDate",
             referral_count as "referralCount", events_held as "eventsHeld",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM partnerships 
      WHERE school_id = $1
    `;
    
    return this.executeQuerySingle<Partnership>(query, [schoolId]);
  }

  async findAll(filters?: PartnershipFilters): Promise<Partnership[]> {
    let query = `
      SELECT id, school_id as "schoolId", mou_status as "mouStatus",
             mou_signed_date as "mouSignedDate", mou_expiry_date as "mouExpiryDate",
             referral_count as "referralCount", events_held as "eventsHeld",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM partnerships
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters) {
      if (filters.schoolId) {
        conditions.push(`school_id = $${paramIndex++}`);
        params.push(filters.schoolId);
      }
      
      if (filters.mouStatus) {
        conditions.push(`mou_status = $${paramIndex++}`);
        params.push(filters.mouStatus);
      }
      
      if (filters.expiringBefore) {
        conditions.push(`mou_expiry_date <= $${paramIndex++}`);
        params.push(filters.expiringBefore);
      }
      
      if (filters.expiringAfter) {
        conditions.push(`mou_expiry_date >= $${paramIndex++}`);
        params.push(filters.expiringAfter);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';

    return this.executeQuery<Partnership>(query, params);
  }

  async update(id: string, data: UpdatePartnershipData): Promise<Partnership | null> {
    if (Object.keys(data).length === 0) {
      return this.findById(id);
    }

    this.validatePartnershipUpdateData(data);

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.mouStatus !== undefined) {
      updateFields.push(`mou_status = $${paramIndex++}`);
      params.push(data.mouStatus);
    }
    
    if (data.mouSignedDate !== undefined) {
      updateFields.push(`mou_signed_date = $${paramIndex++}`);
      params.push(data.mouSignedDate);
    }
    
    if (data.mouExpiryDate !== undefined) {
      updateFields.push(`mou_expiry_date = $${paramIndex++}`);
      params.push(data.mouExpiryDate);
    }
    
    if (data.referralCount !== undefined) {
      updateFields.push(`referral_count = $${paramIndex++}`);
      params.push(data.referralCount);
    }
    
    if (data.eventsHeld !== undefined) {
      updateFields.push(`events_held = $${paramIndex++}`);
      params.push(data.eventsHeld);
    }

    const query = `
      UPDATE partnerships 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, school_id as "schoolId", mou_status as "mouStatus",
                mou_signed_date as "mouSignedDate", mou_expiry_date as "mouExpiryDate",
                referral_count as "referralCount", events_held as "eventsHeld",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    params.push(id);

    return this.executeQuerySingle<Partnership>(query, params);
  }

  async incrementReferralCount(schoolId: string, increment: number = 1): Promise<Partnership | null> {
    const query = `
      UPDATE partnerships 
      SET referral_count = referral_count + $1
      WHERE school_id = $2
      RETURNING id, school_id as "schoolId", mou_status as "mouStatus",
                mou_signed_date as "mouSignedDate", mou_expiry_date as "mouExpiryDate",
                referral_count as "referralCount", events_held as "eventsHeld",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    return this.executeQuerySingle<Partnership>(query, [increment, schoolId]);
  }

  async incrementEventsHeld(schoolId: string, increment: number = 1): Promise<Partnership | null> {
    const query = `
      UPDATE partnerships 
      SET events_held = events_held + $1
      WHERE school_id = $2
      RETURNING id, school_id as "schoolId", mou_status as "mouStatus",
                mou_signed_date as "mouSignedDate", mou_expiry_date as "mouExpiryDate",
                referral_count as "referralCount", events_held as "eventsHeld",
                created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    return this.executeQuerySingle<Partnership>(query, [increment, schoolId]);
  }

  async findExpiringMOUs(daysFromNow: number): Promise<Partnership[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysFromNow);
    
    const query = `
      SELECT id, school_id as "schoolId", mou_status as "mouStatus",
             mou_signed_date as "mouSignedDate", mou_expiry_date as "mouExpiryDate",
             referral_count as "referralCount", events_held as "eventsHeld",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM partnerships 
      WHERE mou_status = $1 
        AND mou_expiry_date IS NOT NULL 
        AND mou_expiry_date <= $2
        AND mou_expiry_date >= CURRENT_DATE
      ORDER BY mou_expiry_date ASC
    `;
    
    return this.executeQuery<Partnership>(query, [MOUStatus.SIGNED, expiryDate]);
  }

  async updateMOUStatus(schoolId: string, status: MOUStatus, signedDate?: Date, expiryDate?: Date): Promise<Partnership | null> {
    // Validate MOU status requirements
    if (status === MOUStatus.SIGNED && !expiryDate) {
      throw new Error('Expiry date is required when MOU status is signed');
    }

    const updateData: UpdatePartnershipData = {
      mouStatus: status
    };

    if (status === MOUStatus.SIGNED) {
      updateData.mouSignedDate = signedDate || new Date();
      updateData.mouExpiryDate = expiryDate;
    }

    // Find existing partnership or create new one
    let partnership = await this.findBySchoolId(schoolId);
    
    if (!partnership) {
      // Create new partnership if none exists
      const createData: CreatePartnershipData = {
        schoolId,
        mouStatus: status
      };
      
      if (status === MOUStatus.SIGNED) {
        createData.mouSignedDate = signedDate || new Date();
        createData.mouExpiryDate = expiryDate;
      }
      
      return this.create(createData);
    } else {
      // Update existing partnership
      return this.update(partnership.id, updateData);
    }
  }

  private validatePartnershipData(data: CreatePartnershipData): void {
    if (!data.schoolId || data.schoolId.trim().length === 0) {
      throw new Error('School ID is required');
    }
    
    if (data.mouStatus && !Object.values(MOUStatus).includes(data.mouStatus)) {
      throw new Error('Invalid MOU status');
    }
    
    if (data.mouStatus === MOUStatus.SIGNED && !data.mouExpiryDate) {
      throw new Error('Expiry date is required when MOU status is signed');
    }
    
    if (data.mouSignedDate && data.mouExpiryDate && data.mouSignedDate > data.mouExpiryDate) {
      throw new Error('MOU signed date cannot be after expiry date');
    }
    
    if (data.referralCount !== undefined && data.referralCount < 0) {
      throw new Error('Referral count cannot be negative');
    }
    
    if (data.eventsHeld !== undefined && data.eventsHeld < 0) {
      throw new Error('Events held count cannot be negative');
    }
  }

  private validatePartnershipUpdateData(data: UpdatePartnershipData): void {
    if (data.mouStatus !== undefined && !Object.values(MOUStatus).includes(data.mouStatus)) {
      throw new Error('Invalid MOU status');
    }
    
    if (data.mouStatus === MOUStatus.SIGNED && !data.mouExpiryDate) {
      throw new Error('Expiry date is required when MOU status is signed');
    }
    
    if (data.mouSignedDate && data.mouExpiryDate && data.mouSignedDate > data.mouExpiryDate) {
      throw new Error('MOU signed date cannot be after expiry date');
    }
    
    if (data.referralCount !== undefined && data.referralCount < 0) {
      throw new Error('Referral count cannot be negative');
    }
    
    if (data.eventsHeld !== undefined && data.eventsHeld < 0) {
      throw new Error('Events held count cannot be negative');
    }
  }
}