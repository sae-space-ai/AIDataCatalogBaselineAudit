// ============================================================
// CONNECTORS — Core Types
// ============================================================

export type ConnectorCategory =
  | 'RELATIONAL_DATABASE'
  | 'FILE'
  | 'OBJECT_STORAGE'
  | 'DATA_WAREHOUSE'
  | 'DATA_LAKE'
  | 'SAAS'
  | 'REST_API'
  | 'BI'
  | 'STREAMING'
  | 'OTHER';

export type ConnectorImplementationLevel =
  | 'IMPLEMENTED'
  | 'IMPLEMENTED_NOT_VERIFIED'
  | 'PARTIAL'
  | 'ADAPTER_READY'
  | 'MODEL_ONLY'
  | 'NOT_IMPLEMENTED';

export type ConnectorCapability =
  | 'TEST_CONNECTION'
  | 'DISCOVER_SCHEMAS'
  | 'DISCOVER_TABLES'
  | 'DISCOVER_COLUMNS'
  | 'DISCOVER_RELATIONSHIPS'
  | 'EXTRACT_METADATA'
  | 'EXTRACT_STATISTICS'
  | 'EXTRACT_CONSTRAINTS'
  | 'EXTRACT_INDEXES'
  | 'EXTRACT_VIEWS'
  | 'EXTRACT_LINEAGE'
  | 'CHANGE_DETECTION'
  | 'INCREMENTAL_SCAN'
  | 'SAMPLE_DATA'
  | 'STREAM_EVENTS';

export type DiscoverySessionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export type SourceHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'UNREACHABLE'
  | 'AUTHENTICATION_REQUIRED'
  | 'CONFIGURATION_ERROR'
  | 'NOT_TESTED';

export type ScanMode = 'FULL' | 'INCREMENTAL' | 'METADATA_ONLY' | 'QUALITY_REFRESH';

export type AssetDiscoveryType =
  | 'DATABASE'
  | 'SCHEMA'
  | 'TABLE'
  | 'VIEW'
  | 'COLUMN'
  | 'FILE'
  | 'DATASET'
  | 'REPORT'
  | 'STREAM'
  | 'API_RESOURCE';

export type SchemaChangeType =
  | 'OBJECT_ADDED'
  | 'OBJECT_REMOVED'
  | 'OBJECT_RENAMED'
  | 'COLUMN_ADDED'
  | 'COLUMN_REMOVED'
  | 'TYPE_CHANGED'
  | 'NULLABILITY_CHANGED'
  | 'RELATIONSHIP_CHANGED'
  | 'CONSTRAINT_CHANGED';

// ---- Connector Definition ----

export interface ConnectorDefinition {
  id: string;
  name: string;
  category: ConnectorCategory;
  version: string;
  implementationLevel: ConnectorImplementationLevel;
  capabilities: ConnectorCapability[];
  configurationSchema: ConfigurationSchema;
  secretRequirements: SecretRequirement[];
  supportedOperations: string[];
  readOnlySupport: boolean;
  limitations: string[];
  documentation: ConnectorDocumentation;
}

export interface ConfigurationSchema {
  fields: ConfigurationField[];
}

export interface ConfigurationField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  description: string;
  required: boolean;
  defaultValue?: unknown;
  options?: string[];
  sensitive: boolean;
}

export interface SecretRequirement {
  name: string;
  description: string;
  provider?: string;
  reference?: string;
}

export interface ConnectorDocumentation {
  status: string;
  capabilities: string[];
  requirements: string[];
  limitations: string[];
  secretRequirements: string[];
  readOnlyBehavior: string;
  verificationStatus: string;
}

// ---- Secret Reference ----

export interface SecretReference {
  provider: string;
  reference: string;
  status: 'CONFIGURED' | 'NOT_CONFIGURED' | 'ERROR';
}

// ---- Connection Test ----

export interface ConnectionTestResult {
  success: boolean;
  connectorId: string;
  timestamp: string;
  latency?: number;
  capabilitiesDetected: ConnectorCapability[];
  serverInformationSafe?: Record<string, string>;
  warnings: string[];
  errorCode?: string;
  errorMessageSafe?: string;
}

// ---- Discovery Session ----

export interface DiscoverySession {
  id: string;
  sourceId: string;
  connectorId: string;
  status: DiscoverySessionStatus;
  startedAt: string;
  completedAt?: string;
  discoveredAssets: number;
  discoveredRelationships: number;
  metadataExtracted: number;
  warnings: string[];
  errors: DiscoveryError[];
  correlationId: string;
}

export interface DiscoveryError {
  code: string;
  message: string;
  objectIdentifier?: string;
  recoverable: boolean;
}

// ---- Scan Scope ----

export interface ScanScope {
  includeSchemas?: string[];
  excludeSchemas?: string[];
  includeObjects?: string[];
  excludeObjects?: string[];
  assetTypes?: AssetDiscoveryType[];
  metadataDepth: 'BASIC' | 'STANDARD' | 'DEEP';
  statisticsEnabled: boolean;
  relationshipDiscoveryEnabled: boolean;
}

// ---- Scan Policy ----

export interface ScanPolicy {
  mode: ScanMode;
  timeout: number;
  maxAssets: number;
  statisticsPolicy: StatisticsCollectionPolicy;
  failurePolicy: FailurePolicy;
  incremental: boolean;
  changeDetection: boolean;
}

export interface StatisticsCollectionPolicy {
  timeout: number;
  maximumRowsSampled: number;
  allowFullCount: boolean;
  allowSampling: boolean;
  allowedStatistics: string[];
}

export interface FailurePolicy {
  maxRetries: number;
  retryDelay: number;
  continueOnPartialFailure: boolean;
  escalateAfterRetries: boolean;
}

// ---- Scan Plan ----

export interface ScanPlan {
  id: string;
  sourceId: string;
  connectorId: string;
  mode: ScanMode;
  scope: ScanScope;
  policy: ScanPolicy;
  estimatedAssets: number;
  estimatedDuration: number;
  capabilitiesRequired: ConnectorCapability[];
  capabilitiesAvailable: ConnectorCapability[];
  capabilitiesMissing: ConnectorCapability[];
  warnings: string[];
  canProceed: boolean;
}

// ---- Source Health ----

export interface SourceHealth {
  sourceId: string;
  status: SourceHealthStatus;
  lastTestedAt?: string;
  lastSuccessfulScanAt?: string;
  lastMetadataRefreshAt?: string;
  lastQualityRefreshAt?: string;
  lastChangeDetectionAt?: string;
  details?: string;
}

// ---- Schema Change ----

export interface SchemaChange {
  id: string;
  sourceId: string;
  type: SchemaChangeType;
  objectIdentifier: string;
  previousState?: Record<string, unknown>;
  currentState?: Record<string, unknown>;
  detectedAt: string;
  scanRunId: string;
  confidence: number;
}

// ---- Asset Identity ----

export interface AssetIdentity {
  sourceId: string;
  nativeIdentifier: string;
  qualifiedName: string;
}

// ---- Ingestion Metrics ----

export interface IngestionMetrics {
  sources: number;
  scans: number;
  successfulScans: number;
  partialScans: number;
  failedScans: number;
  assetsDiscovered: number;
  assetsChanged: number;
  relationshipsDiscovered: number;
  metadataEntries: number;
  averageScanDuration: number;
  connectorErrors: number;
}

// ---- Rate Limit Policy ----

export interface RateLimitPolicy {
  maxRequestsPerSecond: number;
  maxRequestsPerMinute: number;
  maxConcurrentConnections: number;
  retryAfterFailure: number;
}

// ---- Performance Guards ----

export interface PerformanceGuards {
  maxAssetsPerScan: number;
  maxMetadataPayload: number;
  maxStatisticsQueries: number;
  maxScanDuration: number;
  maxConcurrency: number;
  maxFileSize: number;
  maxSampleSize: number;
}

// ---- Discovered Object ----

export interface DiscoveredObject {
  type: AssetDiscoveryType;
  nativeIdentifier: string;
  name: string;
  qualifiedName: string;
  description?: string;
  metadata: Record<string, unknown>;
  parentQualifiedName?: string;
  statistics?: Record<string, unknown>;
}
