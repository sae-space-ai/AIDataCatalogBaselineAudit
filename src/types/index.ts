// ============================================================
// DOMAIN TYPES — AI Data Catalog
// VERTICAL SLICE 01
// ============================================================

// ---- ENUMS ----

export type AssetType =
  | 'DATABASE'
  | 'SCHEMA'
  | 'TABLE'
  | 'COLUMN'
  | 'DATASET';

export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'DEPRECATED' | 'DISCOVERED';

export type SensitivityLevel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' | 'UNKNOWN';

export type CertificationStatus = 'UNCERTIFIED' | 'CERTIFIED' | 'PENDING_REVIEW' | 'EXPIRED';

export type SourceType = 'POSTGRESQL' | 'DEMO';

export type SourceStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'NOT_CONNECTED';

export type ScanStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export type RelationshipType = 'CONTAINS' | 'DERIVED_FROM' | 'DEPENDS_ON';

export type ClassificationType =
  | 'PII_EMAIL'
  | 'PII_NAME'
  | 'PII_PHONE'
  | 'IDENTIFIER'
  | 'TIMESTAMP'
  | 'GEOGRAPHIC'
  | 'FINANCIAL'
  | 'NONE';

export type ClassificationMethod = 'RULE' | 'ML_MODEL' | 'PATTERN_MATCH' | 'HUMAN';

export type ReviewStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export type QualityRuleType = 'NULL_RATIO' | 'UNIQUENESS' | 'MIN_VALUE' | 'MAX_VALUE' | 'ROW_COUNT';

export type QualityStatus = 'PASS' | 'WARNING' | 'FAIL';

export type EvidenceType =
  | 'SOURCE_CREATED'
  | 'SOURCE_UPDATED'
  | 'SCAN_COMPLETED'
  | 'SCAN_FAILED'
  | 'ASSET_DISCOVERED'
  | 'ASSET_UPDATED'
  | 'CLASSIFICATION_CREATED'
  | 'CLASSIFICATION_REVIEWED'
  | 'QUALITY_CHECK_COMPLETED'
  | 'CONNECTION_TESTED';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'SCAN'
  | 'CLASSIFY'
  | 'REVIEW'
  | 'CONNECT';

// ---- CORE ENTITIES ----

export interface Asset {
  id: string;
  organizationId?: string;
  sourceId: string;
  type: AssetType;
  name: string;
  qualifiedName: string;
  description?: string;
  domain?: string;
  owner?: string;
  status: AssetStatus;
  sensitivity: SensitivityLevel;
  certificationStatus: CertificationStatus;
  metadata: AssetMetadata;
  createdAt: string;
  updatedAt: string;
}

export type AssetMetadata =
  | DatabaseMetadata
  | SchemaMetadata
  | TableMetadata
  | ColumnMetadata
  | DatasetMetadata;

export interface DatabaseMetadata {
  kind: 'DATABASE';
  engine?: string;
  version?: string;
  host?: string;
  port?: number;
}

export interface SchemaMetadata {
  kind: 'SCHEMA';
  databaseName: string;
  tableCount?: number;
}

export interface TableMetadata {
  kind: 'TABLE';
  schemaName: string;
  databaseName: string;
  rowCount?: number;
  columnCount?: number;
}

export interface ColumnMetadata {
  kind: 'COLUMN';
  tableName: string;
  schemaName: string;
  databaseName: string;
  dataType: string;
  nullable: boolean;
  ordinalPosition: number;
  defaultValue?: string;
}

export interface DatasetMetadata {
  kind: 'DATASET';
  format?: string;
  recordCount?: number;
  sizeBytes?: number;
}

// ---- VERSIONING ----

export interface AssetVersion {
  id: string;
  assetId: string;
  version: number;
  snapshot: Asset;
  changedAt: string;
  changedBy: string;
  reason: string;
}

// ---- RELATIONSHIPS ----

export interface AssetRelationship {
  id: string;
  sourceAssetId: string;
  targetAssetId: string;
  type: RelationshipType;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ---- SOURCES ----

export interface DataSource {
  id: string;
  name: string;
  type: SourceType;
  description?: string;
  status: SourceStatus;
  configuration: SourceConfiguration;
  createdAt: string;
  updatedAt: string;
  lastScanAt?: string;
}

export type SourceConfiguration = PostgresConfiguration | DemoConfiguration;

export interface PostgresConfiguration {
  kind: 'POSTGRESQL';
  host: string;
  port: number;
  database: string;
  // NOTE: credentials stored as reference, never inline
  credentialRef: string;
}

export interface DemoConfiguration {
  kind: 'DEMO';
  datasetName: string;
}

// ---- SCAN ----

export interface ScanRun {
  id: string;
  sourceId: string;
  status: ScanStatus;
  startedAt: string;
  finishedAt?: string;
  assetsDiscovered: number;
  assetsUpdated: number;
  error?: string;
}

// ---- CLASSIFICATION ----

export interface Classification {
  id: string;
  assetId: string;
  classificationType: ClassificationType;
  confidence: number;
  method: ClassificationMethod;
  reason: string;
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// ---- QUALITY ----

export interface QualityResult {
  id: string;
  assetId: string;
  ruleType: QualityRuleType;
  measuredValue: number;
  threshold: number;
  status: QualityStatus;
  timestamp: string;
  details?: string;
}

// ---- TRUST SCORE ----

export interface TrustScore {
  assetId: string;
  score: number;
  components: TrustScoreComponent[];
  explanation: string;
  calculatedAt: string;
}

export interface TrustScoreComponent {
  factor: string;
  weight: number;
  value: number;
  contribution: number;
}

// ---- EVIDENCE ----

export interface EvidenceRecord {
  id: string;
  type: EvidenceType;
  subjectType: string;
  subjectId: string;
  actor: string;
  timestamp: string;
  source: string;
  metadata?: Record<string, unknown>;
}

// ---- AUDIT ----

export interface AuditEvent {
  id: string;
  actor: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// ---- DISCOVERY RESULT ----

export interface DiscoveredAsset {
  type: AssetType;
  name: string;
  qualifiedName: string;
  description?: string;
  metadata: AssetMetadata;
  parentQualifiedName?: string;
}

export interface DiscoveryResult {
  assets: DiscoveredAsset[];
  relationships: Array<{
    sourceQualifiedName: string;
    targetQualifiedName: string;
    type: RelationshipType;
  }>;
}

// ---- SEARCH ----

export interface SearchQuery {
  text?: string;
  type?: AssetType;
  sourceId?: string;
  sensitivity?: SensitivityLevel;
  qualityStatus?: QualityStatus;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  assets: Asset[];
  total: number;
  page: number;
  pageSize: number;
}
