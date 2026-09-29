// ============================================================
// API — Health Endpoint
// ============================================================
//
// GET /api/health
//
// Returns the health status of the application.
// This endpoint is used by the frontend to determine operational state.
//
// Response structure:
// {
//   application: 'READY' | 'DEGRADED' | 'ERROR',
//   api: 'READY' | 'NOT_CONFIGURED' | 'UNREACHABLE' | 'ERROR',
//   mode: 'DEMO' | 'REAL',
//   persistence: 'IN_MEMORY' | 'POSTGRESQL' | 'NOT_CONFIGURED',
//   database: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'NOT_AVAILABLE',
//   version: string,
//   timestamp: string
// }
//

import { loadServerConfig, getSafeConfig } from '../server/config';
import { getDatabaseManager } from '../server/db';

/**
 * Health check response.
 */
export interface HealthResponse {
  application: 'READY' | 'DEGRADED' | 'ERROR';
  api: 'READY' | 'NOT_CONFIGURED' | 'UNREACHABLE' | 'ERROR';
  mode: 'DEMO' | 'REAL';
  persistence: 'IN_MEMORY' | 'POSTGRESQL' | 'NOT_CONFIGURED';
  database: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'NOT_AVAILABLE';
  version: string;
  timestamp: string;
  details?: {
    config?: Record<string, unknown>;
    databaseHealth?: {
      status: string;
      latency?: number;
      error?: string;
    };
  };
}

/**
 * Handle GET /api/health request.
 */
export async function handleHealthCheck(): Promise<HealthResponse> {
  const config = loadServerConfig();
  const dbManager = getDatabaseManager(config);
  
  // Check database health
  const dbHealth = await dbManager.checkHealth();
  
  // Determine operational state
  const databaseConfigured = dbManager.isConfigured();
  const databaseConnected = dbHealth.status === 'CONNECTED';
  
  // Determine mode
  // REAL mode requires: database configured AND connected
  const mode: 'DEMO' | 'REAL' = databaseConfigured && databaseConnected ? 'REAL' : 'DEMO';
  
  // Determine persistence
  const persistence: 'IN_MEMORY' | 'POSTGRESQL' | 'NOT_CONFIGURED' = 
    databaseConnected ? 'POSTGRESQL' : 
    databaseConfigured ? 'NOT_CONFIGURED' : 
    'NOT_CONFIGURED';
  
  // Determine database status
  const database: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'NOT_AVAILABLE' = 
    dbHealth.status;
  
  // Determine API status
  // API is READY if this endpoint is responding
  const api: 'READY' | 'NOT_CONFIGURED' | 'UNREACHABLE' | 'ERROR' = 'READY';
  
  // Determine application status
  // Application is READY if API is ready
  // Application is DEGRADED if mode is REAL but database is not connected
  const application: 'READY' | 'DEGRADED' | 'ERROR' = 
    (mode === 'REAL' && !databaseConnected) ? 'DEGRADED' : 'READY';
  
  const response: HealthResponse = {
    application,
    api,
    mode,
    persistence,
    database,
    version: '1.0.0-baseline',
    timestamp: new Date().toISOString(),
    details: {
      config: getSafeConfig(config),
      databaseHealth: {
        status: dbHealth.status,
        latency: dbHealth.latency,
        error: dbHealth.error,
      },
    },
  };
  
  return response;
}

/**
 * Vercel serverless function handler.
 * 
 * This is the entry point for Vercel serverless functions.
 * It handles the HTTP request and returns a response.
 */
export default async function handler(req: any, res: any) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only GET requests are allowed',
      },
    });
  }
  
  try {
    const health = await handleHealthCheck();
    
    // Set cache headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.status(200).json(health);
  } catch (error) {
    console.error('[Health] Error:', error);
    
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Health check failed',
      },
    });
  }
}
