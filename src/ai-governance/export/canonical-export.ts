// ============================================================
// AI GOVERNANCE — Canonical Export Object
// ============================================================
//
// Single source of truth for all governance export formats.
// JSON, XLSX and PDF serializers consume this canonical object
// to ensure consistency across formats.
//
// SECURITY: This module applies non-invasive governance rules:
// - No passwords, tokens, API keys, DATABASE_URL
// - No raw credentials or sensitive source data
// - Metadata-first, evidence-by-reference
//

import type { AIGovernanceService } from '../ai-governance-service';
import type { TrainingDataService } from '../training-data-service';
import type { ModelGovernanceService } from '../model-service';
import type { RAGGovernanceService } from '../rag-service';
import type { SensitiveDataPreventionService } from '../sensitive-data-service';
import type { DataDriftService } from '../drift-service';
import type { HumanReviewService } from '../../services/human-review-service';
import type { EvidenceRepository, AuditRepository } from '../../domain/contracts';
import type { ApplicationMode } from '../../app/config';
import type { AIUseCase } from '../types';
import type { TrainingDatasetRecord } from '../types';
import type { ModelProfile } from '../types';
import type { RAGResourceProfile } from '../types';
import type { DataDriftAssessment } from '../types';
import type { SensitiveDataAssessment } from '../types';
import type { AIGovernanceAssessment } from '../types';
import type { EvidenceRecord, AuditEvent } from '../../types';
import type { HumanReviewTask } from '../../agents/types';

// ---- Canonical Export Interfaces ----

export interface CanonicalExportObject {
  exportTimestamp: string;
  exportVersion: string;
  applicationMode: ApplicationMode;
  reportTitle: string;
  
  // Executive Summary
  executiveSummary: ExecutiveSummary;
  
  // Core governance data
  aiUseCases: CanonicalAIUseCase[];
  trainingData: CanonicalTrainingData[];
  models: CanonicalModel[];
  ragResources: CanonicalRAGResource[];
  driftAssessments: CanonicalDriftAssessment[];
  sensitiveDataAssessments: CanonicalSensitiveDataAssessment[];
  governanceAssessments: CanonicalGovernanceAssessment[];
  
  // Evidence & Audit
  evidenceRecords: CanonicalEvidence[];
  auditEvents: CanonicalAuditEvent[];
  humanReviews: CanonicalHumanReview[];
  certifications: CanonicalCertification[];
  
  // Timeline
  timelineEvents: CanonicalTimelineEvent[];
}

export interface ExecutiveSummary {
  exportTimestamp: string;
  applicationMode: ApplicationMode;
  exportVersion: string;
  totalAIUseCases: number;
  totalTrainingDatasets: number;
  totalModels: number;
  totalRAGResources: number;
  totalDriftAssessments: number;
  totalSensitiveDataAssessments: number;
  totalGovernanceAssessments: number;
  totalEvidenceRecords: number;
  totalAuditRecords: number;
  totalHumanReviews: number;
  totalCertifications: number;
}

export interface CanonicalAIUseCase {
  id: string;
  name: string;
  description: string;
  purpose: string;
  businessDomain: string;
  status: string;
  modelReferences: string[];
  datasetReferences: string[];
  ragResourceReferences: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalTrainingData {
  id: string;
  datasetAssetId: string;
  datasetVersionId: string;
  purpose: string;
  intendedUse: string;
  lineageStatus: string;
  classificationStatus: string;
  qualityStatus: string;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalModel {
  assetId: string;
  modelName: string;
  modelVersion: string;
  modelType: string;
  purpose: string;
  intendedUse: string;
  governanceStatus: string;
  inputFieldsCount: number;
  trainingDatasetsCount: number;
  validationDatasetsCount: number;
  testDatasetsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalRAGResource {
  assetId: string;
  resourceType: string;
  sourceReference: string;
  eligibilityStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalDriftAssessment {
  id: string;
  subjectType: string;
  subjectId: string;
  driftType: string;
  severity: string;
  reason: string;
  changesCount: number;
  affectedResourcesCount: number;
  assessedAt: string;
}

export interface CanonicalSensitiveDataAssessment {
  id: string;
  subjectType: string;
  subjectId: string;
  status: string;
  piiDetected: boolean;
  financialDataDetected: boolean;
  confidentialDataDetected: boolean;
  classificationsCount: number;
  reasons: string[];
  assessedAt: string;
}

export interface CanonicalGovernanceAssessment {
  id: string;
  subjectType: string;
  subjectId: string;
  status: string;
  datasetAssessmentsCount: number;
  ragAssessmentsCount: number;
  evidenceCoverageRequired: number;
  evidenceCoverageAvailable: number;
  evidenceCoverageStatus: string;
  humanReviewsCount: number;
  reasons: string[];
  createdAt: string;
  completedAt?: string;
}

export interface CanonicalEvidence {
  id: string;
  type: string;
  subjectType: string;
  subjectId: string;
  actor: string;
  timestamp: string;
  source: string;
}

export interface CanonicalAuditEvent {
  id: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
}

export interface CanonicalHumanReview {
  id: string;
  type: string;
  subjectType: string;
  subjectId: string;
  reason: string;
  priority: string;
  status: string;
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
  decision?: string;
}

export interface CanonicalCertification {
  id: string;
  certificationId: string;
  subjectType: string;
  subjectId: string;
  state: string;
  grantedAt?: string;
  grantedBy?: string;
  expiresAt?: string;
  revokedAt?: string;
}

export interface CanonicalTimelineEvent {
  id: string;
  timestamp: string;
  type: string;
  category: 'SYSTEM' | 'ASSESSMENT' | 'REVIEW' | 'DECISION' | 'CERTIFICATION' | 'EVIDENCE' | 'AUDIT';
  subjectType: string;
  subjectId: string;
  actor: string;
  description: string;
}

// ---- Secret Redaction ----

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/i,
  /ghp_[a-zA-Z0-9]{36}/i,
  /AKIA[0-9A-Z]{16}/i,
  /postgresql:\/\/[^@]+:[^@]+@/i,
  /mongodb(\+srv)?:\/\/[^@]+:[^@]+@/i,
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----/i,
];

function redactSecrets(value: string): string {
  let redacted = value;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  return redacted;
}

function redactObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return redactSecrets(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item)) as unknown as T;
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip known secret fields
      if (['password', 'token', 'secret', 'apiKey', 'accessKey', 'secretKey', 'databaseUrl', 'connectionString'].includes(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactObject(value);
      }
    }
    return result as T;
  }
  return obj;
}

// ---- Canonical Export Builder ----

export interface CanonicalExportDependencies {
  aiGovernanceService: AIGovernanceService;
  trainingDataService: TrainingDataService;
  modelService: ModelGovernanceService;
  ragService: RAGGovernanceService;
  sensitiveDataService: SensitiveDataPreventionService;
  driftService: DataDriftService;
  humanReviewService: HumanReviewService;
  evidenceRepo: EvidenceRepository;
  auditRepo: AuditRepository;
  applicationMode: ApplicationMode;
}

export function buildCanonicalExport(deps: CanonicalExportDependencies): CanonicalExportObject {
  const now = new Date().toISOString();
  
  // Build each section from services
  const aiUseCases: CanonicalAIUseCase[] = deps.aiGovernanceService.listAIUseCases().map((uc: AIUseCase) => ({
    id: uc.id,
    name: uc.name,
    description: uc.description,
    purpose: uc.purpose,
    businessDomain: uc.businessDomain,
    status: uc.status,
    modelReferences: uc.modelReferences,
    datasetReferences: uc.datasetReferences,
    ragResourceReferences: uc.ragResourceReferences,
    createdAt: uc.createdAt,
    updatedAt: uc.updatedAt,
  }));

  const trainingData: CanonicalTrainingData[] = deps.trainingDataService.listTrainingDatasets().map((td: TrainingDatasetRecord) => ({
    id: td.id,
    datasetAssetId: td.datasetAssetId,
    datasetVersionId: td.datasetVersionId,
    purpose: td.purpose,
    intendedUse: td.intendedUse,
    lineageStatus: td.lineageStatus,
    classificationStatus: td.classificationStatus,
    qualityStatus: td.qualityStatus,
    approvalStatus: td.approvalStatus,
    createdAt: td.createdAt,
    updatedAt: td.updatedAt,
  }));

  const models: CanonicalModel[] = deps.modelService.listModelProfiles().map((model: ModelProfile) => ({
    assetId: model.assetId,
    modelName: model.modelName,
    modelVersion: model.modelVersion,
    modelType: model.modelType,
    purpose: model.purpose,
    intendedUse: model.intendedUse,
    governanceStatus: model.governanceStatus,
    inputFieldsCount: model.inputSpecification.fields.length,
    trainingDatasetsCount: model.trainingDatasetReferences.length,
    validationDatasetsCount: model.validationDatasetReferences.length,
    testDatasetsCount: model.testDatasetReferences.length,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  }));

  const ragResources: CanonicalRAGResource[] = deps.ragService.listRAGResourceProfiles().map((rag: RAGResourceProfile) => ({
    assetId: rag.assetId,
    resourceType: rag.resourceType,
    sourceReference: rag.sourceReference,
    eligibilityStatus: rag.eligibilityStatus,
    createdAt: rag.createdAt,
    updatedAt: rag.updatedAt,
  }));

  const driftAssessments: CanonicalDriftAssessment[] = deps.driftService.listDriftAssessments().map((drift: DataDriftAssessment) => ({
    id: drift.id,
    subjectType: drift.subjectType,
    subjectId: drift.subjectId,
    driftType: drift.driftType,
    severity: drift.severity,
    reason: drift.reason,
    changesCount: drift.changes.length,
    affectedResourcesCount: drift.affectedResources.length,
    assessedAt: drift.assessedAt,
  }));

  const sensitiveDataAssessments: CanonicalSensitiveDataAssessment[] = deps.sensitiveDataService.listSensitiveDataAssessments().map((sda: SensitiveDataAssessment) => ({
    id: sda.id,
    subjectType: sda.subjectType,
    subjectId: sda.subjectId,
    status: sda.status,
    piiDetected: sda.piiDetected,
    financialDataDetected: sda.financialDataDetected,
    confidentialDataDetected: sda.confidentialDataDetected,
    classificationsCount: sda.classifications.length,
    reasons: sda.reasons,
    assessedAt: sda.assessedAt,
  }));

  const governanceAssessments: CanonicalGovernanceAssessment[] = deps.aiGovernanceService.listAIGovernanceAssessments().map((a: AIGovernanceAssessment) => ({
    id: a.id,
    subjectType: a.subjectType,
    subjectId: a.subjectId,
    status: a.status,
    datasetAssessmentsCount: a.datasetAssessments.length,
    ragAssessmentsCount: a.ragAssessments.length,
    evidenceCoverageRequired: a.evidenceCoverage.required,
    evidenceCoverageAvailable: a.evidenceCoverage.available,
    evidenceCoverageStatus: a.evidenceCoverage.status,
    humanReviewsCount: a.humanReviews.length,
    reasons: a.reasons,
    createdAt: a.createdAt,
    completedAt: a.completedAt,
  }));

  const evidenceRecords: CanonicalEvidence[] = deps.evidenceRepo.getAll().map((e: EvidenceRecord) => ({
    id: e.id,
    type: e.type,
    subjectType: e.subjectType,
    subjectId: e.subjectId,
    actor: e.actor,
    timestamp: e.timestamp,
    source: e.source,
  }));

  const auditEvents: CanonicalAuditEvent[] = deps.auditRepo.getAll().map((e: AuditEvent) => ({
    id: e.id,
    actor: e.actor,
    action: e.action,
    resourceType: e.resourceType,
    resourceId: e.resourceId,
    timestamp: e.timestamp,
  }));

  const humanReviews: CanonicalHumanReview[] = deps.humanReviewService.listTasks().map((t: HumanReviewTask) => ({
    id: t.id,
    type: t.type,
    subjectType: t.subjectType,
    subjectId: t.subjectId,
    reason: t.reason,
    priority: t.priority,
    status: t.status,
    assignedTo: t.assignedTo,
    createdAt: t.createdAt,
    resolvedAt: t.resolvedAt,
    decision: t.decision,
  }));

  // Certifications are not yet tracked in a dedicated service
  // Use an empty array as placeholder for future integration
  const certifications: CanonicalCertification[] = [];

  // Build timeline from evidence + audit events
  const timelineEvents: CanonicalTimelineEvent[] = [
    ...evidenceRecords.map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      type: e.type,
      category: 'EVIDENCE' as const,
      subjectType: e.subjectType,
      subjectId: e.subjectId,
      actor: e.actor,
      description: `Evidence: ${e.type}`,
    })),
    ...auditEvents.map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      type: e.action,
      category: 'AUDIT' as const,
      subjectType: e.resourceType,
      subjectId: e.resourceId,
      actor: e.actor,
      description: `Audit: ${e.action} on ${e.resourceType}`,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const executiveSummary: ExecutiveSummary = {
    exportTimestamp: now,
    applicationMode: deps.applicationMode,
    exportVersion: '1.0.0',
    totalAIUseCases: aiUseCases.length,
    totalTrainingDatasets: trainingData.length,
    totalModels: models.length,
    totalRAGResources: ragResources.length,
    totalDriftAssessments: driftAssessments.length,
    totalSensitiveDataAssessments: sensitiveDataAssessments.length,
    totalGovernanceAssessments: governanceAssessments.length,
    totalEvidenceRecords: evidenceRecords.length,
    totalAuditRecords: auditEvents.length,
    totalHumanReviews: humanReviews.length,
    totalCertifications: certifications.length,
  };

  const canonical: CanonicalExportObject = {
    exportTimestamp: now,
    exportVersion: '1.0.0',
    applicationMode: deps.applicationMode,
    reportTitle: 'AI Data Catalog Baseline Audit - AI Governance Report',
    executiveSummary,
    aiUseCases,
    trainingData,
    models,
    ragResources,
    driftAssessments,
    sensitiveDataAssessments,
    governanceAssessments,
    evidenceRecords,
    auditEvents,
    humanReviews,
    certifications,
    timelineEvents,
  };

  // Apply secret redaction as a safety net
  return redactObject(canonical);
}

// ---- Deterministic Filename ----

export function generateExportFilename(extension: 'json' | 'xlsx' | 'pdf'): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
  const prefix = extension === 'pdf' ? 'ai-governance-report' : 'ai-governance-export';
  return `${prefix}-${dateStr}-${timeStr}.${extension}`;
}
