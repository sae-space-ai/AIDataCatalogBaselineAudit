// ============================================================
// INFRASTRUCTURE — PostgreSQL Source Connector
// ============================================================
//
// This connector inspects external PostgreSQL databases (DATA SOURCES)
// to discover assets (tables, columns, etc.).
//
// IMPORTANT: This is NOT the catalog database.
// - CATALOG DATABASE: Stores the catalog's own data (assets, classifications, etc.)
// - DATA SOURCE DATABASE: External databases that the catalog inspects
//
// Status: ADAPTER_READY
// 
// The connector contract is fully defined, but no real connection
// has been established. To activate:
// 1. Deploy a backend with access to the target PostgreSQL database
// 2. Configure connection credentials (server-side only, never in frontend)
// 3. Test the connection
//
// The frontend NEVER holds database credentials.
// All connections are made server-side.
//

import type {
  ConnectionTestResult,
  DataSourceConnector,
} from '../domain/contracts';
import type { DiscoveryResult } from '../types';

/**
 * PostgreSQLConnector inspects external PostgreSQL databases.
 * 
 * Status: ADAPTER_READY
 * 
 * This connector is architecturally ready but requires:
 * - A deployed backend (serverless function or service)
 * - Server-side database credentials (never in frontend)
 * - Network access to the target database
 * 
 * The frontend only holds a reference to the connector.
 * Actual database operations are performed server-side.
 */
export class PostgresConnector implements DataSourceConnector {
  private readonly connectionRef: string;
  
  constructor(connectionRef: string) {
    this.connectionRef = connectionRef;
  }
  
  /**
   * Test connection to the PostgreSQL database.
   * 
   * Currently: NOT_IMPLEMENTED
   * 
   * When implemented, this will:
   * 1. Send a request to the backend API
   * 2. Backend resolves credentials from secret manager
   * 3. Backend attempts connection
   * 4. Return success/failure with latency
   */
  async testConnection(): Promise<ConnectionTestResult> {
    // NOT_IMPLEMENTED — Requires backend deployment
    return {
      success: false,
      message: `[PostgreSQL] Connection not available. Backend not deployed. Connection ref: ${this.connectionRef}`,
    };
  }
  
  /**
   * Discover assets in the PostgreSQL database.
   * 
   * Currently: NOT_IMPLEMENTED
   * 
   * When implemented, this will:
   * 1. Query information_schema.tables
   * 2. Query information_schema.columns
   * 3. Extract metadata (row counts, constraints, etc.)
   * 4. Build discovery result with assets and relationships
   */
  async discover(): Promise<DiscoveryResult> {
    // NOT_IMPLEMENTED — Requires backend deployment
    throw new Error(
      'PostgreSQL discovery is not yet implemented. ' +
      'A backend must be deployed to inspect external databases.'
    );
  }
  
  /**
   * Extract metadata for a specific asset.
   * 
   * Currently: NOT_IMPLEMENTED
   */
  async extractMetadata(_qualifiedName: string): Promise<Record<string, unknown>> {
    // NOT_IMPLEMENTED — Requires backend deployment
    throw new Error(
      'PostgreSQL metadata extraction is not yet implemented. ' +
      'A backend must be deployed to extract metadata.'
    );
  }
  
  /**
   * Get connection reference (for debugging/logging).
   * This is NOT the actual connection string — just a reference ID.
   */
  getConnectionRef(): string {
    return this.connectionRef;
  }
}

/**
 * Connector status indicator.
 */
export const POSTGRES_CONNECTOR_STATUS = 'ADAPTER_READY' as const;
