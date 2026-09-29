// ============================================================
// BLUEPRINTS — Core Types
// ============================================================

export type BlueprintStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'DEPRECATED';

export type ImplementationLevel = 'IMPLEMENTED' | 'PARTIAL' | 'MODEL_ONLY' | 'ADAPTER_READY' | 'NOT_IMPLEMENTED';

export type HumanOversightLevel = 'STANDARD' | 'HIGH' | 'STRICT';

export type GapSeverity = 'BLOCKING' | 'NON_BLOCKING';

export interface SolutionBlueprint {
  id: string;
  name: string;
  version: string;
  description: string;
  sector: string;
  targetOrganizationType: string;
  status: BlueprintStatus;
  implementationLevel: ImplementationLevel;
  objectives: string[];
  
  // Agent configuration
  enabledAgents: string[];
  requiredAgents: string[];
  optionalAgents: string[];
  
  // Profiles
  policyProfile: PolicyProfile;
  classificationProfile: ClassificationProfile;
  qualityProfile: QualityProfile;
  trustProfile: TrustProfile;
  certificationProfile: CertificationProfile;
  humanOversightProfile: HumanOversightProfile;
  evidenceProfile: EvidenceProfile;
  auditProfile: AuditProfile;
  dashboardProfile: DashboardProfile;
  connectorProfile: ConnectorProfile;
  terminologyProfile: TerminologyProfile;
  workflowProfile: WorkflowProfile;
  riskProfile: RiskProfile;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface PolicyProfile {
  enabledPolicies: string[];
  enforcementLevel: 'PREPARED' | 'ADVISORY' | 'ENFORCED';
  customRules?: Record<string, unknown>;
}

export interface ClassificationProfile {
  priorityClassifications: string[];
  sensitivityLevels: string[];
  customPatterns?: Record<string, string>;
}

export interface QualityProfile {
  requiredDimensions: string[];
  thresholds: Record<string, number>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface TrustProfile {
  weights: {
    metadataCompleteness: number;
    qualityScore: number;
    classificationConfidence: number;
    lineageAvailability: number;
    reviewStatus: number;
  };
  minimumScore: number;
}

export interface CertificationProfile {
  requirements: {
    qualityThreshold: number;
    classificationReviewed: boolean;
    lineageAvailable: boolean;
    requiredMetadata: string[];
    policyCompliant: boolean;
    humanApproval: boolean;
  };
}

export interface HumanOversightProfile {
  level: HumanOversightLevel;
  triggers: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiredEvidence: string[];
}

export interface EvidenceProfile {
  requiredEvidence: string[];
  retentionPeriod: number;
}

export interface AuditProfile {
  requiredEvents: string[];
  retentionPeriod: number;
}

export interface DashboardProfile {
  visibleWidgets: string[];
  priority: string[];
  ordering: string[];
  terminology: Record<string, string>;
}

export interface ConnectorProfile {
  permittedConnectors: string[];
  restrictedConnectors: string[];
}

export interface TerminologyProfile {
  assetTerm: string;
  sourceTerm: string;
  classificationTerm: string;
  qualityTerm: string;
  customTerms: Record<string, string>;
}

export interface WorkflowProfile {
  onboardingSteps: string[];
  reviewWorkflow: string[];
  certificationWorkflow: string[];
}

export interface RiskProfile {
  riskThresholds: Record<string, number>;
  sensitiveDataProfile: 'STANDARD' | 'STRICT' | 'MAXIMUM';
}

export interface BlueprintReadiness {
  blueprintId: string;
  overallScore: number;
  implemented: number;
  partial: number;
  adapterReady: number;
  notImplemented: number;
  blocked: number;
  details: BlueprintReadinessDetail[];
}

export interface BlueprintReadinessDetail {
  capability: string;
  implementationLevel: ImplementationLevel;
  status: 'READY' | 'PARTIAL' | 'NOT_READY' | 'BLOCKED';
}

export interface BlueprintGapAnalysis {
  blueprintId: string;
  gaps: BlueprintGap[];
  blockingGaps: number;
  nonBlockingGaps: number;
}

export interface BlueprintGap {
  capability: string;
  type: 'AGENT' | 'CONNECTOR' | 'POLICY' | 'IDENTITY' | 'PERSISTENCE' | 'RUNTIME';
  severity: GapSeverity;
  reason: string;
  recommendation: string;
}

export interface BlueprintRequirement {
  requirement: string;
  capability: string;
  responsibleAgent: string;
  policy: string;
  implementationLevel: ImplementationLevel;
  evidenceRequired: boolean;
  humanOversight: boolean;
  status: 'MET' | 'PARTIAL' | 'NOT_MET' | 'BLOCKED';
}
