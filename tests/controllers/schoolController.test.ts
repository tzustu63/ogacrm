import request from 'supertest';
import { getPool, connectDatabase } from '../../src/config/database';
import { SchoolType, RelationshipStatus } from '../../src/types';
import { DatabaseMigration } from '../../src/utils/migration';
import { generateToken } from '../../src/middleware/auth';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from '../../src/middleware/errorHandler';
import { authMiddleware } from '../../src/middleware/auth';
import { schoolRoutes } from '../../src/routes/schoolRoutes';

describe('School Controller', () => {
  let authToken: string;
  let app: express.Application;

  beforeAll(async () => {
    // Initialize database connection
    await connectDatabase();
    
    // Run migrations
    const migration = new DatabaseMigration(getPool());
    await migration.runMigrations();

    // Create test app
    app = express();
    app.use(helmet());
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // Add routes
    app.use('/api/schools', authMiddleware, schoolRoutes);
    app.use(errorHandler);

    // Generate a valid JWT token for testing
    authToken = generateToken({
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'admin'
    });
  });

  afterAll(async () => {
    // Clean up database
    const pool = getPool();
    await pool.query('DELETE FROM schools');
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up before each test
    const pool = getPool();
    await pool.query('DELETE FROM schools');
  });

  describe('POST /api/schools', () => {
    it('should create a new school with valid data', async () => {
      const schoolData = {
        name: '測試高中',
        country: '台灣',
        region: '台北市',
        schoolType: SchoolType.HIGH_SCHOOL,
        website: 'https://test-school.edu.tw',
        relationshipStatus: RelationshipStatus.POTENTIAL
      };

      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send(schoolData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: schoolData.name,
        country: schoolData.country,
        region: schoolData.region,
        schoolType: schoolData.schoolType,
        website: schoolData.website,
        relationshipStatus: schoolData.relationshipStatus
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
    });

    it('should return validation error for missing required fields', async () => {
      const invalidData = {
        name: '測試高中'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });

    it('should return validation error for invalid school type', async () => {
      const invalidData = {
        name: '測試高中',
        country: '台灣',
        region: '台北市',
        schoolType: 'INVALID_TYPE'
      };

      const response = await request(app)
        .post('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/schools', () => {
    beforeEach(async () => {
      // Create test schools
      const pool = getPool();
      await pool.query(`
        INSERT INTO schools (id, name, country, region, school_type, relationship_status)
        VALUES 
          ('550e8400-e29b-41d4-a716-446655440001', '測試高中A', '台灣', '台北市', 'high_school', 'potential'),
          ('550e8400-e29b-41d4-a716-446655440002', '測試大學B', '台灣', '新北市', 'university', 'active'),
          ('550e8400-e29b-41d4-a716-446655440003', '測試技職C', '台灣', '桃園市', 'vocational', 'partnered')
      `);
    });

    it('should return all schools without filters', async () => {
      const response = await request(app)
        .get('/api/schools')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.totalCount).toBe(3);
    });

    it('should filter schools by country', async () => {
      const response = await request(app)
        .get('/api/schools?country=台灣')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });

    it('should filter schools by school type', async () => {
      const response = await request(app)
        .get('/api/schools?schoolType=university')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].schoolType).toBe('university');
    });

    it('should search schools by name', async () => {
      const response = await request(app)
        .get('/api/schools?query=大學')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toContain('大學');
    });
  });

  describe('GET /api/schools/:id', () => {
    let schoolId: string;

    beforeEach(async () => {
      const pool = getPool();
      const result = await pool.query(`
        INSERT INTO schools (id, name, country, region, school_type, relationship_status)
        VALUES ('550e8400-e29b-41d4-a716-446655440001', '測試高中', '台灣', '台北市', 'high_school', 'potential')
        RETURNING id
      `);
      schoolId = result.rows[0].id;
    });

    it('should return school details for valid ID', async () => {
      const response = await request(app)
        .get(`/api/schools/${schoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(schoolId);
      expect(response.body.data.name).toBe('測試高中');
    });

    it('should return 404 for non-existent school', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      
      const response = await request(app)
        .get(`/api/schools/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SCHOOL_NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/schools/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID');
    });
  });

  describe('PUT /api/schools/:id', () => {
    let schoolId: string;

    beforeEach(async () => {
      const pool = getPool();
      const result = await pool.query(`
        INSERT INTO schools (id, name, country, region, school_type, relationship_status)
        VALUES ('550e8400-e29b-41d4-a716-446655440001', '測試高中', '台灣', '台北市', 'high_school', 'potential')
        RETURNING id
      `);
      schoolId = result.rows[0].id;
    });

    it('should update school with valid data', async () => {
      const updateData = {
        name: '更新後的學校名稱',
        relationshipStatus: RelationshipStatus.ACTIVE
      };

      const response = await request(app)
        .put(`/api/schools/${schoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.relationshipStatus).toBe(updateData.relationshipStatus);
    });

    it('should return 404 for non-existent school', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      
      const response = await request(app)
        .put(`/api/schools/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '新名稱' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SCHOOL_NOT_FOUND');
    });
  });

  describe('DELETE /api/schools/:id', () => {
    let schoolId: string;

    beforeEach(async () => {
      const pool = getPool();
      const result = await pool.query(`
        INSERT INTO schools (id, name, country, region, school_type, relationship_status)
        VALUES ('550e8400-e29b-41d4-a716-446655440001', '測試高中', '台灣', '台北市', 'high_school', 'potential')
        RETURNING id
      `);
      schoolId = result.rows[0].id;
    });

    it('should delete school successfully', async () => {
      const response = await request(app)
        .delete(`/api/schools/${schoolId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify school is deleted
      const pool = getPool();
      const result = await pool.query('SELECT * FROM schools WHERE id = $1', [schoolId]);
      expect(result.rows).toHaveLength(0);
    });

    it('should return 404 for non-existent school', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      
      const response = await request(app)
        .delete(`/api/schools/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SCHOOL_NOT_FOUND');
    });
  });
});