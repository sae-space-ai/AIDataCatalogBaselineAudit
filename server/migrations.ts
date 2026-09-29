// ============================================================
// SERVER — Migration Runner
// ============================================================
//
// Manages database schema migrations.
// 
// IMPORTANT: This does NOT execute migrations automatically.
// Migrations must be run explicitly when setting up a new database.
//
// The migration runner:
// - Tracks which migrations have been applied
// - Executes pending migrations in order
// - Records migration history
// - Handles rollback (future enhancement)
//

import type { DatabasePool } from './db';

/**
 * Migration definition.
 */
export interface Migration {
  version: string;
  name: string;
  sql: string;
}

/**
 * Migration status.
 */
export type MigrationStatus = 'PENDING' | 'APPLIED' | 'FAILED';

/**
 * Migration record (stored in database).
 */
export interface MigrationRecord {
  version: string;
  name: string;
  appliedAt: string;
  status: MigrationStatus;
  error?: string;
}

/**
 * Available migrations.
 * 
 * IMPORTANT: Add new migrations here in version order.
 * Each migration should be idempotent (use IF NOT EXISTS, etc.).
 */
export const MIGRATIONS: Migration[] = [
  {
    version: '001',
    name: 'initial_schema',
    sql: `
      -- This migration is defined in migrations/001_initial_schema.sql
      -- It should be loaded and executed here.
      -- For now, this is a placeholder.
      
      -- In a real implementation:
      -- 1. Read the SQL file
      -- 2. Execute it within a transaction
      -- 3. Record the migration in a migrations table
    `,
  },
];

/**
 * Migration runner.
 */
export class MigrationRunner {
  private pool: DatabasePool;
  
  constructor(pool: DatabasePool) {
    this.pool = pool;
  }
  
  /**
   * Get list of applied migrations.
   */
  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    // TODO: Query migrations table
    // SELECT version, name, applied_at, status FROM migrations ORDER BY version
    
    // For now, return empty array (no migrations applied yet)
    return [];
  }
  
  /**
   * Get list of pending migrations.
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const applied = await this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map(m => m.version));
    
    return MIGRATIONS.filter(m => !appliedVersions.has(m.version));
  }
  
  /**
   * Run all pending migrations.
   */
  async migrate(): Promise<{ applied: number; errors: string[] }> {
    const pending = await this.getPendingMigrations();
    const errors: string[] = [];
    let applied = 0;
    
    for (const migration of pending) {
      try {
        // TODO: Execute migration within a transaction
        // 1. BEGIN
        // 2. Execute migration.sql
        // 3. INSERT INTO migrations (version, name, applied_at, status)
        // 4. COMMIT
        
        console.log(`[Migration] Applying ${migration.version}: ${migration.name}`);
        
        // Placeholder: In real implementation, execute the SQL
        // await this.pool.query(migration.sql);
        
        applied++;
        console.log(`[Migration] Applied ${migration.version}: ${migration.name}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to apply ${migration.version}: ${errorMsg}`);
        console.error(`[Migration] Failed ${migration.version}: ${errorMsg}`);
        
        // Stop on first error
        break;
      }
    }
    
    return { applied, errors };
  }
  
  /**
   * Check if migrations are pending.
   */
  async hasPendingMigrations(): Promise<boolean> {
    const pending = await this.getPendingMigrations();
    return pending.length > 0;
  }
}
