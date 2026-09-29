// ============================================================
// SERVER — Database Connection Factory
// ============================================================
//
// Manages PostgreSQL connections for the catalog database.
// 
// IMPORTANT: This is the CATALOG DATABASE (stores assets, classifications, etc.)
// NOT the DATA SOURCE DATABASE (external databases we inspect).
//
// The connection factory:
// - Reads DATABASE_URL from server config
// - Creates connection pools
// - Provides health checks
// - Handles cleanup
//

import type { ServerConfig } from './config';

/**
 * Database connection status.
 */
export type ConnectionStatus = 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'NOT_AVAILABLE';

/**
 * Database health information.
 */
export interface DatabaseHealth {
  status: ConnectionStatus;
  latency?: number;
  error?: string;
  poolSize?: number;
  activeConnections?: number;
}

/**
 * Database connection pool interface.
 * This abstracts the actual database driver (pg, etc.).
 */
export interface DatabasePool {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
  end(): Promise<void>;
}

/**
 * Database connection manager.
 */
export class DatabaseManager {
  private pool: DatabasePool | null = null;
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
  }
  
  /**
   * Check if database is configured.
   */
  isConfigured(): boolean {
    return Boolean(this.config.databaseUrl);
  }
  
  /**
   * Get or create the connection pool.
   * 
   * IMPORTANT: This method does NOT actually connect to the database yet.
   * It only creates the pool configuration. The actual connection happens
   * on the first query.
   * 
   * When a real PostgreSQL driver is added, this will initialize the pool.
   */
  getPool(): DatabasePool | null {
    if (!this.isConfigured()) {
      return null;
    }
    
    if (this.pool) {
      return this.pool;
    }
    
    // TODO: When implementing real PostgreSQL support:
    // 1. Add pg or postgres dependency
    // 2. Create pool: new Pool({ connectionString: this.config.databaseUrl })
    // 3. Return the pool
    
    // For now, return null to indicate pool is not yet implemented
    return null;
  }
  
  /**
   * Check database health.
   */
  async checkHealth(): Promise<DatabaseHealth> {
    if (!this.isConfigured()) {
      return {
        status: 'NOT_CONFIGURED',
      };
    }
    
    const pool = this.getPool();
    if (!pool) {
      return {
        status: 'NOT_AVAILABLE',
        error: 'Database pool not initialized (driver not implemented)',
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Simple health check query
      await pool.query('SELECT 1');
      const latency = Date.now() - startTime;
      
      return {
        status: 'CONNECTED',
        latency,
      };
    } catch (error) {
      return {
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Close the connection pool.
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

/**
 * Global database manager instance.
 */
let _dbManager: DatabaseManager | null = null;

/**
 * Get or create the database manager.
 */
export function getDatabaseManager(config: ServerConfig): DatabaseManager {
  if (!_dbManager) {
    _dbManager = new DatabaseManager(config);
  }
  return _dbManager;
}

/**
 * Reset the database manager (for testing).
 */
export function resetDatabaseManager(): void {
  _dbManager = null;
}
