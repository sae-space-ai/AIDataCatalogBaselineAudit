// ============================================================
// TESTS — Vertical Slice 01
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { DemoConnector } from '../src/infrastructure/demo-connector';
import { ClassificationEngine } from '../src/services/classification-engine';
import { QualityEngine } from '../src/services/quality-engine';
import { TrustScoreService } from '../src/services/trust-score';
import { SearchService } from '../src/services/search-service';
import { ScanEngine } from '../src/services/scan-engine';
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
} from '../src/infrastructure/in-memory-repository';
import type { ConnectorRegistry, DataSourceConnector } from '../src/domain/contracts';
import type { Asset, DataSource } from '../src/types';
import { generateId } from '../src/lib/utils';

// ---- DemoConnector Tests ----

describe('DemoConnector', () => {
  let connector: DemoConnector;

  beforeEach(() => {
    connector = new DemoConnector('test_dataset');
  });

  it('should return a successful connection test', async () => {
    const result = await connector.testConnection();
    expect(result.success).toBe(true);
    expect(result.message).toContain('DEMO');
    expect(result.latencyMs).toBeGreaterThan(0);
  });

  it('should discover assets with correct structure', async () => {
    const result = await connector.discover();

    expect(result.assets.length).toBeGreaterThan(0);

    // Should have at least: 1 database, 1 schema, 1 table, 6 columns
    const types = result.assets.map(a => a.type);
    expect(types).toContain('DATABASE');
    expect(types).toContain('SCHEMA');
    expect(types).toContain('TABLE');
    expect(types).toContain('COLUMN');

    // All assets should have qualified names
    for (const asset of result.assets) {
      expect(asset.qualifiedName).toBeTruthy();
      expect(asset.name).toBeTruthy();
      expect(asset.metadata).toBeTruthy();
    }
  });

  it('should create CONTAINS relationships', async () => {
    const result = await connector.discover();

    expect(result.relationships.length).toBeGreaterThan(0);

    // All relationships should be CONTAINS type
    for (const rel of result.relationships) {
      expect(rel.type).toBe('CONTAINS');
      expect(rel.sourceQualifiedName).toBeTruthy();
      expect(rel.targetQualifiedName).toBeTruthy();
    }
  });

  it('should return column stats for quality engine', () => {
    const stats = connector.getColumnStats('demo_catalog_db.public.customers.email');
    expect(stats).toBeDefined();
    expect(stats!.name).toBe('email');
    expect(stats!.rowCount).toBe(1000);
    expect(stats!.nullCount).toBe(0);
  });

  it('should extract metadata for columns', async () => {
    const metadata = await connector.extractMetadata('demo_catalog_db.public.customers.email');
    expect(metadata.isDemo).toBe(true);
    expect(metadata.rowCount).toBe(1000);
    expect(metadata.nullRatio).toBeDefined();
  });
});

// ---- Classification Engine Tests ----

describe('ClassificationEngine', () => {
  let engine: ClassificationEngine;
  let classificationRepo: InMemoryClassificationRepository;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    classificationRepo = new InMemoryClassificationRepository();
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    engine = new ClassificationEngine(classificationRepo, evidenceRepo, auditRepo);
  });

  it('should classify email column as PII_EMAIL', () => {
    const asset = createMockColumn('email', 'varchar(255)');
    const result = engine.classifyAsset(asset);

    expect(result).not.toBeNull();
    expect(result!.classificationType).toBe('PII_EMAIL');
    expect(result!.confidence).toBeGreaterThan(0.9);
    expect(result!.method).toBe('RULE');
    expect(result!.reviewStatus).toBe('PENDING');
  });

  it('should classify phone column as PII_PHONE', () => {
    const asset = createMockColumn('phone', 'varchar(20)');
    const result = engine.classifyAsset(asset);

    expect(result).not.toBeNull();
    expect(result!.classificationType).toBe('PII_PHONE');
    expect(result!.confidence).toBeGreaterThan(0.8);
  });

  it('should classify customer_id as IDENTIFIER', () => {
    const asset = createMockColumn('customer_id', 'integer');
    const result = engine.classifyAsset(asset);

    expect(result).not.toBeNull();
    expect(result!.classificationType).toBe('IDENTIFIER');
  });

  it('should classify created_at as TIMESTAMP', () => {
    const asset = createMockColumn('created_at', 'timestamp');
    const result = engine.classifyAsset(asset);

    expect(result).not.toBeNull();
    expect(result!.classificationType).toBe('TIMESTAMP');
  });

  it('should classify region as GEOGRAPHIC', () => {
    const asset = createMockColumn('region', 'varchar(50)');
    const result = engine.classifyAsset(asset);

    expect(result).not.toBeNull();
    expect(result!.classificationType).toBe('GEOGRAPHIC');
  });

  it('should not classify non-column assets', () => {
    const asset: Asset = {
      id: generateId(),
      sourceId: 'source-1',
      type: 'TABLE',
      name: 'customers',
      qualifiedName: 'db.schema.customers',
      status: 'DISCOVERED',
      sensitivity: 'UNKNOWN',
      certificationStatus: 'UNCERTIFIED',
      metadata: { kind: 'TABLE', schemaName: 'schema', databaseName: 'db', rowCount: 100, columnCount: 6 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = engine.classifyAsset(asset);
    expect(result).toBeNull();
  });

  it('should generate evidence on classification', () => {
    const asset = createMockColumn('email', 'varchar(255)');
    engine.classifyAsset(asset);

    const evidence = evidenceRepo.getAll();
    expect(evidence.length).toBe(1);
    expect(evidence[0].type).toBe('CLASSIFICATION_CREATED');
  });

  it('should classify multiple assets', () => {
    const assets = [
      createMockColumn('email', 'varchar'),
      createMockColumn('phone', 'varchar'),
      createMockColumn('region', 'varchar'),
    ];

    const results = engine.classifyAll(assets);
    expect(results.length).toBe(3);
    expect(results[0].classificationType).toBe('PII_EMAIL');
    expect(results[1].classificationType).toBe('PII_PHONE');
    expect(results[2].classificationType).toBe('GEOGRAPHIC');
  });

  it('should allow reviewing classifications', () => {
    const asset = createMockColumn('email', 'varchar');
    const classification = engine.classifyAsset(asset)!;

    const reviewed = engine.reviewClassification(classification.id, 'CONFIRMED', 'test-user');
    expect(reviewed).toBeDefined();
    expect(reviewed!.reviewStatus).toBe('CONFIRMED');
    expect(reviewed!.reviewedBy).toBe('test-user');
    expect(reviewed!.reviewedAt).toBeTruthy();
  });
});

// ---- Quality Engine Tests ----

describe('QualityEngine', () => {
  let engine: QualityEngine;
  let qualityRepo: InMemoryQualityRepository;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;
  let demoConnector: DemoConnector;

  beforeEach(() => {
    qualityRepo = new InMemoryQualityRepository();
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    demoConnector = new DemoConnector();
    engine = new QualityEngine(qualityRepo, evidenceRepo, auditRepo, demoConnector);
  });

  it('should check null ratio for columns', () => {
    const asset = createMockColumn('email', 'varchar(255)');
    const results = engine.checkAsset(asset);

    expect(results.length).toBeGreaterThan(0);
    const nullCheck = results.find(r => r.ruleType === 'NULL_RATIO');
    expect(nullCheck).toBeDefined();
    expect(nullCheck!.measuredValue).toBeDefined();
    expect(nullCheck!.threshold).toBe(0.05);
    expect(['PASS', 'WARNING', 'FAIL']).toContain(nullCheck!.status);
  });

  it('should check uniqueness for identifier columns', () => {
    const asset = createMockColumn('customer_id', 'integer');
    const results = engine.checkAsset(asset);

    const uniqueCheck = results.find(r => r.ruleType === 'UNIQUENESS');
    expect(uniqueCheck).toBeDefined();
    expect(uniqueCheck!.measuredValue).toBe(1.0); // 1000/1000 unique
    expect(uniqueCheck!.status).toBe('PASS');
  });

  it('should check row count for tables', () => {
    const tableAsset: Asset = {
      id: generateId(),
      sourceId: 'source-1',
      type: 'TABLE',
      name: 'customers',
      qualifiedName: 'demo_catalog_db.public.customers',
      status: 'DISCOVERED',
      sensitivity: 'UNKNOWN',
      certificationStatus: 'UNCERTIFIED',
      metadata: { kind: 'TABLE', schemaName: 'public', databaseName: 'demo_catalog_db', rowCount: 1000, columnCount: 6 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const results = engine.checkAsset(tableAsset);
    expect(results.length).toBe(1);
    expect(results[0].ruleType).toBe('ROW_COUNT');
    expect(results[0].measuredValue).toBe(1000);
    expect(results[0].status).toBe('PASS');
  });

  it('should calculate quality score', () => {
    const asset = createMockColumn('email', 'varchar');
    engine.checkAsset(asset);

    const score = engine.getQualityScore(asset.id);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should generate evidence for quality checks', () => {
    const asset = createMockColumn('email', 'varchar');
    engine.checkAsset(asset);

    const evidence = evidenceRepo.getAll();
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.some(e => e.type === 'QUALITY_CHECK_COMPLETED')).toBe(true);
  });
});

// ---- TrustScoreService Tests ----

describe('TrustScoreService', () => {
  let service: TrustScoreService;
  let assetRepo: InMemoryAssetRepository;
  let classificationRepo: InMemoryClassificationRepository;
  let qualityRepo: InMemoryQualityRepository;
  let trustScoreRepo: InMemoryTrustScoreRepository;
  let evidenceRepo: InMemoryEvidenceRepository;

  beforeEach(() => {
    assetRepo = new InMemoryAssetRepository();
    classificationRepo = new InMemoryClassificationRepository();
    qualityRepo = new InMemoryQualityRepository();
    trustScoreRepo = new InMemoryTrustScoreRepository();
    evidenceRepo = new InMemoryEvidenceRepository();
    service = new TrustScoreService(assetRepo, classificationRepo, qualityRepo, trustScoreRepo, evidenceRepo);
  });

  it('should calculate trust score for an asset', () => {
    const asset: Asset = {
      id: generateId(),
      sourceId: 'source-1',
      type: 'TABLE',
      name: 'test_table',
      qualifiedName: 'db.schema.test_table',
      description: 'A test table',
      status: 'ACTIVE',
      sensitivity: 'INTERNAL',
      certificationStatus: 'UNCERTIFIED',
      metadata: { kind: 'TABLE', schemaName: 'schema', databaseName: 'db', rowCount: 100, columnCount: 3 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assetRepo.save(asset);

    const score = service.calculateForAsset(asset);

    expect(score).toBeDefined();
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.components.length).toBe(4);
    expect(score.explanation).toBeTruthy();
    expect(score.calculatedAt).toBeTruthy();
  });

  it('should include all trust components', () => {
    const asset: Asset = {
      id: generateId(),
      sourceId: 'source-1',
      type: 'TABLE',
      name: 'test',
      qualifiedName: 'db.schema.test',
      status: 'ACTIVE',
      sensitivity: 'UNKNOWN',
      certificationStatus: 'UNCERTIFIED',
      metadata: { kind: 'TABLE', schemaName: 'schema', databaseName: 'db' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assetRepo.save(asset);

    const score = service.calculateForAsset(asset);
    const factors = score.components.map(c => c.factor);

    expect(factors).toContain('Metadata Completeness');
    expect(factors).toContain('Quality Score');
    expect(factors).toContain('Classification Confidence');
    expect(factors).toContain('Ownership & Governance');
  });

  it('should save trust score to repository', () => {
    const asset: Asset = {
      id: generateId(),
      sourceId: 'source-1',
      type: 'TABLE',
      name: 'test',
      qualifiedName: 'db.schema.test',
      status: 'ACTIVE',
      sensitivity: 'UNKNOWN',
      certificationStatus: 'UNCERTIFIED',
      metadata: { kind: 'TABLE', schemaName: 'schema', databaseName: 'db' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assetRepo.save(asset);

    service.calculateForAsset(asset);

    const saved = trustScoreRepo.getByAssetId(asset.id);
    expect(saved).toBeDefined();
    expect(saved!.assetId).toBe(asset.id);
  });

  it('should return configurable weights', () => {
    const weights = service.getWeights();
    expect(weights.metadataCompleteness).toBeDefined();
    expect(weights.qualityScore).toBeDefined();
    expect(weights.classificationConfidence).toBeDefined();
    expect(weights.ownership).toBeDefined();

    // Weights should sum to 1.0
    const total = weights.metadataCompleteness + weights.qualityScore + weights.classificationConfidence + weights.ownership;
    expect(total).toBeCloseTo(1.0);
  });
});

// ---- Relationship Traversal Tests ----

describe('Relationship Traversal', () => {
  let repo: InMemoryRelationshipRepository;

  beforeEach(() => {
    repo = new InMemoryRelationshipRepository();
  });

  it('should save and retrieve relationships', () => {
    const rel = {
      id: generateId(),
      sourceAssetId: 'asset-1',
      targetAssetId: 'asset-2',
      type: 'CONTAINS' as const,
      createdAt: new Date().toISOString(),
    };

    repo.save(rel);
    const all = repo.getAll();
    expect(all.length).toBe(1);
    expect(all[0].sourceAssetId).toBe('asset-1');
    expect(all[0].targetAssetId).toBe('asset-2');
  });

  it('should find upstream relationships', () => {
    repo.save({ id: '1', sourceAssetId: 'a', targetAssetId: 'b', type: 'CONTAINS', createdAt: '' });
    repo.save({ id: '2', sourceAssetId: 'b', targetAssetId: 'c', type: 'CONTAINS', createdAt: '' });

    const upstream = repo.getUpstream('c');
    expect(upstream.length).toBe(1);
    expect(upstream[0].sourceAssetId).toBe('b');
  });

  it('should find downstream relationships', () => {
    repo.save({ id: '1', sourceAssetId: 'a', targetAssetId: 'b', type: 'CONTAINS', createdAt: '' });
    repo.save({ id: '2', sourceAssetId: 'a', targetAssetId: 'c', type: 'CONTAINS', createdAt: '' });

    const downstream = repo.getDownstream('a');
    expect(downstream.length).toBe(2);
  });

  it('should find all relationships for an asset', () => {
    repo.save({ id: '1', sourceAssetId: 'a', targetAssetId: 'b', type: 'CONTAINS', createdAt: '' });
    repo.save({ id: '2', sourceAssetId: 'b', targetAssetId: 'c', type: 'CONTAINS', createdAt: '' });
    repo.save({ id: '3', sourceAssetId: 'x', targetAssetId: 'y', type: 'CONTAINS', createdAt: '' });

    const rels = repo.getByAssetId('b');
    expect(rels.length).toBe(2); // b is target of 1, source of 2
  });
});

// ---- SearchService Tests ----

describe('SearchService', () => {
  let service: SearchService;
  let assetRepo: InMemoryAssetRepository;
  let classificationRepo: InMemoryClassificationRepository;
  let qualityRepo: InMemoryQualityRepository;
  let trustScoreRepo: InMemoryTrustScoreRepository;

  beforeEach(() => {
    assetRepo = new InMemoryAssetRepository();
    classificationRepo = new InMemoryClassificationRepository();
    qualityRepo = new InMemoryQualityRepository();
    trustScoreRepo = new InMemoryTrustScoreRepository();
    service = new SearchService(assetRepo, classificationRepo, qualityRepo, trustScoreRepo);

    // Add test assets
    assetRepo.save(createMockAsset('customers', 'TABLE', 'db.schema.customers'));
    assetRepo.save(createMockAsset('orders', 'TABLE', 'db.schema.orders'));
    assetRepo.save(createMockAsset('email', 'COLUMN', 'db.schema.customers.email'));
  });

  it('should search by text', () => {
    const result = service.search({ text: 'customer' });
    expect(result.assets.length).toBe(2); // customers table + email column
    expect(result.total).toBe(2);
  });

  it('should filter by type', () => {
    const result = service.search({ type: 'TABLE' });
    expect(result.assets.length).toBe(2);
    expect(result.assets.every(a => a.type === 'TABLE')).toBe(true);
  });

  it('should combine text and type filters', () => {
    const result = service.search({ text: 'customer', type: 'COLUMN' });
    expect(result.assets.length).toBe(1);
    expect(result.assets[0].name).toBe('email');
  });

  it('should return empty for no matches', () => {
    const result = service.search({ text: 'nonexistent' });
    expect(result.assets.length).toBe(0);
    expect(result.total).toBe(0);
  });

  it('should provide suggestions', () => {
    const suggestions = service.getSuggestions('cust');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.includes('customers'))).toBe(true);
  });

  it('should use KEYWORD_STRUCTURED mode', () => {
    expect(service.mode).toBe('KEYWORD_STRUCTURED');
  });
});

// ---- Scan Pipeline Tests ----

describe('Scan Pipeline', () => {
  let scanEngine: ScanEngine;
  let sourceRepo: InMemorySourceRepository;
  let assetRepo: InMemoryAssetRepository;
  let relationshipRepo: InMemoryRelationshipRepository;
  let scanRepo: InMemoryScanRepository;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    sourceRepo = new InMemorySourceRepository();
    const assetVersionRepo = new InMemoryAssetVersionRepository();
    assetRepo = new InMemoryAssetRepository();
    relationshipRepo = new InMemoryRelationshipRepository();
    scanRepo = new InMemoryScanRepository();
    const classificationRepo = new InMemoryClassificationRepository();
    const qualityRepo = new InMemoryQualityRepository();
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    const trustScoreRepo = new InMemoryTrustScoreRepository();

    const demoConnector = new DemoConnector();
    const connectorRegistry: ConnectorRegistry = {
      getConnector(type: string): DataSourceConnector | undefined {
        if (type === 'DEMO') return demoConnector;
        return undefined;
      },
    };

    const classificationEngine = new ClassificationEngine(classificationRepo, evidenceRepo, auditRepo);
    const qualityEngine = new QualityEngine(qualityRepo, evidenceRepo, auditRepo, demoConnector);
    const trustScoreService = new TrustScoreService(
      assetRepo, classificationRepo, qualityRepo, trustScoreRepo, evidenceRepo
    );

    scanEngine = new ScanEngine(
      sourceRepo, scanRepo, assetRepo, assetVersionRepo, relationshipRepo,
      evidenceRepo, auditRepo, connectorRegistry,
      classificationEngine, qualityEngine, trustScoreService
    );

    // Create a demo source
    const source: DataSource = {
      id: 'test-source-id',
      name: 'Test Demo Source',
      type: 'DEMO',
      description: 'Test source',
      status: 'ACTIVE',
      configuration: { kind: 'DEMO', datasetName: 'test' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sourceRepo.save(source);
  });

  it('should execute a full scan successfully', async () => {
    const result = await scanEngine.executeScan('test-source-id');

    expect(result.scanRun.status).toBe('SUCCESS');
    expect(result.assetsCreated).toBeGreaterThan(0);
    expect(result.relationshipsCreated).toBeGreaterThan(0);
    expect(result.classificationsCreated).toBeGreaterThan(0);
    expect(result.qualityChecksCreated).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);
  });

  it('should create assets from discovery', async () => {
    await scanEngine.executeScan('test-source-id');

    const assets = assetRepo.getAll();
    expect(assets.length).toBeGreaterThan(0);

    const types = new Set(assets.map(a => a.type));
    expect(types.has('DATABASE')).toBe(true);
    expect(types.has('SCHEMA')).toBe(true);
    expect(types.has('TABLE')).toBe(true);
    expect(types.has('COLUMN')).toBe(true);
  });

  it('should create relationships from discovery', async () => {
    await scanEngine.executeScan('test-source-id');

    const rels = relationshipRepo.getAll();
    expect(rels.length).toBeGreaterThan(0);
    expect(rels.every(r => r.type === 'CONTAINS')).toBe(true);
  });

  it('should generate evidence during scan', async () => {
    await scanEngine.executeScan('test-source-id');

    const evidence = evidenceRepo.getAll();
    expect(evidence.length).toBeGreaterThan(0);

    const types = new Set(evidence.map(e => e.type));
    expect(types.has('CONNECTION_TESTED')).toBe(true);
    expect(types.has('ASSET_DISCOVERED')).toBe(true);
    expect(types.has('SCAN_COMPLETED')).toBe(true);
  });

  it('should generate audit events during scan', async () => {
    await scanEngine.executeScan('test-source-id');

    const events = auditRepo.getAll();
    expect(events.length).toBeGreaterThan(0);
  });

  it('should update source lastScanAt after scan', async () => {
    await scanEngine.executeScan('test-source-id');

    const source = sourceRepo.getById('test-source-id');
    expect(source!.lastScanAt).toBeTruthy();
    expect(source!.status).toBe('ACTIVE');
  });

  it('should handle scan failure for missing source', async () => {
    await expect(scanEngine.executeScan('nonexistent'))
      .rejects.toThrow('Source not found');
  });

  it('should handle scan failure for unknown connector type', async () => {
    const pgSource: DataSource = {
      id: 'pg-source',
      name: 'PG Source',
      type: 'POSTGRESQL',
      status: 'NOT_CONNECTED',
      configuration: { kind: 'POSTGRESQL', host: 'localhost', port: 5432, database: 'test', credentialRef: 'ref' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sourceRepo.save(pgSource);

    const result = await scanEngine.executeScan('pg-source');
    expect(result.scanRun.status).toBe('FAILED');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should be idempotent (second scan updates instead of duplicating)', async () => {
    await scanEngine.executeScan('test-source-id');
    const firstCount = assetRepo.getAll().length;

    await scanEngine.executeScan('test-source-id');
    const secondCount = assetRepo.getAll().length;

    expect(secondCount).toBe(firstCount); // No duplicates
  });
});

// ---- Utility Tests ----

describe('Utils', () => {
  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('should generate UUID-format IDs', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

// ---- Helpers ----

function createMockColumn(name: string, dataType: string): Asset {
  return {
    id: generateId(),
    sourceId: 'source-1',
    type: 'COLUMN',
    name,
    qualifiedName: `demo_catalog_db.public.customers.${name}`,
    status: 'DISCOVERED',
    sensitivity: 'UNKNOWN',
    certificationStatus: 'UNCERTIFIED',
    metadata: {
      kind: 'COLUMN',
      tableName: 'customers',
      schemaName: 'public',
      databaseName: 'demo_catalog_db',
      dataType,
      nullable: true,
      ordinalPosition: 1,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createMockAsset(name: string, type: Asset['type'], qualifiedName: string): Asset {
  return {
    id: generateId(),
    sourceId: 'source-1',
    type,
    name,
    qualifiedName,
    status: 'DISCOVERED',
    sensitivity: 'UNKNOWN',
    certificationStatus: 'UNCERTIFIED',
    metadata: type === 'TABLE'
      ? { kind: 'TABLE', schemaName: 'schema', databaseName: 'db', rowCount: 100, columnCount: 3 }
      : type === 'COLUMN'
      ? { kind: 'COLUMN', tableName: 'table', schemaName: 'schema', databaseName: 'db', dataType: 'varchar', nullable: true, ordinalPosition: 1 }
      : { kind: 'DATABASE' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ---- ImpactAnalyzer Tests ----

import { ImpactAnalyzer } from '../src/services/impact-analyzer';
import { PolicyEngine } from '../src/services/policy-engine';

describe('ImpactAnalyzer', () => {
  let analyzer: ImpactAnalyzer;
  let relationshipRepo: InMemoryRelationshipRepository;
  let assetRepo: InMemoryAssetRepository;

  beforeEach(() => {
    relationshipRepo = new InMemoryRelationshipRepository();
    assetRepo = new InMemoryAssetRepository();
    analyzer = new ImpactAnalyzer(relationshipRepo, assetRepo);
  });

  it('should analyze impact with no dependencies', () => {
    const asset = createMockAsset('isolated', 'TABLE', 'db.schema.isolated');
    assetRepo.save(asset);

    const impact = analyzer.analyze(asset.id);
    expect(impact.upstreamCount).toBe(0);
    expect(impact.downstreamCount).toBe(0);
    expect(impact.potentiallyAffected.length).toBe(0);
  });

  it('should detect downstream dependencies', () => {
    const table1 = createMockAsset('table1', 'TABLE', 'db.schema.table1');
    const table2 = createMockAsset('table2', 'TABLE', 'db.schema.table2');
    assetRepo.save(table1);
    assetRepo.save(table2);

    relationshipRepo.save({
      id: 'rel-1',
      sourceAssetId: table1.id,
      targetAssetId: table2.id,
      type: 'DERIVED_FROM',
      createdAt: new Date().toISOString(),
    });

    const impact = analyzer.analyze(table1.id);
    expect(impact.downstreamCount).toBe(1);
    expect(impact.potentiallyAffected).toContain(table2.id);
  });

  it('should detect upstream dependencies', () => {
    const table1 = createMockAsset('table1', 'TABLE', 'db.schema.table1');
    const table2 = createMockAsset('table2', 'TABLE', 'db.schema.table2');
    assetRepo.save(table1);
    assetRepo.save(table2);

    relationshipRepo.save({
      id: 'rel-1',
      sourceAssetId: table1.id,
      targetAssetId: table2.id,
      type: 'DERIVED_FROM',
      createdAt: new Date().toISOString(),
    });

    const impact = analyzer.analyze(table2.id);
    expect(impact.upstreamCount).toBe(1);
  });

  it('should handle transitive dependencies', () => {
    const a = createMockAsset('a', 'TABLE', 'db.schema.a');
    const b = createMockAsset('b', 'TABLE', 'db.schema.b');
    const c = createMockAsset('c', 'TABLE', 'db.schema.c');
    assetRepo.save(a);
    assetRepo.save(b);
    assetRepo.save(c);

    relationshipRepo.save({ id: '1', sourceAssetId: a.id, targetAssetId: b.id, type: 'DERIVED_FROM', createdAt: '' });
    relationshipRepo.save({ id: '2', sourceAssetId: b.id, targetAssetId: c.id, type: 'DERIVED_FROM', createdAt: '' });

    const impact = analyzer.analyze(a.id);
    expect(impact.potentiallyAffected).toContain(b.id);
    expect(impact.potentiallyAffected).toContain(c.id);
  });

  it('should not create infinite loops on circular dependencies', () => {
    const a = createMockAsset('a', 'TABLE', 'db.schema.a');
    const b = createMockAsset('b', 'TABLE', 'db.schema.b');
    assetRepo.save(a);
    assetRepo.save(b);

    relationshipRepo.save({ id: '1', sourceAssetId: a.id, targetAssetId: b.id, type: 'DEPENDS_ON', createdAt: '' });
    relationshipRepo.save({ id: '2', sourceAssetId: b.id, targetAssetId: a.id, type: 'DEPENDS_ON', createdAt: '' });

    // Should not throw
    const impact = analyzer.analyze(a.id);
    expect(impact).toBeDefined();
  });
});

// ---- PolicyEngine Tests ----

describe('PolicyEngine', () => {
  let engine: PolicyEngine;
  let assetRepo: InMemoryAssetRepository;
  let classificationRepo: InMemoryClassificationRepository;
  let qualityRepo: InMemoryQualityRepository;
  let relationshipRepo: InMemoryRelationshipRepository;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    assetRepo = new InMemoryAssetRepository();
    classificationRepo = new InMemoryClassificationRepository();
    qualityRepo = new InMemoryQualityRepository();
    relationshipRepo = new InMemoryRelationshipRepository();
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    engine = new PolicyEngine(assetRepo, classificationRepo, qualityRepo, relationshipRepo, evidenceRepo, auditRepo);
  });

  it('should return demo policies', () => {
    const policies = engine.getPolicies();
    expect(policies.length).toBeGreaterThan(0);
    expect(policies.some(p => p.type === 'CLASSIFICATION')).toBe(true);
    expect(policies.some(p => p.type === 'QUALITY')).toBe(true);
    expect(policies.some(p => p.type === 'LINEAGE')).toBe(true);
  });

  it('should detect unreviewed PII', () => {
    const asset = createMockColumn('email', 'varchar');
    assetRepo.save(asset);

    classificationRepo.save({
      id: 'cls-1',
      assetId: asset.id,
      classificationType: 'PII_EMAIL',
      confidence: 0.95,
      method: 'RULE',
      reason: 'Email pattern',
      reviewStatus: 'PENDING',
      createdAt: new Date().toISOString(),
    });

    const evaluation = engine.evaluatePolicyForAsset('policy-pii-review', asset.id);
    expect(evaluation.status).toBe('FAIL');
    expect(evaluation.violations.length).toBeGreaterThan(0);
  });

  it('should pass when PII is reviewed', () => {
    const asset = createMockColumn('email', 'varchar');
    assetRepo.save(asset);

    classificationRepo.save({
      id: 'cls-1',
      assetId: asset.id,
      classificationType: 'PII_EMAIL',
      confidence: 0.95,
      method: 'RULE',
      reason: 'Email pattern',
      reviewStatus: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    });

    const evaluation = engine.evaluatePolicyForAsset('policy-pii-review', asset.id);
    expect(evaluation.status).toBe('PASS');
  });

  it('should detect quality failures', () => {
    const asset = createMockAsset('table1', 'TABLE', 'db.schema.table1');
    assetRepo.save(asset);

    qualityRepo.save({
      id: 'q-1',
      assetId: asset.id,
      ruleType: 'NULL_RATIO',
      measuredValue: 0.5,
      threshold: 0.05,
      status: 'FAIL',
      timestamp: new Date().toISOString(),
    });

    const evaluation = engine.evaluatePolicyForAsset('policy-quality-threshold', asset.id);
    expect(evaluation.status).toBe('FAIL');
  });

  it('should detect missing lineage for tables', () => {
    const table = createMockAsset('table1', 'TABLE', 'db.schema.table1');
    assetRepo.save(table);

    const evaluation = engine.evaluatePolicyForAsset('policy-lineage-completeness', table.id);
    expect(evaluation.violations.length).toBeGreaterThan(0);
  });

  it('should evaluate all policies against all assets', () => {
    const asset1 = createMockAsset('table1', 'TABLE', 'db.schema.table1');
    const asset2 = createMockColumn('email', 'varchar');
    assetRepo.save(asset1);
    assetRepo.save(asset2);

    const evaluations = engine.evaluateAll();
    expect(evaluations.length).toBeGreaterThan(0);
  });
});
