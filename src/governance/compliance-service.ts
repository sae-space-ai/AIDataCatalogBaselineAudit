// ============================================================
// GOVERNANCE — Compliance Assessment Service
// ============================================================

import type {
  ComplianceAssessment,
  ComplianceStatus,
  PolicyEvaluationV2,
  ControlExecution,
  EvidenceCoverage,
  PolicyDefinition,
  ControlDefinition,
} from './types';
import type { PolicyService } from './policy-service';
import type { ControlService } from './control-service';
import type { EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class ComplianceAssessmentService {
  private assessments: Map<string, ComplianceAssessment> = new Map();

  constructor(
    private policyService: PolicyService,
    private controlService: ControlService,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  // ---- ASSESSMENT CREATION ----

  createAssessment(
    subjectType: string,
    subjectId: string,
    scope: PolicyDefinition['scope']
  ): ComplianceAssessment {
    const assessment: ComplianceAssessment = {
      id: generateId(),
      subjectType,
      subjectId,
      scope,
      status: 'NOT_EVALUATED',
      policyEvaluations: [],
      controlExecutions: [],
      evidenceCoverage: {
        required: 0,
        available: 0,
        missing: 0,
        expired: 0,
        invalid: 0,
        coverageStatus: 'NONE',
      },
      openReviews: 0,
      exceptions: [],
      startedAt: new Date().toISOString(),
    };

    this.assessments.set(assessment.id, assessment);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:compliance-service',
      action: 'CREATE',
      resourceType: 'ComplianceAssessment',
      resourceId: assessment.id,
      timestamp: new Date().toISOString(),
      details: { subjectType, subjectId },
    });

    return assessment;
  }

  // ---- ASSESSMENT EXECUTION ----

  async executeAssessment(
    assessmentId: string,
    subjectData: Record<string, unknown>,
    correlationId: string
  ): Promise<ComplianceAssessment> {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }

    // Get applicable policies
    const applicablePolicies = this.getApplicablePolicies(assessment.scope);

    // Evaluate each policy
    for (const policy of applicablePolicies) {
      const evaluation = this.policyService.evaluatePolicy(
        policy.id,
        assessment.subjectType,
        assessment.subjectId,
        subjectData,
        false // Not simulation
      );

      assessment.policyEvaluations.push(evaluation.id);

      // Execute controls required by the policy
      for (const controlId of policy.controls) {
        const execution = this.controlService.executeControl(
          controlId,
          assessment.subjectType,
          assessment.subjectId,
          subjectData,
          correlationId
        );

        assessment.controlExecutions.push(execution.id);

        // Count open reviews
        if (execution.status === 'REQUIRES_REVIEW') {
          assessment.openReviews++;
        }
      }
    }

    // Calculate evidence coverage
    assessment.evidenceCoverage = this.calculateEvidenceCoverage(assessment);

    // Determine compliance status
    assessment.status = this.determineComplianceStatus(assessment);
    assessment.completedAt = new Date().toISOString();

    // Generate evidence
    this.evidenceRepo.save({
      id: generateId(),
      type: 'POLICY_EVALUATION',
      subjectType: assessment.subjectType,
      subjectId: assessment.subjectId,
      actor: 'system:compliance-service',
      timestamp: new Date().toISOString(),
      source: 'ComplianceAssessmentService.executeAssessment',
      metadata: {
        assessmentId,
        status: assessment.status,
        policiesEvaluated: assessment.policyEvaluations.length,
        controlsExecuted: assessment.controlExecutions.length,
      },
    });

    // Generate audit event
    this.auditRepo.save({
      id: generateId(),
      actor: 'system:compliance-service',
      action: 'SCAN',
      resourceType: 'ComplianceAssessment',
      resourceId: assessmentId,
      timestamp: new Date().toISOString(),
      details: {
        subjectType: assessment.subjectType,
        subjectId: assessment.subjectId,
        status: assessment.status,
      },
    });

    return assessment;
  }

  private getApplicablePolicies(scope: PolicyDefinition['scope']): PolicyDefinition[] {
    const allPolicies = this.policyService.listPolicies('ACTIVE');
    
    return allPolicies.filter(policy => {
      // Check if policy scope overlaps with assessment scope
      if (policy.scope.length === 0) {
        return true; // No scope restrictions
      }

      return policy.scope.some(policyScope =>
        scope.some(assessmentScope =>
          policyScope.type === assessmentScope.type &&
          policyScope.value === assessmentScope.value
        )
      );
    });
  }

  private calculateEvidenceCoverage(assessment: ComplianceAssessment): EvidenceCoverage {
    // Simplified evidence coverage calculation
    // In a real implementation, this would check actual evidence records

    const requiredEvidence = assessment.policyEvaluations.length * 2; // Simplified
    const availableEvidence = assessment.policyEvaluations.length; // Simplified

    const coverage: EvidenceCoverage = {
      required: requiredEvidence,
      available: availableEvidence,
      missing: requiredEvidence - availableEvidence,
      expired: 0,
      invalid: 0,
      coverageStatus: availableEvidence >= requiredEvidence ? 'FULL' : 
                      availableEvidence > 0 ? 'PARTIAL' : 'NONE',
    };

    return coverage;
  }

  private determineComplianceStatus(assessment: ComplianceAssessment): ComplianceStatus {
    if (assessment.policyEvaluations.length === 0) {
      return 'NOT_EVALUATED';
    }

    // In a real implementation, we would retrieve the actual PolicyEvaluationV2 objects
    // For now, we use a simplified approach based on control executions
    const controlExecutions = assessment.controlExecutions
      .map(id => this.controlService.getExecution(id))
      .filter(e => e !== undefined);

    if (controlExecutions.length === 0) {
      return 'NOT_EVALUATED';
    }

    // Check if all controls passed
    const allPassed = controlExecutions.every(e => e.status === 'PASS');
    const anyFailed = controlExecutions.some(e => e.status === 'FAIL');
    const anyRequiresReview = controlExecutions.some(e => e.status === 'REQUIRES_REVIEW');

    if (allPassed && assessment.openReviews === 0) {
      return 'COMPLIANT';
    }

    if (anyFailed) {
      return 'NON_COMPLIANT';
    }

    if (anyRequiresReview || assessment.openReviews > 0) {
      return 'REQUIRES_REVIEW';
    }

    return 'PARTIALLY_COMPLIANT';
  }

  // ---- ASSESSMENT RETRIEVAL ----

  getAssessment(id: string): ComplianceAssessment | undefined {
    return this.assessments.get(id);
  }

  getAssessmentsBySubject(subjectType: string, subjectId: string): ComplianceAssessment[] {
    return Array.from(this.assessments.values()).filter(
      a => a.subjectType === subjectType && a.subjectId === subjectId
    );
  }

  listAssessments(status?: ComplianceStatus): ComplianceAssessment[] {
    const all = Array.from(this.assessments.values());
    if (status) {
      return all.filter(a => a.status === status);
    }
    return all;
  }
}
