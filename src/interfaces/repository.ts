import { Pool } from 'pg';

export interface BaseRepository<T, CreateData, UpdateData> {
  create(data: CreateData): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(filters?: any): Promise<T[]>;
  update(id: string, data: UpdateData): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

export abstract class AbstractRepository<T, CreateData, UpdateData> implements BaseRepository<T, CreateData, UpdateData> {
  protected pool: Pool;
  protected tableName: string;

  constructor(pool: Pool, tableName: string) {
    this.pool = pool;
    this.tableName = tableName;
  }

  abstract create(data: CreateData): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(filters?: any): Promise<T[]>;
  abstract update(id: string, data: UpdateData): Promise<T | null>;

  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
      const result = await client.query(query, [id]);
      return result.rowCount !== null && result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  protected async executeQuery<R = any>(query: string, params: any[] = []): Promise<R[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  protected async executeQuerySingle<R = any>(query: string, params: any[] = []): Promise<R | null> {
    const rows = await this.executeQuery<R>(query, params);
    return rows.length > 0 ? rows[0]! : null;
  }
}