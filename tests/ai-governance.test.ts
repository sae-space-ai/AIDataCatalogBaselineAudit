// ============================================================
// TESTS — AI Governance Services
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { DatasetGovernanceService } from '../src/ai-governance/dataset-service';
import { TrainingDataService } from '../src/ai-governance/training-data-service';
import { ModelGovernanceService } from '../src/ai-governance/model-service';
import { RAGGovernanceService } from '../src/ai-governance/rag-service';
import { DataDriftService } from '../src/ai-governance/drift-service';
import {
  InMemoryAssetRepository,
  InMemoryEvidenceRepository,
  InMemoryAuditRepository,
  InMemoryClassificationRepository,
} from '../src/infrastructure/in-memory-repository';

// ---- Dataset Governance Service Tests ----

describe('DatasetGovernanceService', () => {
  let service: DatasetGovernanceService;
  let assetRepo: InMemoryAssetRepository;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    assetRepo = new InMemoryAssetRepository();
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    service = new DatasetGovernanceService(assetRepo, evidenceRepo, auditRepo);
  });

  it('should register dataset profile', () => {
    const profile = {
      assetId: 'dataset-1',
      datasetPurpose: 'Training',
      datasetRole: 'TRAINING' as const,
      sourceReferences: ['source-1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    service.registerDatasetProfile(profile);
    const retrieved = service.getDatasetProfile('dataset-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.datasetRole).toBe('TRAINING');
  });

  it('should list dataset profiles by role', () => {
    service.registerDatasetProfile({
      assetId: 'dataset-1',
      datasetPurpose: 'Training',
      datasetRole: 'TRAINING',
      sourceReferences: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    service.registerDatasetProfile({
      assetId: 'dataset-2',
      datasetPurpose: 'Testing',
      datasetRole: 'TEST',
      sourceReferences: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const trainingProfiles = service.listDatasetProfiles('TRAINING');
    expect(trainingProfiles.length).toBe(1);
    expect(trainingProfiles[0].assetId).toBe('dataset-1');
  });

  it('should create governance snapshot', () => {
    const snapshot = service.createGovernanceSnapshot(
      'dataset-1',
      'version-1',
      'schema-fingerprint-123',
      { classifications: ['cls-1'], timestamp: new Date().toISOString() },
      { qualityResults: ['qr-1'], timestamp: new Date().toISOString() },
      { relationships: ['rel-1'], timestamp: new Date().toISOString() }
    );

    expect(snapshot).toBeDefined();
    expect(snapshot.datasetAssetId).toBe('dataset-1');
    expect(snapshot.assetVersionId).toBe('version-1');

    const retrieved = service.getGovernanceSnapshot('dataset-1', 'version-1');
    expect(retrieved).toBeDefined();
  });
});

// ---- Training Data Service Tests ----

describe('TrainingDataService', () => {
  let service: TrainingDataService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    service = new TrainingDataService(evidenceRepo, auditRepo);
  });

  it('should register training dataset', () => {
    const record = service.registerTrainingDataset(
      'dataset-1',
      'version-1',
      'Model training',
      'Train classification model',
      ['training'],
      ['production']
    );

    expect(record).toBeDefined();
    expect(record.datasetAssetId).toBe('dataset-1');
    expect(record.approvalStatus).toBe('NOT_EVALUATED');
  });

  it('should update approval status', () => {
    const record = service.registerTrainingDataset(
      'dataset-1',
      'version-1',
      'Model training',
      'Train classification model'
    );

    service.requestApproval(record.id);
    const updated = service.getTrainingDataset(record.id);
    expect(updated?.approvalStatus).toBe('PENDING_REVIEW');

    service.approveTrainingDataset(record.id, 'reviewer-1');
    const approved = service.getTrainingDataset(record.id);
    expect(approved?.approvalStatus).toBe('APPROVED');
  });

  it('should reject training dataset', () => {
    const record = service.registerTrainingDataset(
      'dataset-1',
      'version-1',
      'Model training',
      'Train classification model'
    );

    service.requestApproval(record.id);
    service.rejectTrainingDataset(record.id, 'reviewer-1', 'Insufficient quality');
    
    const rejected = service.getTrainingDataset(record.id);
    expect(rejected?.approvalStatus).toBe('REJECTED');
  });

  it('should provide traceability', () => {
    const record = service.registerTrainingDataset(
      'dataset-1',
      'version-1',
      'Model training',
      'Train classification model'
    );

    const traceability = service.getTraceability(record.id);
    expect(traceability).toBeDefined();
    expect(traceability?.dataset.id).toBe(record.id);
  });
});

// ---- Model Governance Service Tests ----

describe('ModelGovernanceService', () => {
  let service: ModelGovernanceService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    service = new ModelGovernanceService(evidenceRepo, auditRepo);
  });

  it('should register model profile', () => {
    const profile = service.registerModelProfile(
      'model-1',
      'Classification Model',
      'v1.0.0',
      'classifier',
      'Customer classification',
      'Internal use only'
    );

    expect(profile).toBeDefined();
    expect(profile.modelName).toBe('Classification Model');
    expect(profile.governanceStatus).toBe('NOT_EVALUATED');
  });

  it('should set input specification', () => {
    service.registerModelProfile(
      'model-1',
      'Classification Model',
      'v1.0.0',
      'classifier',
      'Customer classification',
      'Internal use only'
    );

    service.setInputSpecification('model-1', {
      fields: [
        {
          name: 'customer_id',
          type: 'string',
          required: true,
          sensitivity: 'INTERNAL',
        },
      ],
    });

    const profile = service.getModelProfile('model-1');
    expect(profile?.inputSpecification.fields.length).toBe(1);
  });

  it('should evaluate model input governance', () => {
    service.registerModelProfile(
      'model-1',
      'Classification Model',
      'v1.0.0',
      'classifier',
      'Customer classification',
      'Internal use only'
    );

    const evaluation = service.evaluateModelInputGovernance('model-1');
    expect(evaluation).toBeDefined();
    expect(evaluation.status).toBe('WARN'); // Empty input specification
  });

  it('should add training dataset reference', () => {
    service.registerModelProfile(
      'model-1',
      'Classification Model',
      'v1.0.0',
      'classifier',
      'Customer classification',
      'Internal use only'
    );

    service.addTrainingDatasetReference('model-1', 'training-record-1');
    const profile = service.getModelProfile('model-1');
    expect(profile?.trainingDatasetReferences).toContain('training-record-1');
  });
});

// ---- RAG Governance Service Tests ----

describe('RAGGovernanceService', () => {
  let service: RAGGovernanceService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    service = new RAGGovernanceService(evidenceRepo, auditRepo);
  });

  it('should register RAG resource profile', () => {
    const profile = service.registerRAGResourceProfile(
      'rag-1',
      'DOCUMENT_COLLECTION',
      'source-1',
      'v1.0.0'
    );

    expect(profile).toBeDefined();
    expect(profile.resourceType).toBe('DOCUMENT_COLLECTION');
    expect(profile.eligibilityStatus).toBe('NOT_EVALUATED');
  });

  it('should assess RAG eligibility', () => {
    service.registerRAGResourceProfile(
      'rag-1',
      'DOCUMENT_COLLECTION',
      'source-1'
    );

    const assessment = service.assessRAGEligibility(
      'rag-1',
      'PASS',
      'CLEAR',
      'PASS',
      'PASS',
      'PASS',
      'PASS',
      'SUFFICIENT'
    );

    expect(assessment).toBeDefined();
    expect(assessment.status).toBe('ELIGIBLE');
  });

  it('should mark RAG resource as not eligible when policy fails', () => {
    service.registerRAGResourceProfile(
      'rag-1',
      'DOCUMENT_COLLECTION',
      'source-1'
    );

    const assessment = service.assessRAGEligibility(
      'rag-1',
      'PASS',
      'CLEAR',
      'PASS',
      'PASS',
      'PASS',
      'FAIL',
      'SUFFICIENT',
      ['Policy check failed']
    );

    expect(assessment.status).toBe('NOT_ELIGIBLE');
  });

  it('should provide RAG governance summary', () => {
    service.registerRAGResourceProfile('rag-1', 'DOCUMENT_COLLECTION', 'source-1');
    service.registerRAGResourceProfile('rag-2', 'KNOWLEDGE_BASE', 'source-2');

    const summary = service.getRAGGovernanceSummary();
    expect(summary.total).toBe(2);
    expect(summary.notEvaluated).toBe(2);
  });
});

// ---- Data Drift Service Tests ----

describe('DataDriftService', () => {
  let service: DataDriftService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    service = new DataDriftService(evidenceRepo, auditRepo);
  });

  it('should assess drift with no changes', () => {
    const assessment = service.assessDrift(
      'Dataset',
      'dataset-1',
      'SCHEMA_DRIFT',
      []
    );

    expect(assessment).toBeDefined();
    expect(assessment.severity).toBe('NO_DRIFT');
  });

  it('should assess drift with minor changes', () => {
    const assessment = service.assessDrift(
      'Dataset',
      'dataset-1',
      'QUALITY_DRIFT',
      [
        { field: 'completeness', changeType: 'MODIFIED', impact: 'LOW' },
      ]
    );

    expect(assessment.severity).toBe('MINOR_DRIFT');
  });

  it('should assess drift with critical changes', () => {
    const assessment = service.assessDrift(
      'Dataset',
      'dataset-1',
      'SCHEMA_DRIFT',
      [
        { field: 'column1', changeType: 'REMOVED', impact: 'HIGH' },
      ]
    );

    expect(assessment.severity).toBe('CRITICAL_DRIFT');
  });

  it('should register threshold profile', () => {
    const profile = service.registerThresholdProfile(
      'Standard Thresholds',
      'QUALITY_DRIFT',
      { minor: 0.05, material: 0.10, critical: 0.20 }
    );

    expect(profile).toBeDefined();
    expect(profile.thresholds.minor).toBe(0.05);
  });

  it('should provide drift summary', () => {
    service.assessDrift('Dataset', 'dataset-1', 'SCHEMA_DRIFT', []);
    service.assessDrift('Dataset', 'dataset-2', 'QUALITY_DRIFT', [
      { field: 'completeness', changeType: 'MODIFIED', impact: 'LOW' },
    ]);

    const summary = service.getDriftSummary();
    expect(summary.total).toBe(2);
    expect(summary.noDrift).toBe(1);
    expect(summary.minorDrift).toBe(1);
  });
});
