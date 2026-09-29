// ============================================================
// AI GOVERNANCE — Profiles
// ============================================================

export interface AIGovernanceProfile {
  id: string;
  name: string;
  description: string;
  intendedContext: string;
  applicableResourceTypes: string[];
  recommendedPolicies: string[];
  recommendedControls: string[];
  humanReviewExpectations: {
    required: boolean;
    level: 'STANDARD' | 'HIGH' | 'STRICT';
    triggers: string[];
  };
  evidenceExpectations: {
    requiredTypes: string[];
    minimumCoverage: number;
  };
  driftExpectations: {
    monitoringEnabled: boolean;
    thresholdProfile: string;
  };
  certificationExpectations: {
    required: boolean;
    level: 'BASIC' | 'STANDARD' | 'ENHANCED';
  };
  nonInvasiveConstraints: {
    metadataFirst: boolean;
    readOnlyByDefault: boolean;
    dataMinimization: boolean;
    sourceSovereignty: boolean;
    evidenceByReference: boolean;
  };
}

// ============================================================
// 1. PUBLIC ADMINISTRATION AI PROFILE
// ============================================================

export const PUBLIC_ADMINISTRATION_AI_PROFILE: AIGovernanceProfile = {
  id: 'public-administration-ai',
  name: 'Public Administration AI Governance',
  description: 'Strict governance for AI systems in public sector organizations',
  intendedContext: 'Government agencies, tax authorities, public services',
  applicableResourceTypes: ['DATASET', 'TRAINING_DATASET', 'MODEL', 'AI_USE_CASE'],
  recommendedPolicies: [
    'PUBLIC_DATA_PROTECTION',
    'CITIZEN_PRIVACY',
    'TRANSPARENCY_REQUIREMENT',
    'AUDIT_TRAIL_MANDATORY',
  ],
  recommendedControls: [
    'DATA_MINIMIZATION_CONTROL',
    'PURPOSE_LIMITATION_CONTROL',
    'CITIZEN_CONSENT_CONTROL',
    'TRANSPARENCY_CONTROL',
  ],
  humanReviewExpectations: {
    required: true,
    level: 'STRICT',
    triggers: [
      'CITIZEN_DATA_USAGE',
      'SENSITIVE_CLASSIFICATION',
      'AUTOMATED_DECISION',
      'PUBLIC_IMPACT',
    ],
  },
  evidenceExpectations: {
    requiredTypes: [
      'DATA_PROVENANCE',
      'PURPOSE_DOCUMENTATION',
      'CITIZEN_IMPACT_ASSESSMENT',
      'COMPLIANCE_EVIDENCE',
    ],
    minimumCoverage: 95,
  },
  driftExpectations: {
    monitoringEnabled: true,
    thresholdProfile: 'STRICT',
  },
  certificationExpectations: {
    required: true,
    level: 'ENHANCED',
  },
  nonInvasiveConstraints: {
    metadataFirst: true,
    readOnlyByDefault: true,
    dataMinimization: true,
    sourceSovereignty: true,
    evidenceByReference: true,
  },
};

// ============================================================
// 2. SME AI PROFILE
// ============================================================

export const SME_AI_PROFILE: AIGovernanceProfile = {
  id: 'sme-ai',
  name: 'SME & Self-Employed AI Governance',
  description: 'Simplified governance for small businesses and freelancers',
  intendedContext: 'Small and medium enterprises, micro-businesses, self-employed professionals',
  applicableResourceTypes: ['DATASET', 'TRAINING_DATASET', 'MODEL', 'AI_USE_CASE'],
  recommendedPolicies: [
    'BASIC_DATA_PROTECTION',
    'SIMPLE_PRIVACY',
    'ESSENTIAL_SECURITY',
  ],
  recommendedControls: [
    'DATA_INVENTORY_CONTROL',
    'BASIC_CLASSIFICATION_CONTROL',
    'SIMPLE_QUALITY_CONTROL',
  ],
  humanReviewExpectations: {
    required: true,
    level: 'STANDARD',
    triggers: [
      'SENSITIVE_DATA_DETECTED',
      'QUALITY_ISSUE',
      'PURPOSE_CHANGE',
    ],
  },
  evidenceExpectations: {
    requiredTypes: [
      'DATA_INVENTORY',
      'BASIC_CLASSIFICATION',
      'QUALITY_CHECK',
    ],
    minimumCoverage: 70,
  },
  driftExpectations: {
    monitoringEnabled: true,
    thresholdProfile: 'STANDARD',
  },
  certificationExpectations: {
    required: false,
    level: 'BASIC',
  },
  nonInvasiveConstraints: {
    metadataFirst: true,
    readOnlyByDefault: true,
    dataMinimization: true,
    sourceSovereignty: true,
    evidenceByReference: true,
  },
};

// ============================================================
// 3. GENAI AI PROFILE
// ============================================================

export const GENAI_AI_PROFILE: AIGovernanceProfile = {
  id: 'genai-ai',
  name: 'GenAI & Technology AI Governance',
  description: 'Comprehensive governance for generative AI and technology companies',
  intendedContext: 'Technology companies, AI/ML teams, GenAI startups',
  applicableResourceTypes: ['DATASET', 'TRAINING_DATASET', 'MODEL', 'RAG_RESOURCE', 'AI_USE_CASE'],
  recommendedPolicies: [
    'TRAINING_DATA_GOVERNANCE',
    'RAG_RESOURCE_GOVERNANCE',
    'MODEL_INPUT_VALIDATION',
    'OUTPUT_QUALITY_CONTROL',
    'DRIFT_MONITORING',
  ],
  recommendedControls: [
    'TRAINING_DATA_LINEAGE_CONTROL',
    'RAG_ELIGIBILITY_CONTROL',
    'MODEL_INPUT_VALIDATION_CONTROL',
    'OUTPUT_QUALITY_CONTROL',
    'DRIFT_DETECTION_CONTROL',
  ],
  humanReviewExpectations: {
    required: true,
    level: 'HIGH',
    triggers: [
      'TRAINING_DATA_CHANGE',
      'RAG_ELIGIBILITY_CHANGE',
      'MODEL_DRIFT_DETECTED',
      'OUTPUT_QUALITY_ISSUE',
    ],
  },
  evidenceExpectations: {
    requiredTypes: [
      'TRAINING_DATA_LINEAGE',
      'RAG_ELIGIBILITY_ASSESSMENT',
      'MODEL_INPUT_VALIDATION',
      'OUTPUT_QUALITY_METRICS',
      'DRIFT_ASSESSMENT',
    ],
    minimumCoverage: 85,
  },
  driftExpectations: {
    monitoringEnabled: true,
    thresholdProfile: 'TECHNICAL',
  },
  certificationExpectations: {
    required: true,
    level: 'STANDARD',
  },
  nonInvasiveConstraints: {
    metadataFirst: true,
    readOnlyByDefault: true,
    dataMinimization: true,
    sourceSovereignty: true,
    evidenceByReference: true,
  },
};

// ============================================================
// 4. SENSITIVE AI DATA PROFILE
// ============================================================

export const SENSITIVE_AI_DATA_PROFILE: AIGovernanceProfile = {
  id: 'sensitive-ai-data',
  name: 'Sensitive AI Data Governance',
  description: 'Enhanced governance for organizations handling sensitive data in AI systems',
  intendedContext: 'Banks, financial institutions, healthcare, retail with customer data',
  applicableResourceTypes: ['DATASET', 'TRAINING_DATASET', 'MODEL', 'AI_USE_CASE'],
  recommendedPolicies: [
    'SENSITIVE_DATA_PROTECTION',
    'PII_HANDLING_POLICY',
    'FINANCIAL_DATA_POLICY',
    'HEALTHCARE_DATA_POLICY',
    'ENCRYPTED_STORAGE_REQUIRED',
  ],
  recommendedControls: [
    'SENSITIVE_DATA_DETECTION_CONTROL',
    'PII_MASKING_CONTROL',
    'ENCRYPTION_CONTROL',
    'ACCESS_RESTRICTION_CONTROL',
    'AUDIT_LOG_CONTROL',
  ],
  humanReviewExpectations: {
    required: true,
    level: 'STRICT',
    triggers: [
      'SENSITIVE_DATA_DETECTED',
      'PII_FOUND',
      'FINANCIAL_DATA_ACCESS',
      'ENCRYPTION_FAILURE',
    ],
  },
  evidenceExpectations: {
    requiredTypes: [
      'SENSITIVE_DATA_INVENTORY',
      'ENCRYPTION_EVIDENCE',
      'ACCESS_LOG',
      'COMPLIANCE_EVIDENCE',
      'DATA_MASKING_EVIDENCE',
    ],
    minimumCoverage: 95,
  },
  driftExpectations: {
    monitoringEnabled: true,
    thresholdProfile: 'STRICT',
  },
  certificationExpectations: {
    required: true,
    level: 'ENHANCED',
  },
  nonInvasiveConstraints: {
    metadataFirst: true,
    readOnlyByDefault: true,
    dataMinimization: true,
    sourceSovereignty: true,
    evidenceByReference: true,
  },
};

// ============================================================
// 5. ENTERPRISE AI PROFILE
// ============================================================

export const ENTERPRISE_AI_PROFILE: AIGovernanceProfile = {
  id: 'enterprise-ai',
  name: 'Enterprise AI Governance',
  description: 'Scalable governance for large enterprises with complex AI ecosystems',
  intendedContext: 'Large enterprises, telecommunications, multi-national corporations',
  applicableResourceTypes: ['DATASET', 'TRAINING_DATASET', 'MODEL', 'RAG_RESOURCE', 'AI_USE_CASE'],
  recommendedPolicies: [
    'ENTERPRISE_DATA_GOVERNANCE',
    'CROSS_DOMAIN_POLICY',
    'SCALE_OPTIMIZATION_POLICY',
    'COMPLIANCE_FRAMEWORK_POLICY',
  ],
  recommendedControls: [
    'DOMAIN_OWNERSHIP_CONTROL',
    'CROSS_DOMAIN_ACCESS_CONTROL',
    'SCALE_MONITORING_CONTROL',
    'COMPLIANCE_FRAMEWORK_CONTROL',
  ],
  humanReviewExpectations: {
    required: true,
    level: 'HIGH',
    triggers: [
      'CROSS_DOMAIN_ACCESS',
      'SCALE_THRESHOLD_EXCEEDED',
      'COMPLIANCE_CHANGE',
      'DOMAIN_OWNERSHIP_CHANGE',
    ],
  },
  evidenceExpectations: {
    requiredTypes: [
      'DOMAIN_OWNERSHIP_EVIDENCE',
      'CROSS_DOMAIN_ACCESS_LOG',
      'SCALE_METRICS',
      'COMPLIANCE_EVIDENCE',
    ],
    minimumCoverage: 90,
  },
  driftExpectations: {
    monitoringEnabled: true,
    thresholdProfile: 'ENTERPRISE',
  },
  certificationExpectations: {
    required: true,
    level: 'STANDARD',
  },
  nonInvasiveConstraints: {
    metadataFirst: true,
    readOnlyByDefault: true,
    dataMinimization: true,
    sourceSovereignty: true,
    evidenceByReference: true,
  },
};

// ============================================================
// 6. MLOPS AI PROFILE
// ============================================================

export const MLOPS_AI_PROFILE: AIGovernanceProfile = {
  id: 'mlops-ai',
  name: 'MLOps & Research AI Governance',
  description: 'Governance focused on reproducibility and research integrity',
  intendedContext: 'Research institutions, data science teams, MLOps organizations',
  applicableResourceTypes: ['DATASET', 'TRAINING_DATASET', 'MODEL', 'AI_USE_CASE'],
  recommendedPolicies: [
    'REPRODUCIBILITY_POLICY',
    'EXPERIMENT_TRACKING_POLICY',
    'MODEL_VERSIONING_POLICY',
    'RESEARCH_INTEGRITY_POLICY',
  ],
  recommendedControls: [
    'REPRODUCIBILITY_CONTROL',
    'EXPERIMENT_TRACKING_CONTROL',
    'MODEL_VERSIONING_CONTROL',
    'RESEARCH_INTEGRITY_CONTROL',
  ],
  humanReviewExpectations: {
    required: true,
    level: 'HIGH',
    triggers: [
      'REPRODUCIBILITY_ISSUE',
      'EXPERIMENT_CHANGE',
      'MODEL_VERSION_CHANGE',
      'RESEARCH_INTEGRITY_CONCERN',
    ],
  },
  evidenceExpectations: {
    requiredTypes: [
      'REPRODUCIBILITY_EVIDENCE',
      'EXPERIMENT_LOG',
      'MODEL_VERSION_EVIDENCE',
      'RESEARCH_INTEGRITY_EVIDENCE',
    ],
    minimumCoverage: 90,
  },
  driftExpectations: {
    monitoringEnabled: true,
    thresholdProfile: 'RESEARCH',
  },
  certificationExpectations: {
    required: true,
    level: 'STANDARD',
  },
  nonInvasiveConstraints: {
    metadataFirst: true,
    readOnlyByDefault: true,
    dataMinimization: true,
    sourceSovereignty: true,
    evidenceByReference: true,
  },
};

// ============================================================
// PROFILE REGISTRY
// ============================================================

export const AI_GOVERNANCE_PROFILES: AIGovernanceProfile[] = [
  PUBLIC_ADMINISTRATION_AI_PROFILE,
  SME_AI_PROFILE,
  GENAI_AI_PROFILE,
  SENSITIVE_AI_DATA_PROFILE,
  ENTERPRISE_AI_PROFILE,
  MLOPS_AI_PROFILE,
];

export function getAIProfile(id: string): AIGovernanceProfile | undefined {
  return AI_GOVERNANCE_PROFILES.find(p => p.id === id);
}

export function listAIProfiles(): AIGovernanceProfile[] {
  return AI_GOVERNANCE_PROFILES;
}
