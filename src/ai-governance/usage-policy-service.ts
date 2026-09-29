// ============================================================
// AI GOVERNANCE — Data Usage Policy Service
// ============================================================

import type { PolicyService } from '../governance/policy-service';
import type { EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export type AIResourceType = 
  | 'DATASET'
  | 'TRAINING_DATASET'
  | 'MODEL'
  | 'MODEL_VERSION'
  | 'RAG_RESOURCE'
  | 'AI_USE_CASE';

export interface AIUsagePolicyEvaluation {
  id: string;
  resourceType: AIResourceType;
  resourceId: string;
  policyId: string;
  policyVersion: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'NOT_EVALUATED' | 'REQUIRES_REVIEW' | 'NOT_APPLICABLE' | 'ERROR';
  reasons: string[];
  evidenceIds: string[];
  evaluatedAt: string;
}

export class AIUsagePolicyService {
  constructor(
    private policyService: PolicyService,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  evaluateResource(
    resourceType: AIResourceType,
    resourceId: string,
    resourceData: Record<string, unknown>
  ): AIUsagePolicyEvaluation[] {
    const evaluations: AIUsagePolicyEvaluation[] = [];

    // Get all active policies
    const activePolicies = this.policyService.listPolicies('ACTIVE');

    // Filter policies applicable to AI resources
    const aiPolicies = activePolicies.filter(p => 
      p.category === 'AI_GOVERNANCE' || 
      p.category === 'TRAINING_DATA' ||
      p.category === 'RAG_GOVERNANCE' ||
      p.scope.some(s => s.type === 'ASSET_TYPE' && s.value === resourceType)
    );

    // Evaluate each policy
    for (const policy of aiPolicies) {
      const evaluation = this.policyService.evaluatePolicy(
        policy.id,
        resourceType,
        resourceId,
        resourceData,
        false
      );

      const aiEvaluation: AIUsagePolicyEvaluation = {
        id: generateId(),
        resourceType,
        resourceId,
        policyId: policy.id,
        policyVersion: policy.version,
        status: evaluation.status,
        reasons: evaluation.conditionsEvaluated.map(c => c.explanation),
        evidenceIds: evaluation.evidenceIds,
        evaluatedAt: new Date().toISOString(),
      };

      evaluations.push(aiEvaluation);

      // Generate evidence
      this.evidenceRepo.save({
        id: generateId(),
        type: 'POLICY_EVALUATION',
        subjectType: resourceType,
        subjectId: resourceId,
        actor: 'system:ai-usage-policy',
        timestamp: new Date().toISOString(),
        source: 'AIUsagePolicyService.evaluateResource',
        metadata: { 
          policyId: policy.id, 
          status: evaluation.status,
          resourceType,
        },
      });
    }

    // Generate audit event
    this.auditRepo.save({
      id: generateId(),
      actor: 'system:ai-usage-policy',
      action: 'SCAN',
      resourceType: 'AIUsagePolicyEvaluation',
      resourceId: resourceId,
      timestamp: new Date().toISOString(),
      details: { 
        resourceType, 
        resourceId, 
        evaluationsCount: evaluations.length 
      },
    });

    return evaluations;
  }

  checkPurposeLimitation(
    datasetPurpose: string,
    useCasePurpose: string
  ): {
    compatible: boolean;
    reason: string;
    requiresReview: boolean;
  } {
    if (!datasetPurpose || !useCasePurpose) {
      return {
        compatible: false,
        reason: 'Missing purpose information',
        requiresReview: true,
      };
    }

    // Simple keyword-based compatibility check
    const datasetKeywords = datasetPurpose.toLowerCase().split(/\s+/);
    const useCaseKeywords = useCasePurpose.toLowerCase().split(/\s+/);

    const commonKeywords = datasetKeywords.filter(k => useCaseKeywords.includes(k));

    if (commonKeywords.length > 0) {
      return {
        compatible: true,
        reason: `Common purposes found: ${commonKeywords.join(', ')}`,
        requiresReview: false,
      };
    }

    // Check for restricted purposes
    const restrictedKeywords = ['personal', 'sensitive', 'confidential', 'restricted'];
    const hasRestricted = datasetKeywords.some(k => restrictedKeywords.includes(k));

    if (hasRestricted) {
      return {
        compatible: false,
        reason: 'Dataset contains restricted data for this use case',
        requiresReview: true,
      };
    }

    return {
      compatible: false,
      reason: 'No clear purpose alignment detected',
      requiresReview: true,
    };
  }

  getEvaluationsForResource(resourceType: string, resourceId: string): AIUsagePolicyEvaluation[] {
    // In a real implementation, this would query a repository
    // For now, return empty array
    return [];
  }
}
