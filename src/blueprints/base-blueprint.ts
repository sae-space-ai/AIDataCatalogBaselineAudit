// ============================================================
// BLUEPRINTS — Base Blueprint
// ============================================================

import type { SolutionBlueprint } from './types';

export const BASE_BLUEPRINT: SolutionBlueprint = {
  id: 'base',
  name: 'Base Data Governance',
  version: '1.0.0',
  description: 'Base configuration for data governance with essential capabilities',
  sector: 'GENERAL',
  targetOrganizationType: 'ANY',
  status: 'ACTIVE',
  implementationLevel: 'IMPLEMENTED',
  objectives: [
    'Data inventory',
    'Metadata governance',
    'Basic classification',
    'Quality monitoring',
    'Lineage tracking',
    'Evidence collection',
    'Audit trail',
  ],
  enabledAgents: [
    'source-discovery-agent',
    'metadata-intelligence-agent',
    'classification-agent',
    'data-quality-agent',
    'lineage-agent',
    'trust-agent',
    'evidence-agent',
    'audit-agent',
  ],
  requiredAgents: [
    'source-discovery-agent',
    'metadata-intelligence-agent',
    'classification-agent',
    'data-quality-agent',
    'lineage-agent',
    'trust-agent',
    'evidence-agent',
    'audit-agent',
  ],
  optionalAgents: [],
  policyProfile: {
    enabledPolicies: ['PII_REQUIRES_REVIEW', 'LOW_QUALITY_REQUIRES_REVIEW'],
    enforcementLevel: 'ADVISORY',
  },
  classificationProfile: {
    priorityClassifications: ['PII', 'CONFIDENTIAL', 'IDENTIFIER'],
    sensitivityLevels: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'],
  },
  qualityProfile: {
    requiredDimensions: ['completeness', 'uniqueness', 'validity'],
    thresholds: {
      completeness: 0.95,
      uniqueness: 0.90,
      validity: 0.95,
    },
    severity: 'MEDIUM',
  },
  trustProfile: {
    weights: {
      metadataCompleteness: 0.20,
      qualityScore: 0.30,
      classificationConfidence: 0.20,
      lineageAvailability: 0.15,
      reviewStatus: 0.15,
    },
    minimumScore: 60,
  },
  certificationProfile: {
    requirements: {
      qualityThreshold: 70,
      classificationReviewed: true,
      lineageAvailable: true,
      requiredMetadata: ['name', 'type', 'source'],
      policyCompliant: true,
      humanApproval: false,
    },
  },
  humanOversightProfile: {
    level: 'STANDARD',
    triggers: ['LOW_CONFIDENCE_CLASSIFICATION', 'POLICY_VIOLATION'],
    priority: 'MEDIUM',
    requiredEvidence: ['CLASSIFICATION_EVIDENCE', 'QUALITY_EVIDENCE'],
  },
  evidenceProfile: {
    requiredEvidence: ['SCAN_EVIDENCE', 'CLASSIFICATION_EVIDENCE', 'QUALITY_EVIDENCE'],
    retentionPeriod: 365,
  },
  auditProfile: {
    requiredEvents: ['ASSET_CREATED', 'ASSET_UPDATED', 'CLASSIFICATION_CREATED', 'QUALITY_CHECK'],
    retentionPeriod: 730,
  },
  dashboardProfile: {
    visibleWidgets: ['Assets', 'Sources', 'Quality', 'Trust', 'Lineage', 'Evidence', 'Audit'],
    priority: ['Quality', 'Trust', 'Assets'],
    ordering: ['Assets', 'Sources', 'Quality', 'Trust', 'Lineage', 'Evidence', 'Audit'],
    terminology: {
      asset: 'Asset',
      source: 'Source',
      classification: 'Classification',
      quality: 'Quality',
    },
  },
  connectorProfile: {
    permittedConnectors: ['DEMO'],
    restrictedConnectors: [],
  },
  terminologyProfile: {
    assetTerm: 'Asset',
    sourceTerm: 'Source',
    classificationTerm: 'Classification',
    qualityTerm: 'Quality',
    customTerms: {},
  },
  workflowProfile: {
    onboardingSteps: ['connect-source', 'run-scan', 'review-classifications', 'monitor-quality'],
    reviewWorkflow: ['detect', 'review', 'approve'],
    certificationWorkflow: ['evaluate', 'review', 'certify'],
  },
  riskProfile: {
    riskThresholds: {
      low: 30,
      medium: 60,
      high: 80,
    },
    sensitiveDataProfile: 'STANDARD',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
