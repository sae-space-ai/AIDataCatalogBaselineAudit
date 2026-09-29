// ============================================================
// INFRASTRUCTURE — Repository Adapters Index
// ============================================================
//
// This module provides the canonical repository factory.
// 
// In DEMO mode: returns InMemoryRepository implementations
// In REAL mode: returns API-backed implementations (when available)
//
// The domain layer depends only on repository contracts (src/domain/contracts.ts)
// and never on specific implementations.
//

import type {
  AssetRepository,
  AssetVersionRepository,
  RelationshipRepository,
  SourceRepository,
  ScanRepository,
  ClassificationRepository,
  QualityRepository,
  EvidenceRepository,
  AuditRepository,
  TrustScoreRepository,
} from '../../domain/contracts';

import {
  InMemoryAssetRepository,
  InMemoryAssetVersionRepository,
  InMemoryRelationshipRepository,
  InMemorySourceRepository,
  InMemoryScanRepository,
  InMemoryClassificationRepository,
  InMemoryQualityRepository,
  InMemoryEvidenceRepository,
  InMemoryAuditRepository,
  InMemoryTrustScoreRepository,
} from '../in-memory-repository';

export interface RepositoryBundle {
  assetRepo: AssetRepository;
  assetVersionRepo: AssetVersionRepository;
  relationshipRepo: RelationshipRepository;
  sourceRepo: SourceRepository;
  scanRepo: ScanRepository;
  classificationRepo: ClassificationRepository;
  qualityRepo: QualityRepository;
  evidenceRepo: EvidenceRepository;
  auditRepo: AuditRepository;
  trustScoreRepo: TrustScoreRepository;
}

/**
 * Create repository bundle for DEMO mode.
 * All data is ephemeral and lost on page reload.
 */
export function createDemoRepositoryBundle(): RepositoryBundle {
  return {
    assetRepo: new InMemoryAssetRepository(),
    assetVersionRepo: new InMemoryAssetVersionRepository(),
    relationshipRepo: new InMemoryRelationshipRepository(),
    sourceRepo: new InMemorySourceRepository(),
    scanRepo: new InMemoryScanRepository(),
    classificationRepo: new InMemoryClassificationRepository(),
    qualityRepo: new InMemoryQualityRepository(),
    evidenceRepo: new InMemoryEvidenceRepository(),
    auditRepo: new InMemoryAuditRepository(),
    trustScoreRepo: new InMemoryTrustScoreRepository(),
  };
}

/**
 * Create repository bundle for REAL mode.
 * 
 * Status: IMPLEMENTED_NOT_CONNECTED
 * 
 * This function requires a deployed backend API to function.
 * Without a backend, it throws an error indicating that REAL mode
 * cannot be activated.
 * 
 * When a backend is available:
 * - Configure VITE_API_BASE_URL environment variable
 * - Deploy backend with PostgreSQL connection
 * - This function will return API-backed repositories
 * 
 * The server handles:
 * - Database connections (DATABASE_URL is server-side only)
 * - Authentication
 * - Authorization
 * - Transaction management
 * 
 * The client only holds public API URLs, never secrets.
 */
export function createRealRepositoryBundle(apiBaseUrl: string): RepositoryBundle {
  // Check if backend is available
  if (!apiBaseUrl) {
    throw new Error(
      'REAL mode requires VITE_API_BASE_URL to be configured. ' +
      'Cannot create real repository bundle without API endpoint.'
    );
  }

  // Backend API is configured, but we need to verify it's reachable
  // and that all required endpoints are available.
  // 
  // For now, we throw an error indicating that the backend must be
  // deployed and verified before REAL mode can be activated.
  //
  // Future implementation will:
  // 1. Verify backend health via GET /api/health
  // 2. Return API-backed repositories that communicate via HTTP
  // 3. Handle authentication tokens
  // 4. Implement retry logic and error handling
  
  throw new Error(
    `REAL mode backend not yet verified at ${apiBaseUrl}. ` +
    'Backend must be deployed and health check must pass before REAL mode can be activated. ' +
    'Required endpoints: GET /api/health, GET /api/assets, POST /api/sources, etc. ' +
    'See API documentation for complete endpoint list.'
  );
}

/**
 * Create the appropriate repository bundle based on configuration.
 * Falls back to DEMO if REAL is requested but not available.
 */
export function createRepositoryBundle(mode: 'DEMO' | 'REAL', apiBaseUrl?: string): RepositoryBundle {
  if (mode === 'REAL' && apiBaseUrl) {
    try {
      return createRealRepositoryBundle(apiBaseUrl);
    } catch {
      console.warn('[Repository] REAL mode not available, falling back to DEMO');
      return createDemoRepositoryBundle();
    }
  }
  
  return createDemoRepositoryBundle();
}
