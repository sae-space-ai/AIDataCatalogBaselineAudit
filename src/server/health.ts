// ============================================================
// SERVER — Health Check Endpoint
// ============================================================
//
// This module defines the health check contract.
// 
// The health endpoint provides visibility into:
// - Application status
// - Operational mode (DEMO/REAL)
// - Persistence backend status
// - Database connectivity
//
// This is NOT yet implemented as a real endpoint.
// It defines the expected response shape.
//

import type { ApplicationConfig } from '../app/config';

export interface HealthStatus {
  application: 'READY' | 'DEGRADED' | 'ERROR';
  mode: 'DEMO' | 'REAL';
  persistence: 'IN_MEMORY' | 'POSTGRESQL' | 'NOT_CONFIGURED';
  database: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'NOT_AVAILABLE';
  version: string;
  timestamp: string;
  details?: {
    uptime?: number;
    memoryUsage?: {
      heapUsed: number;
      heapTotal: number;
    };
    repositoryStats?: {
      assets: number;
      sources: number;
      scans: number;
    };
  };
}

/**
 * Generate health status from application config.
 * 
 * This is a client-side implementation for DEMO mode.
 * In REAL mode, the server would provide this endpoint.
 */
export function generateHealthStatus(config: ApplicationConfig): HealthStatus {
  return {
    application: 'READY',
    mode: config.mode,
    persistence: config.persistence,
    database: config.databaseStatus,
    version: '1.0.0-baseline',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Health check response for DEMO mode.
 */
export function getDemoHealthStatus(): HealthStatus {
  return {
    application: 'READY',
    mode: 'DEMO',
    persistence: 'IN_MEMORY',
    database: 'NOT_CONFIGURED',
    version: '1.0.0-baseline',
    timestamp: new Date().toISOString(),
  };
}
