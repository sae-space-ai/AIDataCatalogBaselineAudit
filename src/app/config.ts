// ============================================================
// APP — Application Configuration
// Centralized mode and infrastructure configuration
// ============================================================

/**
 * ApplicationMode defines the operational mode of the application.
 * 
 * DEMO: Uses DemoConnector + InMemoryRepository. No real persistence.
 *       All data is ephemeral and lost on page reload.
 * 
 * REAL: Uses real data sources and persistent storage.
 *       Requires configured infrastructure (database, API).
 * 
 * The mode is determined by infrastructure availability, NOT by a UI toggle.
 */
export type ApplicationMode = 'DEMO' | 'REAL';

/**
 * PersistenceMode describes the current persistence backend.
 */
export type PersistenceMode = 'IN_MEMORY' | 'POSTGRESQL' | 'NOT_CONFIGURED';

/**
 * DatabaseStatus describes the connectivity state of the catalog database.
 */
export type DatabaseStatus = 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'NOT_AVAILABLE';

/**
 * ApplicationConfig is the canonical source of operational mode.
 * It is determined by infrastructure availability.
 */
export interface ApplicationConfig {
  mode: ApplicationMode;
  persistence: PersistenceMode;
  databaseStatus: DatabaseStatus;
  apiBaseUrl?: string;
  features: {
    humanReview: boolean;
    realScan: boolean;
    realClassification: boolean;
    realQuality: boolean;
  };
}

/**
 * Determine application mode from environment.
 * 
 * IMPORTANT: This function NEVER reads secrets from the client.
 * It only checks for the presence of configuration flags.
 * 
 * In DEMO mode (default), the application uses InMemoryRepository.
 * In REAL mode, it would use API repositories pointing to a server.
 */
export function determineApplicationConfig(): ApplicationConfig {
  // In the current Vite SPA deployment, we cannot access server-side env vars.
  // The mode is determined by the presence of an API base URL.
  // 
  // When a real backend is deployed, VITE_API_BASE_URL will be set
  // (NOT a secret — just the public API endpoint).
  // DATABASE_URL and other secrets remain server-side only.
  
  const apiBaseUrl = typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as Record<string, string>).VITE_API_BASE_URL
    : undefined;
  
  const hasApi = Boolean(apiBaseUrl);
  
  const mode: ApplicationMode = hasApi ? 'REAL' : 'DEMO';
  const persistence: PersistenceMode = hasApi ? 'POSTGRESQL' : 'IN_MEMORY';
  const databaseStatus: DatabaseStatus = hasApi ? 'NOT_AVAILABLE' : 'NOT_CONFIGURED';
  
  return {
    mode,
    persistence,
    databaseStatus,
    apiBaseUrl,
    features: {
      // Human review requires authenticated identity
      // In DEMO mode, we use demo-reviewer as placeholder
      // In REAL mode without auth, human review is disabled
      humanReview: mode === 'DEMO',
      realScan: hasApi,
      realClassification: true, // Rule-based works in both modes
      realQuality: true, // Deterministic checks work in both modes
    },
  };
}

/**
 * Global configuration instance.
 * Initialized once at application startup.
 */
let _config: ApplicationConfig | null = null;

export function getConfig(): ApplicationConfig {
  if (!_config) {
    _config = determineApplicationConfig();
  }
  return _config;
}

/**
 * Reset configuration (useful for testing).
 */
export function resetConfig(): void {
  _config = null;
}

/**
 * Check if the application is running in DEMO mode.
 */
export function isDemoMode(): boolean {
  return getConfig().mode === 'DEMO';
}

/**
 * Check if the application is running in REAL mode.
 */
export function isRealMode(): boolean {
  return getConfig().mode === 'REAL';
}
