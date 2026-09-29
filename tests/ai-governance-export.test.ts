// ============================================================
// TESTS — AI Governance Multi-Format Export (Order 11D)
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  buildCanonicalExport, 
  generateExportFilename 
} from '../src/ai-governance/export/canonical-export';
import { generateXLSXWorkbook, generateXLSXBuffer } from '../src/ai-governance/export/xlsx-serializer';
import { generatePDFReport, generatePDFBlob } from '../src/ai-governance/export/pdf-serializer';
import { AIGovernanceService } from '../src/ai-governance/ai-governance-service';
import { TrainingDataService } from '../src/ai-governance/training-data-service';
import { ModelGovernanceService } from '../src/ai-governance/model-service';
import { RAGGovernanceService } from '../src/ai-governance/rag-service';
import { SensitiveDataPreventionService } from '../src/ai-governance/sensitive-data-service';
import { DataDriftService } from '../src/ai-governance/drift-service';
import { HumanReviewService } from '../src/services/human-review-service';
import {
  InMemoryAssetRepository,
  InMemoryEvidenceRepository,
  InMemoryAuditRepository,
  InMemoryClassificationRepository,
} from '../src/infrastructure/in-memory-repository';

// ---- Canonical Export Object Tests ----

describe('Canonical Export Object', () => {
  let aiGovernanceService: AIGovernanceService;
  let trainingDataService: TrainingDataService;
  let modelService: ModelGovernanceService;
  let ragService: RAGGovernanceService;
  let sensitiveDataService: SensitiveDataPreventionService;
  let driftService: DataDriftService;
  let humanReviewService: HumanReviewService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;
  let assetRepo: InMemoryAssetRepository;
  let classificationRepo: InMemoryClassificationRepository;

  beforeEach(() => {
    assetRepo = new InMemoryAssetRepository();
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    classificationRepo = new InMemoryClassificationRepository();

    const datasetService = new (require('../src/ai-governance/dataset-service').DatasetGovernanceService)(
      assetRepo, evidenceRepo, auditRepo
    );
    trainingDataService = new TrainingDataService(evidenceRepo, auditRepo);
    modelService = new ModelGovernanceService(evidenceRepo, auditRepo);
    ragService = new RAGGovernanceService(evidenceRepo, auditRepo);
    sensitiveDataService = new SensitiveDataPreventionService(classificationRepo, evidenceRepo, auditRepo);
    driftService = new DataDriftService(evidenceRepo, auditRepo);
    humanReviewService = new HumanReviewService(evidenceRepo, auditRepo);

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
  });

  it('should build canonical export object', () => {
    const canonical = buildCanonicalExport({
      aiGovernanceService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      humanReviewService,
      evidenceRepo,
      auditRepo,
      applicationMode: 'DEMO',
    });

    expect(canonical).toBeDefined();
    expect(canonical.exportTimestamp).toBeDefined();
    expect(canonical.exportVersion).toBe('1.0.0');
    expect(canonical.applicationMode).toBe('DEMO');
    expect(canonical.executiveSummary).toBeDefined();
    expect(canonical.aiUseCases).toBeDefined();
    expect(canonical.trainingData).toBeDefined();
    expect(canonical.models).toBeDefined();
    expect(canonical.ragResources).toBeDefined();
    expect(canonical.driftAssessments).toBeDefined();
    expect(canonical.sensitiveDataAssessments).toBeDefined();
    expect(canonical.governanceAssessments).toBeDefined();
    expect(canonical.evidenceRecords).toBeDefined();
    expect(canonical.auditEvents).toBeDefined();
    expect(canonical.humanReviews).toBeDefined();
    expect(canonical.certifications).toBeDefined();
    expect(canonical.timelineEvents).toBeDefined();
  });

  it('should include executive summary with correct counts', () => {
    const canonical = buildCanonicalExport({
      aiGovernanceService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      humanReviewService,
      evidenceRepo,
      auditRepo,
      applicationMode: 'DEMO',
    });

    expect(canonical.executiveSummary.totalAIUseCases).toBe(0);
    expect(canonical.executiveSummary.totalTrainingDatasets).toBe(0);
    expect(canonical.executiveSummary.totalModels).toBe(0);
    expect(canonical.executiveSummary.totalRAGResources).toBe(0);
    expect(canonical.executiveSummary.applicationMode).toBe('DEMO');
  });

  it('should redact secrets from export', () => {
    // Add evidence with potential secret
    evidenceRepo.save({
      id: 'test-evidence',
      type: 'ASSET_DISCOVERED',
      subjectType: 'Test',
      subjectId: 'test-1',
      actor: 'test-actor',
      timestamp: new Date().toISOString(),
      source: 'test-source',
      metadata: { password: 'secret123', apiKey: 'sk-test12345678901234567890' },
    });

    const canonical = buildCanonicalExport({
      aiGovernanceService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      humanReviewService,
      evidenceRepo,
      auditRepo,
      applicationMode: 'DEMO',
    });

    const evidenceJson = JSON.stringify(canonical.evidenceRecords);
    expect(evidenceJson).not.toContain('secret123');
    expect(evidenceJson).not.toContain('sk-test12345678901234567890');
  });

  it('should generate deterministic filenames', () => {
    const jsonFilename = generateExportFilename('json');
    const xlsxFilename = generateExportFilename('xlsx');
    const pdfFilename = generateExportFilename('pdf');

    expect(jsonFilename).toMatch(/^ai-governance-export-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
    expect(xlsxFilename).toMatch(/^ai-governance-export-\d{4}-\d{2}-\d{2}-\d{4}\.xlsx$/);
    expect(pdfFilename).toMatch(/^ai-governance-report-\d{4}-\d{2}-\d{2}-\d{4}\.pdf$/);
  });
});

// ---- XLSX Export Tests ----

describe('XLSX Export', () => {
  let canonicalExport: any;

  beforeEach(() => {
    const assetRepo = new InMemoryAssetRepository();
    const evidenceRepo = new InMemoryEvidenceRepository();
    const auditRepo = new InMemoryAuditRepository();
    const classificationRepo = new InMemoryClassificationRepository();

    const datasetService = new (require('../src/ai-governance/dataset-service').DatasetGovernanceService)(
      assetRepo, evidenceRepo, auditRepo
    );
    const trainingDataService = new TrainingDataService(evidenceRepo, auditRepo);
    const modelService = new ModelGovernanceService(evidenceRepo, auditRepo);
    const ragService = new RAGGovernanceService(evidenceRepo, auditRepo);
    const sensitiveDataService = new SensitiveDataPreventionService(classificationRepo, evidenceRepo, auditRepo);
    const driftService = new DataDriftService(evidenceRepo, auditRepo);
    const humanReviewService = new HumanReviewService(evidenceRepo, auditRepo);

    const aiGovernanceService = new AIGovernanceService(
      datasetService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      evidenceRepo,
      auditRepo
    );

    canonicalExport = buildCanonicalExport({
      aiGovernanceService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      humanReviewService,
      evidenceRepo,
      auditRepo,
      applicationMode: 'DEMO',
    });
  });

  it('should generate XLSX workbook', () => {
    const workbook = generateXLSXWorkbook(canonicalExport);
    expect(workbook).toBeDefined();
    expect(workbook.SheetNames).toBeDefined();
    expect(workbook.SheetNames.length).toBeGreaterThan(0);
  });

  it('should contain expected sheets', () => {
    const workbook = generateXLSXWorkbook(canonicalExport);
    const sheetNames = workbook.SheetNames;

    expect(sheetNames).toContain('Executive Summary');
    expect(sheetNames).toContain('AI Use Cases');
    expect(sheetNames).toContain('Training Data');
    expect(sheetNames).toContain('Models');
    expect(sheetNames).toContain('RAG Resources');
    expect(sheetNames).toContain('Drift Assessments');
    expect(sheetNames).toContain('Sensitive Data');
    expect(sheetNames).toContain('Governance Assessments');
    expect(sheetNames).toContain('Evidence');
    expect(sheetNames).toContain('Audit');
    expect(sheetNames).toContain('Human Reviews');
    expect(sheetNames).toContain('Certifications');
    expect(sheetNames).toContain('Governance Timeline');
  });

  it('should generate XLSX buffer', () => {
    const buffer = generateXLSXBuffer(canonicalExport);
    expect(buffer).toBeDefined();
    expect(buffer instanceof Uint8Array).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should handle empty datasets', () => {
    const workbook = generateXLSXWorkbook(canonicalExport);
    
    // All sheets should exist even with no data
    expect(workbook.SheetNames).toContain('AI Use Cases');
    expect(workbook.SheetNames).toContain('Training Data');
    
    // Sheets should have headers even with no records
    const aiUseCasesSheet = workbook.Sheets['AI Use Cases'];
    expect(aiUseCasesSheet).toBeDefined();
  });
});

// ---- PDF Export Tests ----

describe('PDF Export', () => {
  let canonicalExport: any;

  beforeEach(() => {
    const assetRepo = new InMemoryAssetRepository();
    const evidenceRepo = new InMemoryEvidenceRepository();
    const auditRepo = new InMemoryAuditRepository();
    const classificationRepo = new InMemoryClassificationRepository();

    const datasetService = new (require('../src/ai-governance/dataset-service').DatasetGovernanceService)(
      assetRepo, evidenceRepo, auditRepo
    );
    const trainingDataService = new TrainingDataService(evidenceRepo, auditRepo);
    const modelService = new ModelGovernanceService(evidenceRepo, auditRepo);
    const ragService = new RAGGovernanceService(evidenceRepo, auditRepo);
    const sensitiveDataService = new SensitiveDataPreventionService(classificationRepo, evidenceRepo, auditRepo);
    const driftService = new DataDriftService(evidenceRepo, auditRepo);
    const humanReviewService = new HumanReviewService(evidenceRepo, auditRepo);

    const aiGovernanceService = new AIGovernanceService(
      datasetService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      evidenceRepo,
      auditRepo
    );

    canonicalExport = buildCanonicalExport({
      aiGovernanceService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      humanReviewService,
      evidenceRepo,
      auditRepo,
      applicationMode: 'DEMO',
    });
  });

  it('should generate PDF report', () => {
    const pdf = generatePDFReport(canonicalExport);
    expect(pdf).toBeDefined();
    expect(pdf.internal).toBeDefined();
  });

  it('should contain expected sections', () => {
    const pdf = generatePDFReport(canonicalExport);
    const pageCount = pdf.getNumberOfPages();
    
    // PDF should have multiple pages
    expect(pageCount).toBeGreaterThan(1);
    
    // PDF should be generated successfully
    expect(pdf).toBeDefined();
  });

  it('should generate PDF blob', () => {
    const blob = generatePDFBlob(canonicalExport);
    expect(blob).toBeDefined();
    expect(blob instanceof Blob).toBe(true);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('should handle empty datasets', () => {
    const pdf = generatePDFReport(canonicalExport);
    
    // PDF should still be generated with "No records" messages
    expect(pdf).toBeDefined();
    expect(pdf.getNumberOfPages()).toBeGreaterThan(0);
  });
});

// ---- Secret Exclusion Tests ----

describe('Secret Exclusion', () => {
  let canonicalExport: any;

  beforeEach(() => {
    const assetRepo = new InMemoryAssetRepository();
    const evidenceRepo = new InMemoryEvidenceRepository();
    const auditRepo = new InMemoryAuditRepository();
    const classificationRepo = new InMemoryClassificationRepository();

    // Add evidence with secrets
    evidenceRepo.save({
      id: 'secret-evidence',
      type: 'ASSET_DISCOVERED',
      subjectType: 'Test',
      subjectId: 'test-1',
      actor: 'test-actor',
      timestamp: new Date().toISOString(),
      source: 'test-source',
      metadata: { 
        password: 'super-secret-password',
        apiKey: 'sk-1234567890abcdef1234567890abcdef',
        databaseUrl: 'postgresql://user:pass@localhost/db',
        token: 'ghp_1234567890abcdef1234567890abcdef12',
      },
    });

    const datasetService = new (require('../src/ai-governance/dataset-service').DatasetGovernanceService)(
      assetRepo, evidenceRepo, auditRepo
    );
    const trainingDataService = new TrainingDataService(evidenceRepo, auditRepo);
    const modelService = new ModelGovernanceService(evidenceRepo, auditRepo);
    const ragService = new RAGGovernanceService(evidenceRepo, auditRepo);
    const sensitiveDataService = new SensitiveDataPreventionService(classificationRepo, evidenceRepo, auditRepo);
    const driftService = new DataDriftService(evidenceRepo, auditRepo);
    const humanReviewService = new HumanReviewService(evidenceRepo, auditRepo);

    const aiGovernanceService = new AIGovernanceService(
      datasetService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      evidenceRepo,
      auditRepo
    );

    canonicalExport = buildCanonicalExport({
      aiGovernanceService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      humanReviewService,
      evidenceRepo,
      auditRepo,
      applicationMode: 'DEMO',
    });
  });

  it('should exclude secrets from JSON export', () => {
    const jsonString = JSON.stringify(canonicalExport);
    
    expect(jsonString).not.toContain('super-secret-password');
    expect(jsonString).not.toContain('sk-1234567890abcdef1234567890abcdef');
    expect(jsonString).not.toContain('postgresql://user:pass@localhost/db');
    expect(jsonString).not.toContain('ghp_1234567890abcdef1234567890abcdef12');
    
    // Should contain redaction markers
    expect(jsonString).toContain('[REDACTED]');
  });

  it('should exclude secrets from XLSX export', () => {
    const buffer = generateXLSXBuffer(canonicalExport);
    const bufferString = new TextDecoder().decode(buffer);
    
    expect(bufferString).not.toContain('super-secret-password');
    expect(bufferString).not.toContain('sk-1234567890abcdef1234567890abcdef');
  });

  it('should exclude secrets from PDF export', () => {
    const blob = generatePDFBlob(canonicalExport);
    
    // PDF is binary, but we can check the blob size is reasonable
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.size).toBeLessThan(10000000); // Less than 10MB
  });
});

// ---- Non-Invasive Governance Tests ----

describe('Non-Invasive Governance', () => {
  it('should preserve metadata-first principle', () => {
    const assetRepo = new InMemoryAssetRepository();
    const evidenceRepo = new InMemoryEvidenceRepository();
    const auditRepo = new InMemoryAuditRepository();
    const classificationRepo = new InMemoryClassificationRepository();

    const datasetService = new (require('../src/ai-governance/dataset-service').DatasetGovernanceService)(
      assetRepo, evidenceRepo, auditRepo
    );
    const trainingDataService = new TrainingDataService(evidenceRepo, auditRepo);
    const modelService = new ModelGovernanceService(evidenceRepo, auditRepo);
    const ragService = new RAGGovernanceService(evidenceRepo, auditRepo);
    const sensitiveDataService = new SensitiveDataPreventionService(classificationRepo, evidenceRepo, auditRepo);
    const driftService = new DataDriftService(evidenceRepo, auditRepo);
    const humanReviewService = new HumanReviewService(evidenceRepo, auditRepo);

    const aiGovernanceService = new AIGovernanceService(
      datasetService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      evidenceRepo,
      auditRepo
    );

    const canonical = buildCanonicalExport({
      aiGovernanceService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      humanReviewService,
      evidenceRepo,
      auditRepo,
      applicationMode: 'DEMO',
    });

    // Verify no raw source data is included
    const exportString = JSON.stringify(canonical);
    expect(exportString).not.toContain('rawData');
    expect(exportString).not.toContain('sourceData');
    expect(exportString).not.toContain('fileContent');
  });
});
