// ============================================================
// SERVICES — Policy Engine (Demo/Local Rules)
// ============================================================

import type {
  AssetRepository,
  ClassificationRepository,
  QualityRepository,
  RelationshipRepository,
  EvidenceRepository,
  AuditRepository,
} from '../domain/contracts';
import type {
  Asset,
  Policy,
  PolicyEvaluation,
  PolicyEvaluationStatus,
  PolicyRule,
  PolicyViolation,
} from '../types';
import { generateId } from '../lib/utils';

/**
 * Demo policies for local evaluation.
 * These are NOT enforced in production — they serve as
 * illustrative examples of governance rules.
 */
const DEMO_POLICIES: Policy[] = [
  {
    id: 'policy-pii-review',
    name: 'PII Requires Review',
    description: 'Assets classified as PII must be reviewed by a data steward before use.',
    type: 'CLASSIFICATION',
    status: 'ACTIVE',
    rules: [
      {
        id: 'rule-pii-unreviewed',
        name: 'Unreviewed PII Detection',
        description: 'PII classification must be confirmed by a human reviewer.',
        condition: 'Asset has PII classification AND reviewStatus is PENDING or SUGGESTED',
        action: 'Flag for review — asset should not be used in production until reviewed.',
        severity: 'HIGH',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'policy-quality-threshold',
    name: 'Minimum Quality Threshold',
    description: 'Assets must meet minimum quality standards before use.',
    type: 'QUALITY',
    status: 'ACTIVE',
    rules: [
      {
        id: 'rule-quality-fail',
        name: 'Quality Failure Detection',
        description: 'Assets with FAIL quality status should be flagged.',
        condition: 'Asset has any QualityResult with status FAIL',
        action: 'Warn — asset quality does not meet standards.',
        severity: 'MEDIUM',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'policy-lineage-completeness',
    name: 'Lineage Completeness',
    description: 'Tables should have documented lineage (upstream source).',
    type: 'LINEAGE',
    status: 'ACTIVE',
    rules: [
      {
        id: 'rule-missing-lineage',
        name: 'Missing Lineage Warning',
        description: 'Tables without upstream dependencies may have undocumented data sources.',
        condition: 'Asset type is TABLE AND has no upstream relationships',
        action: 'Warn — lineage may be incomplete.',
        severity: 'LOW',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class PolicyEngine {
  private policies: Policy[];

  constructor(
    private assetRepo: AssetRepository,
    private classificationRepo: ClassificationRepository,
    private qualityRepo: QualityRepository,
    private relationshipRepo: RelationshipRepository,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {
    this.policies = [...DEMO_POLICIES];
  }

  /**
   * Get all policies.
   */
  getPolicies(): Policy[] {
    return [...this.policies];
  }

  /**
   * Get a policy by ID.
   */
  getPolicy(id: string): Policy | undefined {
    return this.policies.find(p => p.id === id);
  }

  /**
   * Evaluate a single policy against a single asset.
   */
  evaluatePolicyForAsset(policyId: string, assetId: string): PolicyEvaluation {
    const policy = this.getPolicy(policyId);
    if (!policy) {
      return {
        id: generateId(),
        policyId,
        assetId,
        status: 'NOT_EVALUATED',
        violations: [],
        evaluatedAt: new Date().toISOString(),
      };
    }

    const asset = this.assetRepo.getById(assetId);
    if (!asset) {
      return {
        id: generateId(),
        policyId,
        assetId,
        status: 'NOT_EVALUATED',
        violations: [],
        evaluatedAt: new Date().toISOString(),
      };
    }

    const violations: PolicyViolation[] = [];

    for (const rule of policy.rules) {
      const violation = this.evaluateRule(rule, asset);
      if (violation) {
        violations.push(violation);
      }
    }

    let status: PolicyEvaluationStatus;
    if (violations.length === 0) {
      status = 'PASS';
    } else if (violations.some(v => v.severity === 'CRITICAL' || v.severity === 'HIGH')) {
      status = 'FAIL';
    } else {
      status = 'WARN';
    }

    const evaluation: PolicyEvaluation = {
      id: generateId(),
      policyId,
      assetId,
      status,
      violations,
      evaluatedAt: new Date().toISOString(),
    };

    // Generate evidence
    this.evidenceRepo.save({
      id: generateId(),
      type: 'SCAN_COMPLETED',
      subjectType: 'PolicyEvaluation',
      subjectId: evaluation.id,
      actor: 'system:policy-engine',
      timestamp: new Date().toISOString(),
      source: 'PolicyEngine.evaluatePolicyForAsset',
      metadata: {
        policyId,
        assetId,
        status,
        violationCount: violations.length,
      },
    });

    return evaluation;
  }

  /**
   * Evaluate all active policies against all assets.
   */
  evaluateAll(): PolicyEvaluation[] {
    const evaluations: PolicyEvaluation[] = [];
    const activePolicies = this.policies.filter(p => p.status === 'ACTIVE');
    const assets = this.assetRepo.getAll();

    for (const policy of activePolicies) {
      for (const asset of assets) {
        const evaluation = this.evaluatePolicyForAsset(policy.id, asset.id);
        evaluations.push(evaluation);
      }
    }

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:policy-engine',
      action: 'CREATE',
      resourceType: 'PolicyEvaluation',
      resourceId: 'batch',
      timestamp: new Date().toISOString(),
      details: {
        policiesEvaluated: activePolicies.length,
        assetsEvaluated: assets.length,
        totalEvaluations: evaluations.length,
      },
    });

    return evaluations;
  }

  /**
   * Evaluate a single rule against an asset.
   * Returns a violation if the rule is violated, null otherwise.
   */
  private evaluateRule(rule: PolicyRule, asset: Asset): PolicyViolation | null {
    // PII Review Rule
    if (rule.id === 'rule-pii-unreviewed') {
      const classifications = this.classificationRepo.getByAssetId(asset.id);
      const piiUnreviewed = classifications.some(
        c => (c.classificationType.startsWith('PII')) &&
             (c.reviewStatus === 'PENDING' || c.reviewStatus === 'SUGGESTED')
      );
      if (piiUnreviewed) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `Asset "${asset.name}" has unreviewed PII classification.`,
          details: 'PII classification must be confirmed by a human reviewer before production use.',
        };
      }
    }

    // Quality Failure Rule
    if (rule.id === 'rule-quality-fail') {
      const qualityResults = this.qualityRepo.getByAssetId(asset.id);
      const hasFailure = qualityResults.some(r => r.status === 'FAIL');
      if (hasFailure) {
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `Asset "${asset.name}" has quality check failures.`,
          details: 'One or more quality checks returned FAIL status.',
        };
      }
    }

    // Missing Lineage Rule
    if (rule.id === 'rule-missing-lineage') {
      if (asset.type === 'TABLE') {
        const upstream = this.relationshipRepo.getUpstream(asset.id);
        if (upstream.length === 0) {
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `Table "${asset.name}" has no documented upstream lineage.`,
            details: 'Tables should have at least one upstream dependency documenting data origin.',
          };
        }
      }
    }

    return null;
  }
}
