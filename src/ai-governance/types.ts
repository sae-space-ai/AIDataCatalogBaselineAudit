// ============================================================
// AI GOVERNANCE — Core Types
// ============================================================

// ---- AI Asset Types (Extension of AssetType) ----

export type AIAssetType = 
  | 'DATASET'
  | 'TRAINING_DATASET'
  | 'VALIDATION_DATASET'
  | 'TEST_DATASET'
  | 'MODEL'
  | 'MODEL_VERSION'
  | 'RAG_RESOURCE'
  | 'PROMPT_TEMPLATE'
  | 'AI_APPLICATION'
  | 'AI_PIPELINE';

// ---- Dataset Types ----

export type DatasetRole = 
  | 'GENERAL'
  | 'TRAINING'
  | 'VALIDATION'
  | 'TEST'
  | 'EVALUATION'
  | 'RAG'
  | 'REFERENCE'
  | 'OTHER';

export interface DatasetProfile {
  assetId: string;
  datasetPurpose: string;
  datasetRole: DatasetRole;
  domain?: string;
  ownerReference?: string;
  sourceReferences: string[];
  versionReference?: string;
  schemaReference?: string;
  classificationSummary?: {
    totalClassifications: number;
    piiCount: number;
    sensitiveCount: number;
  };
  qualitySummary?: {
    overallScore: number;
    completeness: number;
    validity: number;
  };
  lineageSummary?: {
    upstreamCount: number;
    downstreamCount: number;
  };
  usageRestrictions?: string[];
  retentionReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetGovernanceSnapshot {
  datasetAssetId: string;
  assetVersionId: string;
  schemaFingerprint: string;
  classificationSnapshot: {
    classifications: string[]; // Classification IDs
    timestamp: string;
  };
  qualitySnapshot: {
    qualityResults: string[]; // QualityResult IDs
    timestamp: string;
  };
  lineageSnapshot: {
    relationships: string[]; // AssetRelationship IDs
    timestamp: string;
  };
  policyAssessmentIds: string[];
  evidenceIds: string[];
  createdAt: string;
}

// ---- Training Data Types ----

export type TrainingDataApprovalStatus = 
  | 'NOT_EVALUATED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'APPROVED_WITH_CONDITIONS'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'STALE';

export interface TrainingDatasetRecord {
  id: string;
  datasetAssetId: string;
  datasetVersionId: string;
  purpose: string;
  intendedUse: string;
  allowedUses: string[];
  restrictedUses: string[];
  sourceReferences: string[];
  lineageStatus: 'COMPLETE' | 'PARTIAL' | 'MISSING' | 'NOT_EVALUATED';
  classificationStatus: 'REVIEWED' | 'PENDING' | 'NOT_EVALUATED';
  qualityStatus: 'ACCEPTABLE' | 'NEEDS_IMPROVEMENT' | 'NOT_EVALUATED';
  approvalStatus: TrainingDataApprovalStatus;
  humanReviewTaskId?: string;
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ---- Model Types ----

export interface ModelProfile {
  assetId: string;
  modelName: string;
  modelVersion: string;
  modelType: string;
  providerReference?: string; // Metadata only, no API keys
  purpose: string;
  intendedUse: string;
  limitations?: string[];
  inputSpecification: ModelInputSpecification;
  outputSpecification: ModelOutputSpecification;
  trainingDatasetReferences: string[]; // TrainingDatasetRecord IDs
  validationDatasetReferences: string[];
  testDatasetReferences: string[];
  governanceStatus: 'GOVERNED' | 'PARTIAL' | 'NOT_EVALUATED';
  createdAt: string;
  updatedAt: string;
}

export interface ModelInputSpecification {
  fields: ModelInputField[];
}

export interface ModelInputField {
  name: string;
  type: string;
  required: boolean;
  classification?: string;
  allowedRange?: { min?: number; max?: number };
  allowedValues?: string[];
  sensitivity?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  source?: string;
  transformationReference?: string;
  validationRequirements?: string[];
}

export interface ModelOutputSpecification {
  outputType: string;
  meaning: string;
  classification?: string;
  downstreamUse?: string;
  knownLimitations?: string[];
  humanReviewRequired: boolean;
}

// ---- AI Use Case Types ----

export type AIUseCaseStatus = 
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'APPROVED_INTERNAL'
  | 'SUSPENDED'
  | 'RETIRED';

export interface AIUseCase {
  id: string;
  name: string;
  description: string;
  purpose: string;
  businessDomain: string;
  ownerReference?: string;
  aiApplicationAssetId: string;
  modelReferences: string[]; // ModelProfile asset IDs
  datasetReferences: string[]; // DatasetProfile asset IDs
  ragResourceReferences: string[]; // RAGResourceProfile asset IDs
  humanOversightProfile: {
    required: boolean;
    level: 'STANDARD' | 'HIGH' | 'STRICT';
  };
  policyProfile: {
    policyIds: string[];
  };
  status: AIUseCaseStatus;
  createdAt: string;
  updatedAt: string;
}

// ---- RAG Resource Types ----

export type RAGResourceType = 
  | 'DATASET'
  | 'DOCUMENT_COLLECTION'
  | 'KNOWLEDGE_BASE'
  | 'API_RESOURCE'
  | 'OTHER';

export type RAGEligibilityStatus = 
  | 'ELIGIBLE'
  | 'NOT_ELIGIBLE'
  | 'REQUIRES_REVIEW'
  | 'NOT_EVALUATED'
  | 'STALE';

export interface RAGResourceProfile {
  assetId: string;
  resourceType: RAGResourceType;
  sourceReference: string;
  versionReference?: string;
  classificationSummary?: {
    totalClassifications: number;
    sensitiveClassifications: number;
  };
  qualitySummary?: {
    overallScore: number;
  };
  lineageSummary?: {
    upstreamCount: number;
  };
  freshness?: string;
  usageRestrictions?: string[];
  eligibilityStatus: RAGEligibilityStatus;
  policyAssessmentIds: string[];
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RAGEligibilityAssessment {
  id: string;
  ragResourceAssetId: string;
  status: RAGEligibilityStatus;
  classificationCheck: 'PASS' | 'FAIL' | 'NOT_EVALUATED';
  sensitiveDataCheck: 'CLEAR' | 'RESTRICTED' | 'BLOCKED' | 'NOT_EVALUATED';
  qualityCheck: 'PASS' | 'FAIL' | 'NOT_EVALUATED';
  lineageCheck: 'PASS' | 'FAIL' | 'NOT_EVALUATED';
  freshnessCheck: 'PASS' | 'FAIL' | 'NOT_EVALUATED';
  policyCheck: 'PASS' | 'FAIL' | 'NOT_EVALUATED';
  evidenceCheck: 'SUFFICIENT' | 'INSUFFICIENT' | 'NOT_EVALUATED';
  reasons: string[];
  evidenceIds: string[];
  assessedAt: string;
}

// ---- Sensitive Data Types ----

export type SensitiveDataStatus = 
  | 'CLEAR'
  | 'RESTRICTED'
  | 'BLOCKED'
  | 'REQUIRES_REVIEW'
  | 'NOT_EVALUATED';

export interface SensitiveDataAssessment {
  id: string;
  subjectType: string;
  subjectId: string;
  status: SensitiveDataStatus;
  piiDetected: boolean;
  financialDataDetected: boolean;
  confidentialDataDetected: boolean;
  classifications: string[]; // Classification IDs
  reasons: string[];
  evidenceIds: string[];
  assessedAt: string;
}

// ---- Data Drift Types ----

export type DriftType = 
  | 'SCHEMA_DRIFT'
  | 'QUALITY_DRIFT'
  | 'CLASSIFICATION_DRIFT'
  | 'STATISTICAL_DRIFT'
  | 'SOURCE_DRIFT';

export type DriftSeverity = 
  | 'NO_DRIFT'
  | 'MINOR_DRIFT'
  | 'MATERIAL_DRIFT'
  | 'CRITICAL_DRIFT'
  | 'NOT_EVALUATED';

export interface DataDriftAssessment {
  id: string;
  subjectType: string;
  subjectId: string;
  driftType: DriftType;
  severity: DriftSeverity;
  previousSnapshot?: string; // Snapshot ID
  currentSnapshot?: string; // Snapshot ID
  changes: DriftChange[];
  reason: string;
  evidenceIds: string[];
  affectedResources: string[]; // Asset IDs
  assessedAt: string;
}

export interface DriftChange {
  field: string;
  previousValue?: unknown;
  currentValue?: unknown;
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DriftThresholdProfile {
  id: string;
  name: string;
  driftType: DriftType;
  thresholds: {
    minor: number;
    material: number;
    critical: number;
  };
  applicableTo: string[]; // Blueprint IDs, dataset types, etc.
}

// ---- AI Governance Assessment Types ----

export type AIGovernanceStatus = 
  | 'APPROVED_INTERNAL'
  | 'APPROVED_WITH_CONDITIONS'
  | 'REQUIRES_REVIEW'
  | 'NOT_APPROVED'
  | 'NOT_EVALUATED'
  | 'STALE';

export interface AIGovernanceAssessment {
  id: string;
  subjectType: string;
  subjectId: string;
  aiUseCaseId?: string;
  datasetAssessments: string[]; // SensitiveDataAssessment IDs
  modelInputAssessment?: {
    status: 'PASS' | 'FAIL' | 'WARN' | 'NOT_EVALUATED' | 'REQUIRES_REVIEW';
    reasons: string[];
  };
  ragAssessments: string[]; // RAGEligibilityAssessment IDs
  sensitiveDataAssessment?: string; // SensitiveDataAssessment ID
  driftAssessment?: string; // DataDriftAssessment ID
  policyAssessmentIds: string[];
  controlExecutionIds: string[];
  evidenceCoverage: {
    required: number;
    available: number;
    status: 'FULL' | 'PARTIAL' | 'INSUFFICIENT';
  };
  humanReviews: string[]; // HumanReviewTask IDs
  status: AIGovernanceStatus;
  reasons: string[];
  createdAt: string;
  completedAt?: string;
}

// ---- AI Data Usage Policy Types ----

export interface AIDataUsagePolicy {
  id: string;
  name: string;
  description: string;
  allowedPurposes: string[];
  restrictedPurposes: string[];
  allowedAIUses: string[];
  prohibitedAIUses: string[];
  humanReviewRequired: boolean;
  evidenceRequirements: string[];
  expiration?: string;
  conditions: string[];
}

export type PurposeCompatibility = 
  | 'COMPATIBLE'
  | 'INCOMPATIBLE'
  | 'REQUIRES_REVIEW'
  | 'NOT_EVALUATED';

// ---- AI Reproducibility Types ----

export interface AIReproducibilityRecord {
  id: string;
  aiUseCaseId: string;
  modelVersionId: string;
  trainingDatasetVersionIds: string[];
  validationDatasetVersionIds: string[];
  testDatasetVersionIds: string[];
  governanceSnapshotIds: string[];
  policyVersionIds: string[];
  evidenceIds: string[];
  timestamp: string;
  reproducibilityLevel: 'FULL' | 'GOVERNANCE_REPRODUCIBILITY_ONLY' | 'NOT_EVALUATED';
}
