// ============================================================
// GOVERNANCE — Core Types
// ============================================================

export type PolicyStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'DEPRECATED' | 'RETIRED';

export type PolicyCategory =
  | 'DATA_GOVERNANCE'
  | 'PRIVACY'
  | 'DATA_QUALITY'
  | 'SECURITY'
  | 'AI_GOVERNANCE'
  | 'ACCESS'
  | 'RETENTION'
  | 'LINEAGE'
  | 'CERTIFICATION'
  | 'RAG_GOVERNANCE'
  | 'TRAINING_DATA'
  | 'CUSTOM';

export type PolicyScopeType =
  | 'ORGANIZATION'
  | 'BLUEPRINT'
  | 'SOURCE'
  | 'ASSET_TYPE'
  | 'ASSET'
  | 'CLASSIFICATION'
  | 'DOMAIN'
  | 'DATASET'
  | 'MODEL_RELATED';

export type ControlType = 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE' | 'GOVERNANCE';

export type ControlExecutionMode = 'AUTOMATED' | 'SEMI_AUTOMATED' | 'MANUAL' | 'NOT_AVAILABLE';

export type ControlImplementationLevel = 'IMPLEMENTED' | 'PARTIAL' | 'MODEL_ONLY' | 'ADAPTER_READY' | 'NOT_IMPLEMENTED';

export type ControlResult = 'PASS' | 'FAIL' | 'WARN' | 'NOT_EVALUATED' | 'REQUIRES_REVIEW' | 'NOT_APPLICABLE' | 'ERROR';

export type ComplianceStatus =
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'PARTIALLY_COMPLIANT'
  | 'REQUIRES_REVIEW'
  | 'NOT_EVALUATED'
  | 'NOT_APPLICABLE';

export type ExceptionStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';

export type CertificationState =
  | 'UNCERTIFIED'
  | 'ELIGIBLE'
  | 'REQUIRES_REVIEW'
  | 'CERTIFIED'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'EXPIRED';

export type RemediationStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ACCEPTED_RISK' | 'CANCELLED';

export type RiskState = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'NOT_EVALUATED';

export type ConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'IN'
  | 'NOT_IN'
  | 'GREATER_THAN'
  | 'GREATER_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_OR_EQUAL'
  | 'EXISTS'
  | 'NOT_EXISTS'
  | 'CONTAINS';

// ---- POLICY DEFINITION ----

export interface PolicyDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  category: PolicyCategory;
  scope: PolicyScope[];
  status: PolicyStatus;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  conditions: PolicyCondition[];
  controls: string[]; // Control IDs
  evidenceRequirements: EvidenceRequirement[];
  humanOversight: boolean;
  effectiveFrom: string;
  effectiveUntil?: string;
  ownerReference?: string;
  priority?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyScope {
  type: PolicyScopeType;
  value: string;
}

export interface PolicyCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  description?: string;
}

// ---- CONTROL DEFINITION ----

export interface ControlDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  controlType: ControlType;
  executionMode: ControlExecutionMode;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  implementationLevel: ControlImplementationLevel;
  evidenceRequirements: EvidenceRequirement[];
  humanOversightRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- CONTROL EXECUTION ----

export interface ControlExecution {
  id: string;
  controlId: string;
  controlVersion: string;
  subjectType: string;
  subjectId: string;
  status: ControlResult;
  startedAt: string;
  completedAt?: string;
  inputs: Record<string, unknown>;
  result?: Record<string, unknown>;
  evidenceIds: string[];
  reviewTaskId?: string;
  correlationId: string;
  error?: string;
}

// ---- POLICY EVALUATION ----

export interface PolicyEvaluationV2 {
  id: string;
  policyId: string;
  policyVersion: string;
  subjectType: string;
  subjectId: string;
  applicability: 'APPLICABLE' | 'NOT_APPLICABLE';
  conditionsEvaluated: ConditionEvaluation[];
  controlsExecuted: string[]; // ControlExecution IDs
  status: ControlResult;
  reason: string;
  evidenceIds: string[];
  timestamp: string;
  simulationMode: boolean;
}

export interface ConditionEvaluation {
  condition: PolicyCondition;
  result: boolean;
  actualValue: unknown;
  explanation: string;
}

// ---- COMPLIANCE ASSESSMENT ----

export interface ComplianceAssessment {
  id: string;
  subjectType: string;
  subjectId: string;
  scope: PolicyScope[];
  status: ComplianceStatus;
  policyEvaluations: string[]; // PolicyEvaluationV2 IDs
  controlExecutions: string[]; // ControlExecution IDs
  evidenceCoverage: EvidenceCoverage;
  openReviews: number;
  exceptions: string[]; // PolicyException IDs
  startedAt: string;
  completedAt?: string;
}

// ---- POLICY EXCEPTION ----

export interface PolicyException {
  id: string;
  policyId: string;
  subjectType: string;
  subjectId: string;
  reason: string;
  requestedBy: string;
  approvedBy?: string;
  status: ExceptionStatus;
  validFrom: string;
  validUntil?: string;
  evidenceIds: string[];
  reviewTaskId?: string;
  createdAt: string;
}

// ---- EVIDENCE REQUIREMENTS ----

export interface EvidenceRequirement {
  type: string;
  minimumCount: number;
  freshness?: number; // days
  sourceRequirement?: string;
  humanConfirmationRequired: boolean;
}

export interface EvidenceCoverage {
  required: number;
  available: number;
  missing: number;
  expired: number;
  invalid: number;
  coverageStatus: 'FULL' | 'PARTIAL' | 'INSUFFICIENT' | 'NONE';
}

export interface EvidencePack {
  id: string;
  subjectType: string;
  subjectId: string;
  assessmentId?: string;
  policyVersions: string[];
  evidenceIds: string[];
  generatedAt: string;
  status: 'DRAFT' | 'COMPLETE' | 'EXPIRED';
}

// ---- CERTIFICATION ----

export interface CertificationDefinition {
  id: string;
  name: string;
  description: string;
  requirements: CertificationRequirement[];
  validForDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface CertificationRequirement {
  type: 'QUALITY' | 'CLASSIFICATION' | 'LINEAGE' | 'METADATA' | 'TRUST' | 'POLICY' | 'EVIDENCE' | 'HUMAN_APPROVAL';
  threshold?: number;
  description: string;
  mandatory: boolean;
}

export interface CertificationAssessment {
  id: string;
  certificationId: string;
  subjectType: string;
  subjectId: string;
  state: CertificationState;
  requirementsEvaluated: CertificationRequirementEvaluation[];
  evidenceIds: string[];
  reviewTaskId?: string;
  assessedAt: string;
  expiresAt?: string;
}

export interface CertificationRequirementEvaluation {
  requirement: CertificationRequirement;
  status: 'MET' | 'NOT_MET' | 'NOT_EVALUATED';
  actualValue?: unknown;
  explanation: string;
}

export interface CertificationRecord {
  id: string;
  certificationId: string;
  subjectType: string;
  subjectId: string;
  state: CertificationState;
  grantedAt?: string;
  grantedBy?: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
  evidenceIds: string[];
}

// ---- REMEDIATION ----

export interface RemediationAction {
  id: string;
  source: string; // 'policy' | 'control' | 'assessment' | 'certification'
  sourceId: string;
  subjectType: string;
  subjectId: string;
  issue: string;
  recommendedAction: string;
  status: RemediationStatus;
  assignedTo?: string;
  dueDate?: string;
  evidenceIds: string[];
  createdAt: string;
  resolvedAt?: string;
}

// ---- GOVERNANCE RISK ----

export interface GovernanceRisk {
  id: string;
  subjectType: string;
  subjectId: string;
  likelihood: RiskState;
  impact: RiskState;
  severity: RiskState;
  reason: string;
  evidenceIds: string[];
  status: 'IDENTIFIED' | 'MITIGATED' | 'ACCEPTED' | 'TRANSFERRED';
  createdAt: string;
  updatedAt: string;
}

// ---- POLICY CONFLICT ----

export interface PolicyConflict {
  id: string;
  policyIds: string[];
  conflictType: 'CONTRADICTORY' | 'OVERLAPPING' | 'INCOMPATIBLE' | 'PRIORITY_AMBIGUITY';
  description: string;
  resolution: 'HUMAN_REVIEW_REQUIRED' | 'PRIORITY_BASED' | 'UNRESOLVED';
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}
