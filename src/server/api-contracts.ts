// ============================================================
// SERVER — API Contract Definitions
// ============================================================
//
// This module defines the API contract between the frontend (Vite SPA)
// and the future backend (serverless functions).
//
// IMPORTANT: These contracts are NOT yet implemented.
// They define the expected API shape for when a backend is deployed.
//
// The backend will be implemented as Vercel Serverless Functions
// (or equivalent) and will:
// - Connect to PostgreSQL using DATABASE_URL (server-side only)
// - Handle authentication/authorization
// - Execute scans, classifications, quality checks
// - Return structured responses
//
// The frontend will consume this API via HTTP, never connecting
// directly to the database.
//

// ---- Request/Response Types ----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---- Health Check ----

export interface HealthResponse {
  application: 'READY' | 'DEGRADED' | 'ERROR';
  mode: 'DEMO' | 'REAL';
  persistence: 'IN_MEMORY' | 'POSTGRESQL' | 'NOT_CONFIGURED';
  database: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'NOT_AVAILABLE';
  version: string;
  timestamp: string;
}

// ---- Sources API ----

export interface ListSourcesResponse {
  sources: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    lastScanAt?: string;
  }>;
}

export interface CreateSourceRequest {
  name: string;
  type: string;
  description?: string;
  configuration: unknown;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  latencyMs?: number;
}

export interface ScanResponse {
  scanRunId: string;
  status: string;
  assetsDiscovered: number;
  assetsUpdated: number;
  relationshipsCreated: number;
  classificationsCreated: number;
  qualityChecksCreated: number;
  errors: string[];
}

// ---- Assets API ----

export interface ListAssetsRequest {
  text?: string;
  type?: string;
  sourceId?: string;
  sensitivity?: string;
  qualityStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ListAssetsResponse extends PaginatedResponse<{
  id: string;
  type: string;
  name: string;
  qualifiedName: string;
  description?: string;
  sourceId: string;
  status: string;
  sensitivity: string;
  certificationStatus: string;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  trustScore?: number;
  classificationSummary?: {
    type: string;
    confidence: number;
    status: string;
  };
  qualitySummary?: {
    passRate: number;
    issues: number;
  };
}> {}

export interface GetAssetResponse {
  asset: {
    id: string;
    type: string;
    name: string;
    qualifiedName: string;
    description?: string;
    sourceId: string;
    status: string;
    sensitivity: string;
    certificationStatus: string;
    metadata: unknown;
    createdAt: string;
    updatedAt: string;
  };
  versions: Array<{
    id: string;
    version: number;
    changedAt: string;
    changedBy: string;
    reason: string;
  }>;
  relationships: Array<{
    id: string;
    sourceAssetId: string;
    targetAssetId: string;
    type: string;
  }>;
  classifications: Array<{
    id: string;
    classificationType: string;
    confidence: number;
    method: string;
    reason: string;
    reviewStatus: string;
  }>;
  qualityResults: Array<{
    id: string;
    ruleType: string;
    measuredValue: number;
    threshold: number;
    status: string;
    timestamp: string;
  }>;
  trustScore?: {
    score: number;
    components: Array<{
      factor: string;
      weight: number;
      value: number;
      contribution: number;
    }>;
    explanation: string;
  };
}

// ---- Classifications API ----

export interface ReviewClassificationRequest {
  status: 'CONFIRMED' | 'REJECTED' | 'NEEDS_REVIEW';
  comment?: string;
}

// ---- API Client Interface ----

/**
 * ApiClient defines the contract for communicating with the backend.
 * 
 * In DEMO mode, this client is NOT used — the application uses
 * InMemoryRepository directly.
 * 
 * In REAL mode, this client makes HTTP requests to the backend API.
 * The backend handles all database operations.
 */
export interface ApiClient {
  // Health
  health(): Promise<HealthResponse>;
  
  // Sources
  listSources(): Promise<ListSourcesResponse>;
  createSource(request: CreateSourceRequest): Promise<ApiResponse<{ id: string }>>;
  testConnection(sourceId: string): Promise<TestConnectionResponse>;
  runScan(sourceId: string): Promise<ScanResponse>;
  
  // Assets
  listAssets(request?: ListAssetsRequest): Promise<ListAssetsResponse>;
  getAsset(id: string): Promise<GetAssetResponse>;
  
  // Classifications
  reviewClassification(id: string, request: ReviewClassificationRequest): Promise<ApiResponse<unknown>>;
  
  // Evidence & Audit
  listEvidence(params?: { subjectId?: string }): Promise<ApiResponse<unknown[]>>;
  listAudit(params?: { resourceId?: string }): Promise<ApiResponse<unknown[]>>;
}

/**
 * Create an API client for the given base URL.
 * 
 * Currently: NOT_IMPLEMENTED
 * 
 * When implemented, this will return an HTTP client that
 * communicates with the backend API.
 */
export function createApiClient(_baseUrl: string): ApiClient {
  throw new Error(
    'API client is not yet implemented. ' +
    'A backend must be deployed before REAL mode can be activated.'
  );
}
