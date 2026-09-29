// ============================================================
// SERVER — Configuration
// ============================================================
//
// Server-side configuration. This file runs ONLY on the server.
// It can safely read DATABASE_URL and other secrets.
//
// IMPORTANT: This file is NEVER bundled into the frontend.
// It runs in Vercel serverless functions (or equivalent).
//

/**
 * Server configuration interface.
 */
export interface ServerConfig {
  databaseUrl?: string;
  nodeEnv: string;
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Load server configuration from environment variables.
 * 
 * This function runs ONLY on the server. It can safely read
 * DATABASE_URL and other secrets that must never reach the client.
 */
export function loadServerConfig(): ServerConfig {
  // In Vercel serverless functions, process.env is available
  // In local development, we use .env files (never committed)
  
  const databaseUrl = process.env.DATABASE_URL;
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3000', 10);
  const logLevel = (process.env.LOG_LEVEL || 'info') as ServerConfig['logLevel'];
  
  return {
    databaseUrl,
    nodeEnv,
    port,
    logLevel,
  };
}

/**
 * Check if database is configured.
 */
export function isDatabaseConfigured(config: ServerConfig): boolean {
  return Boolean(config.databaseUrl);
}

/**
 * Validate that required configuration is present.
 * Returns an array of missing configuration keys.
 */
export function validateConfig(config: ServerConfig): string[] {
  const missing: string[] = [];
  
  if (!config.databaseUrl) {
    missing.push('DATABASE_URL');
  }
  
  return missing;
}

/**
 * Get a safe representation of the config for logging.
 * NEVER includes actual secret values.
 */
export function getSafeConfig(config: ServerConfig): Record<string, unknown> {
  return {
    nodeEnv: config.nodeEnv,
    port: config.port,
    logLevel: config.logLevel,
    databaseConfigured: isDatabaseConfigured(config),
    // NEVER include databaseUrl here
  };
}
