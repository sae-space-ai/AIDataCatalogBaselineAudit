// ============================================================
// TESTS — AI Governance Integration Services
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { AIResourceRegistry } from '../src/ai-governance/ai-resource-registry';
import { 
  AIDependencyGraph, 
  PurposeLimitationService, 
  AIReproducibilityService 
} from '../src/ai-governance/integration-services';
import { DatasetGovernanceService } from '../src/ai-governance/dataset-service';
import { ModelGovernanceService } from '../src/ai-governance/model-service';
import { RAGGovernanceService } from '../src/ai-governance/rag-service';
import { AIGovernanceService } from '../src/ai-governance/ai-governance-service';
import { TrainingDataService } from '../src/ai-governance/training-data-service';
import { DataDriftService } from '../src/ai-governance/drift-service';
import { SensitiveDataPreventionService } from '../src/ai-governance/sensitive-data-service';
import {
  InMemoryAssetRepository,
  InMemoryRelationshipRepository,
  InMemoryEvidenceRepository,
  InMemoryAuditRepository,
  InMemoryClassificationRepository,
} from '../src/infrastructure/in-memory-repository';
import type { Asset } from '../src/types';

// Helper function to create test asset
function createTestAsset(id: string, name: string): Asset {
  return {
    id,
    sourceId: 'source-1',
    type: 'DATASET',
    name,
    qualifiedName: `db.schema.${name.toLowerCase().replace(/\s+/g, '_')}`,
    status: 'ACTIVE',
    sensitivity: 'PUBLIC',
    certificationStatus: 'UNCERTIFIED',
    metadata: { kind: 'DATASET' as const },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ---- AI Resource Registry Tests ----

describe('AIResourceRegistry', () => {
  let registry: AIResourceRegistry;
  let assetRepo: InMemoryAssetRepository;
  let relationshipRepo: InMemoryRelationshipRepository;
  let datasetService: DatasetGovernanceService;
  let modelService: ModelGovernanceService;
  let ragService: RAGGovernanceService;
  let aiGovernanceService: AIGovernanceService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;
  let trainingDataService: TrainingDataService;
  let driftService: DataDriftService;
  let sensitiveDataService: SensitiveDataPreventionService;
  let classificationRepo: InMemoryClassificationRepository;

  beforeEach(() => {
    assetRepo = new InMemoryAssetRepository();
    relationshipRepo = new InMemoryRelationshipRepository();
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    classificationRepo = new InMemoryClassificationRepository();

    datasetService = new DatasetGovernanceService(assetRepo, evidenceRepo, auditRepo);
    modelService = new ModelGovernanceService(evidenceRepo, auditRepo);
    ragService = new RAGGovernanceService(evidenceRepo, auditRepo);
    trainingDataService = new TrainingDataService(evidenceRepo, auditRepo);
    driftService = new DataDriftService(evidenceRepo, auditRepo);
    sensitiveDataService = new SensitiveDataPreventionService(classificationRepo, evidenceRepo, auditRepo);

    aiGovernanceService = new AIGovernanceService(
      datasetService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      evidenceRepo,
      auditRepo
    );

    registry = new AIResourceRegistry(
      assetRepo,
      relationshipRepo,
      datasetService,
      modelService,
      ragService,
      aiGovernanceService
    );
  });

  it('should register a dataset resource', () => {
    const asset = createTestAsset('asset-1', 'Test Dataset');
    assetRepo.save(asset);

    datasetService.registerDatasetProfile({
      assetId: 'asset-1',
      datasetPurpose: 'Training',
      datasetRole: 'TRAINING',
      sourceReferences: ['source-1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const resource = registry.register('asset-1', 'DATASET');
    expect(resource).toBeDefined();
    expect(resource?.governanceStatus).toBe('GOVERNED');
  });

  it('should list all AI resources', () => {
    const asset = createTestAsset('asset-1', 'Test Dataset');
    assetRepo.save(asset);

    const resources = registry.list();
    expect(resources.length).toBeGreaterThan(0);
  });

  it('should get relationships for a resource', () => {
    const asset1 = createTestAsset('asset-1', 'Dataset 1');
    const asset2 = createTestAsset('asset-2', 'Dataset 2');
    
    assetRepo.save(asset1);
    assetRepo.save(asset2);

    relationshipRepo.save({
      id: 'rel-1',
      sourceAssetId: 'asset-1',
      targetAssetId: 'asset-2',
      type: 'DERIVED_FROM',
      createdAt: new Date().toISOString(),
    });

    const relationships = registry.getRelationships('asset-1');
    expect(relationships.downstream.length).toBe(1);
  });
});

// ---- Purpose Limitation Service Tests ----

describe('PurposeLimitationService', () => {
  let service: PurposeLimitationService;

  beforeEach(() => {
    service = new PurposeLimitationService();
  });

  it('should assess compatible purposes', () => {
    const result = service.assess('Customer data analysis', 'Customer analytics');
    expect(result.compatibility).toBe('COMPATIBLE');
  });

  it('should assess incompatible purposes', () => {
    const result = service.assess('Customer data analysis', 'Marketing campaigns');
    expect(result.compatibility).toBe('REQUIRES_REVIEW');
  });

  it('should flag restricted keywords', () => {
    const result = service.assess('Personal sensitive data', 'General analytics');
    expect(result.compatibility).toBe('REQUIRES_REVIEW');
  });

  it('should return NOT_EVALUATED for missing purposes', () => {
    const result = service.assess('', 'Some purpose');
    expect(result.compatibility).toBe('NOT_EVALUATED');
  });
});

// ---- AI Dependency Graph Tests ----

describe('AIDependencyGraph', () => {
  let graph: AIDependencyGraph;
  let relationshipRepo: InMemoryRelationshipRepository;
  let aiGovernanceService: AIGovernanceService;
  let datasetService: DatasetGovernanceService;
  let trainingDataService: TrainingDataService;
  let modelService: ModelGovernanceService;
  let ragService: RAGGovernanceService;
  let sensitiveDataService: SensitiveDataPreventionService;
  let driftService: DataDriftService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;
  let classificationRepo: InMemoryClassificationRepository;
  let assetRepo: InMemoryAssetRepository;

  beforeEach(() => {
    assetRepo = new InMemoryAssetRepository();
    relationshipRepo = new InMemoryRelationshipRepository();
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    classificationRepo = new InMemoryClassificationRepository();

    datasetService = new DatasetGovernanceService(assetRepo, evidenceRepo, auditRepo);
    trainingDataService = new TrainingDataService(evidenceRepo, auditRepo);
    modelService = new ModelGovernanceService(evidenceRepo, auditRepo);
    ragService = new RAGGovernanceService(evidenceRepo, auditRepo);
    sensitiveDataService = new SensitiveDataPreventionService(classificationRepo, evidenceRepo, auditRepo);
    driftService = new DataDriftService(evidenceRepo, auditRepo);

    aiGovernanceService = new AIGovernanceService(
      datasetService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      evidenceRepo,
      auditRepo
    );

    graph = new AIDependencyGraph(relationshipRepo, aiGovernanceService);
  });

  it('should build empty graph for non-existent use case', () => {
    const nodes = graph.buildGraph('non-existent');
    expect(nodes.length).toBe(0);
  });
});

// ---- AI Reproducibility Service Tests ----

describe('AIReproducibilityService', () => {
  let service: AIReproducibilityService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    service = new AIReproducibilityService(evidenceRepo, auditRepo);
  });

  it('should create reproducibility record', () => {
    const record = service.createRecord(
      'use-case-1',
      'model-v1',
      ['dataset-v1'],
      ['val-dataset-v1'],
      ['test-dataset-v1'],
      ['snapshot-1'],
      ['policy-v1'],
      ['evidence-1']
    );

    expect(record).toBeDefined();
    expect(record.aiUseCaseId).toBe('use-case-1');
    expect(record.reproducibilityLevel).toBe('GOVERNANCE_REPRODUCIBILITY_ONLY');
  });

  it('should get record by ID', () => {
    const record = service.createRecord(
      'use-case-1',
      'model-v1',
      [],
      [],
      [],
      [],
      [],
      []
    );

    const retrieved = service.getRecord(record.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(record.id);
  });

  it('should get records by use case', () => {
    service.createRecord('use-case-1', 'model-v1', [], [], [], [], [], []);
    service.createRecord('use-case-1', 'model-v2', [], [], [], [], [], []);
    service.createRecord('use-case-2', 'model-v3', [], [], [], [], [], []);

    const records = service.getRecordsByUseCase('use-case-1');
    expect(records.length).toBe(2);
  });
});
