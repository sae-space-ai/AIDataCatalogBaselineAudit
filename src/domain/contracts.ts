// ============================================================
// DOMAIN CONTRACTS — Repository & Connector interfaces
// ============================================================

import type {
  Asset,
  AssetRelationship,
  AssetVersion,
  AuditEvent,
  Classification,
  DataSource,
  DiscoveryResult,
  EvidenceRecord,
  QualityResult,
  ScanRun,
  SearchQuery,
  SearchResult,
  TrustScore,
} from '../types';

// ---- REPOSITORY CONTRACTS ----

export interface AssetRepository {
  getAll(): Asset[];
  getById(id: string): Asset | undefined;
  getBySourceId(sourceId: string): Asset[];
  save(asset: Asset): void;
  saveMany(assets: Asset[]): void;
  update(id: string, updates: Partial<Asset>): Asset | undefined;
  delete(id: string): boolean;
  search(query: SearchQuery): SearchResult;
}

export interface AssetVersionRepository {
  getByAssetId(assetId: string): AssetVersion[];
  save(version: AssetVersion): void;
}

export interface RelationshipRepository {
  getAll(): AssetRelationship[];
  getByAssetId(assetId: string): AssetRelationship[];
  save(relationship: AssetRelationship): void;
  saveMany(relationships: AssetRelationship[]): void;
  getUpstream(assetId: string): AssetRelationship[];
  getDownstream(assetId: string): AssetRelationship[];
}

export interface SourceRepository {
  getAll(): DataSource[];
  getById(id: string): DataSource | undefined;
  save(source: DataSource): void;
  update(id: string, updates: Partial<DataSource>): DataSource | undefined;
  delete(id: string): boolean;
}

export interface ScanRepository {
  getAll(): ScanRun[];
  getBySourceId(sourceId: string): ScanRun[];
  getById(id: string): ScanRun | undefined;
  save(scan: ScanRun): void;
  update(id: string, updates: Partial<ScanRun>): ScanRun | undefined;
}

export interface ClassificationRepository {
  getAll(): Classification[];
  getByAssetId(assetId: string): Classification[];
  save(classification: Classification): void;
  update(id: string, updates: Partial<Classification>): Classification | undefined;
}

export interface QualityRepository {
  getAll(): QualityResult[];
  getByAssetId(assetId: string): QualityResult[];
  save(result: QualityResult): void;
}

export interface EvidenceRepository {
  getAll(): EvidenceRecord[];
  getBySubjectId(subjectId: string): EvidenceRecord[];
  save(record: EvidenceRecord): void;
}

export interface AuditRepository {
  getAll(): AuditEvent[];
  getByResourceId(resourceId: string): AuditEvent[];
  save(event: AuditEvent): void;
}

export interface TrustScoreRepository {
  getByAssetId(assetId: string): TrustScore | undefined;
  save(score: TrustScore): void;
  getAll(): TrustScore[];
}

// ---- CONNECTOR CONTRACT ----

export interface DataSourceConnector {
  testConnection(): Promise<ConnectionTestResult>;
  discover(): Promise<DiscoveryResult>;
  extractMetadata(qualifiedName: string): Promise<Record<string, unknown>>;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

// ---- CONNECTOR REGISTRY ----

export interface ConnectorRegistry {
  getConnector(sourceType: string): DataSourceConnector | undefined;
}
