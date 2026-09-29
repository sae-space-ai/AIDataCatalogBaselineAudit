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
 * Currently: NOT_IMPLEMENTED
 * 
 * When a real backend is available, this function will return
 * API-backed repository implementations that communicate with
 * the server via HTTP.
 * 
 * The server will handle:
 * - Database connections (DATABASE_URL is server-side only)
 * - Authentication
 * - Authorization
 * - Transaction management
 * 
 * The client will only hold public API URLs, never secrets.
 */
export function createRealRepositoryBundle(_apiBaseUrl: string): RepositoryBundle {
  // NOT_IMPLEMENTED — Real repositories require a deployed backend.
  // When implemented, this will return API-backed repositories.
  //
  // Example future implementation:
  // return {
  //   assetRepo: new ApiAssetRepository(apiBaseUrl),
  //   assetVersionRepo: new ApiAssetVersionRepository(apiBaseUrl),
  //   ...
  // };
  
  throw new Error(
    'REAL mode repositories are not yet implemented. ' +
    'A backend API must be deployed before REAL mode can be activated. ' +
    'Falling back to DEMO mode.'
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
