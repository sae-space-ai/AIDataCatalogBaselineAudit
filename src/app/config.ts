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
 * OperationalState provides granular visibility into the application's
 * operational status. This is separate from ApplicationMode.
 * 
 * DEMO: Application is using demo infrastructure.
 * REAL_PENDING: API configured but backend/database not yet verified.
 * REAL: Backend available and PostgreSQL connected.
 * DEGRADED: REAL requested but one or more critical components failed.
 */
export type OperationalState = 'DEMO' | 'REAL_PENDING' | 'REAL' | 'DEGRADED';

/**
 * PersistenceMode describes the current persistence backend.
 */
export type PersistenceMode = 'IN_MEMORY' | 'POSTGRESQL' | 'NOT_CONFIGURED';

/**
 * DatabaseStatus describes the connectivity state of the catalog database.
 */
export type DatabaseStatus = 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'NOT_AVAILABLE';

/**
 * ApiStatus describes the availability of the backend API.
 */
export type ApiStatus = 'READY' | 'NOT_CONFIGURED' | 'UNREACHABLE' | 'ERROR';

/**
 * ApplicationConfig is the canonical source of operational mode.
 * It is determined by infrastructure availability.
 */
export interface ApplicationConfig {
  mode: ApplicationMode;
  operationalState: OperationalState;
  persistence: PersistenceMode;
  databaseStatus: DatabaseStatus;
  apiStatus: ApiStatus;
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
 * CRITICAL: The presence of VITE_API_BASE_URL does NOT automatically
 * activate REAL mode. It only indicates that an API endpoint is configured.
 * 
 * REAL mode is activated ONLY after the backend health check confirms:
 * - API is reachable
 * - Database is configured
 * - Database is connected
 * 
 * Until then, the application remains in DEMO mode or REAL_PENDING state.
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
  
  // IMPORTANT: Do NOT activate REAL mode automatically.
  // Start in DEMO mode. The operational state will be updated
  // after verifying the backend health endpoint.
  const mode: ApplicationMode = 'DEMO';
  const operationalState: OperationalState = hasApi ? 'REAL_PENDING' : 'DEMO';
  const persistence: PersistenceMode = 'IN_MEMORY';
  const databaseStatus: DatabaseStatus = 'NOT_CONFIGURED';
  const apiStatus: ApiStatus = hasApi ? 'NOT_CONFIGURED' : 'NOT_CONFIGURED';
  
  return {
    mode,
    operationalState,
    persistence,
    databaseStatus,
    apiStatus,
    apiBaseUrl,
    features: {
      // Human review requires authenticated identity
      // In DEMO mode, we use demo-reviewer as placeholder
      // In REAL mode without auth, human review is disabled
      humanReview: true, // Enabled in DEMO, will be disabled in REAL without auth
      realScan: false, // Disabled until REAL is verified
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

/**
 * Update operational state after verifying backend health.
 * 
 * This function should be called after successfully checking /api/health.
 * It updates the operational state based on the health check response.
 * 
 * @param healthResponse - Response from /api/health endpoint
 */
export function updateOperationalState(healthResponse: {
  mode: 'DEMO' | 'REAL';
  persistence: 'IN_MEMORY' | 'POSTGRESQL' | 'NOT_CONFIGURED';
  database: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'NOT_AVAILABLE';
  api: 'READY' | 'NOT_CONFIGURED' | 'UNREACHABLE' | 'ERROR';
}): void {
  const config = getConfig();
  
  // Update operational state based on health check
  let operationalState: OperationalState;
  let mode: ApplicationMode;
  
  if (healthResponse.mode === 'REAL' && 
      healthResponse.database === 'CONNECTED' && 
      healthResponse.api === 'READY') {
    operationalState = 'REAL';
    mode = 'REAL';
  } else if (healthResponse.mode === 'REAL' && 
             (healthResponse.database !== 'CONNECTED' || healthResponse.api !== 'READY')) {
    operationalState = 'DEGRADED';
    mode = 'REAL';
  } else {
    operationalState = 'DEMO';
    mode = 'DEMO';
  }
  
  // Update the global config
  _config = {
    ...config,
    mode,
    operationalState,
    persistence: healthResponse.persistence,
    databaseStatus: healthResponse.database,
    apiStatus: healthResponse.api,
    features: {
      ...config.features,
      humanReview: mode === 'DEMO', // Only enable in DEMO without auth
      realScan: mode === 'REAL' && healthResponse.database === 'CONNECTED',
    },
  };
}

/**
 * Get the current operational state.
 */
export function getOperationalState(): OperationalState {
  return getConfig().operationalState;
}

/**
 * Check if the application is in REAL_PENDING state.
 */
export function isRealPending(): boolean {
  return getConfig().operationalState === 'REAL_PENDING';
}

/**
 * Check if the application is in DEGRADED state.
 */
export function isDegraded(): boolean {
  return getConfig().operationalState === 'DEGRADED';
}
