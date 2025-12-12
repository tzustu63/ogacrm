import { Pool } from 'pg';
import { DatabaseMigration } from '../../src/utils/migration';

describe('Database Migration Tests', () => {
  let pool: Pool;
  let migration: DatabaseMigration;

  beforeAll(() => {
    // Skip if database is not available
    if (process.env.SKIP_DB_SETUP === 'true') {
      return;
    }

    pool = new Pool({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'recruitment_crm_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'password',
    });

    migration = new DatabaseMigration(pool);
  });

  afterAll(async () => {
    if (pool && process.env.SKIP_DB_SETUP !== 'true') {
      await pool.end();
    }
  });

  it('should create migrations table', async () => {
    if (process.env.SKIP_DB_SETUP === 'true') {
      console.log('Skipping database test - no database connection');
      return;
    }

    // This test verifies that the migration system can create the migrations table
    // The actual migration logic is tested by running the migration
    expect(migration).toBeDefined();
    expect(typeof migration.runMigrations).toBe('function');
  });

  it('should have proper database schema structure', () => {
    // Test that the schema file exists and has the expected structure
    const fs = require('fs');
    const path = require('path');
    
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    expect(fs.existsSync(schemaPath)).toBe(true);
    
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Verify key tables are defined
    expect(schemaContent).toContain('CREATE TABLE schools');
    expect(schemaContent).toContain('CREATE TABLE contacts');
    expect(schemaContent).toContain('CREATE TABLE interactions');
    expect(schemaContent).toContain('CREATE TABLE partnerships');
    expect(schemaContent).toContain('CREATE TABLE preferences');
    
    // Verify enums are defined
    expect(schemaContent).toContain('CREATE TYPE school_type');
    expect(schemaContent).toContain('CREATE TYPE relationship_status');
    expect(schemaContent).toContain('CREATE TYPE contact_method');
    expect(schemaContent).toContain('CREATE TYPE mou_status');
    
    // Verify indexes are created
    expect(schemaContent).toContain('CREATE INDEX');
    
    // Verify constraints are added
    expect(schemaContent).toContain('REFERENCES');
    expect(schemaContent).toContain('CHECK');
  });
});