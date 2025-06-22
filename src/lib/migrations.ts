import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { getConfig } from './config';

export class MigrationRunner {
  private pool: Pool;

  constructor() {
    const config = getConfig();
    this.pool = new Pool({
      connectionString: config.database.url,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    });
  }

  async runMigrations(): Promise<void> {
    try {
      // Create migrations table if it doesn't exist
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Get list of migration files
      const migrationsDir = path.join(process.cwd(), 'migrations');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      // Get already executed migrations
      const result = await this.pool.query('SELECT filename FROM migrations');
      const executedMigrations = new Set(result.rows.map(row => row.filename));

      // Execute pending migrations
      for (const filename of migrationFiles) {
        if (!executedMigrations.has(filename)) {
          console.log(`Running migration: ${filename}`);
          const migrationPath = path.join(migrationsDir, filename);
          const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

          // Execute migration in a transaction
          await this.pool.query('BEGIN');
          try {
            await this.pool.query(migrationSQL);
            await this.pool.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
            await this.pool.query('COMMIT');
            console.log(`Migration ${filename} completed successfully`);
          } catch (error) {
            await this.pool.query('ROLLBACK');
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
