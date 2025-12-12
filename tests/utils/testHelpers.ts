import { Pool } from 'pg';
import { generateToken } from '../../src/middleware/auth';
import { getTestPool } from '../setup';

let testPool: Pool;

export interface TestUser {
  id: string;
  email: string;
  role: string;
  token: string;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const defaultUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'admin'
  };
  
  const user = { ...defaultUser, ...overrides };
  const token = generateToken({ id: user.id, email: user.email, role: user.role });
  
  return { ...user, token };
}

export async function createTestSchool(pool: Pool, overrides: any = {}) {
  const defaultSchool = {
    name: '測試學校',
    country: '台灣',
    region: '台北市',
    school_type: 'university',
    website: 'https://test-school.edu.tw',
    relationship_status: 'potential',
    ...overrides
  };

  const query = `
    INSERT INTO schools (name, country, region, school_type, website, relationship_status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  
  const values = [
    defaultSchool.name,
    defaultSchool.country,
    defaultSchool.region,
    defaultSchool.school_type,
    defaultSchool.website,
    defaultSchool.relationship_status
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function createTestContact(pool: Pool, schoolId: string, overrides: any = {}) {
  const defaultContact = {
    name: '測試聯絡人',
    email: 'contact@test-school.edu.tw',
    phone: '+886-2-1234-5678',
    position: '招生主任',
    is_primary: true,
    ...overrides
  };

  const query = `
    INSERT INTO contacts (school_id, name, email, phone, position, is_primary)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  
  const values = [
    schoolId,
    defaultContact.name,
    defaultContact.email,
    defaultContact.phone,
    defaultContact.position,
    defaultContact.is_primary
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function createTestInteraction(pool: Pool, schoolId: string, overrides: any = {}) {
  const defaultInteraction = {
    contact_method: 'email',
    date: new Date(),
    notes: '測試互動記錄',
    follow_up_required: false,
    created_by: 'test-user-id',
    ...overrides
  };

  const query = `
    INSERT INTO interactions (school_id, contact_method, date, notes, follow_up_required, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  
  const values = [
    schoolId,
    defaultInteraction.contact_method,
    defaultInteraction.date,
    defaultInteraction.notes,
    defaultInteraction.follow_up_required,
    defaultInteraction.created_by
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

export function expectValidTimestamp(timestamp: string | Date): void {
  const date = new Date(timestamp);
  expect(date).toBeInstanceOf(Date);
  expect(date.getTime()).not.toBeNaN();
}

export function expectValidUUID(uuid: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  expect(uuid).toMatch(uuidRegex);
}

export async function waitForAsync(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function setupTestDatabase(): Promise<void> {
  testPool = getTestPool();
  
  // Create test user if not exists
  try {
    await testPool.query(`
      INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
      VALUES ('test-user-id', 'test@example.com', '$2b$10$test.hash', 'admin', NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `);
  } catch (error) {
    // User might already exist, ignore error
  }
}

export async function cleanupTestDatabase(): Promise<void> {
  if (testPool) {
    // Clean up test data in reverse order of dependencies
    await testPool.query('DELETE FROM audit_log WHERE entity_id LIKE \'%test%\'');
    await testPool.query('DELETE FROM partnership_events WHERE school_id IN (SELECT id FROM schools WHERE name LIKE \'%測試%\' OR name LIKE \'%test%\')');
    await testPool.query('DELETE FROM partnerships WHERE school_id IN (SELECT id FROM schools WHERE name LIKE \'%測試%\' OR name LIKE \'%test%\')');
    await testPool.query('DELETE FROM preferences WHERE school_id IN (SELECT id FROM schools WHERE name LIKE \'%測試%\' OR name LIKE \'%test%\')');
    await testPool.query('DELETE FROM interactions WHERE school_id IN (SELECT id FROM schools WHERE name LIKE \'%測試%\' OR name LIKE \'%test%\')');
    await testPool.query('DELETE FROM contacts WHERE school_id IN (SELECT id FROM schools WHERE name LIKE \'%測試%\' OR name LIKE \'%test%\')');
    await testPool.query('DELETE FROM schools WHERE name LIKE \'%測試%\' OR name LIKE \'%test%\'');
  }
}

export function getTestDatabase(): Pool {
  return testPool || getTestPool();
}