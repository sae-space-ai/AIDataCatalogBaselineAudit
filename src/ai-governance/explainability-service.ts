// ============================================================
// AI GOVERNANCE — Explainability Service
// ============================================================

import type { AIGovernanceAssessment } from './types';
import type { AIGovernanceService } from './ai-governance-service';
import type { PolicyService } from '../governance/policy-service';
import type { ControlService } from '../governance/control-service';
import type { SensitiveDataPreventionService } from './sensitive-data-service';
import type { DataDriftService } from './drift-service';

export interface ExplainabilityResult {
  assessmentId: string;
  whatWasEvaluated: string;
  applicablePolicies: Array<{
    policyId: string;
    policyName: string;
    version: string;
    status: string;
  }>;
  applicableControls: Array<{
    controlId: string;
    controlName: string;
    status: string;
  }>;
  evidenceUsed: Array<{
    evidenceId: string;
    type: string;
    timestamp: string;
  }>;
  relevantClassifications: Array<{
    classificationId: string;
    type: string;
    confidence: number;
  }>;
  detectedDrift: Array<{
    driftId: string;
    type: string;
    severity: string;
  }>;
  impactAnalysis: {
    potentiallyAffected: string[];
    severity: string;
  };
  humanReviewStatus: {
    required: boolean;
    tasks: Array<{
      taskId: string;
      status: string;
      priority: string;
    }>;
  };
  decision: {
    status: string;
    reasons: string[];
  };
  certificationConsequence: {
    eligible: boolean;
    reason: string;
  };
}

export class AIGovernanceExplainabilityService {
  constructor(
    private aiGovernanceService: AIGovernanceService,
    private policyService: PolicyService,
    private controlService: ControlService,
    private sensitiveDataService: SensitiveDataPreventionService,
    private driftService: DataDriftService
  ) {}

  explainAssessment(assessmentId: string): ExplainabilityResult | undefined {
    const assessment = this.aiGovernanceService.getAIGovernanceAssessment(assessmentId);
    if (!assessment) {
      return undefined;
    }

    // What was evaluated
    const whatWasEvaluated = `${assessment.subjectType} ${assessment.subjectId}`;

    // Applicable policies
    const applicablePolicies = assessment.policyAssessmentIds.map(policyEvalId => {
      // In a real implementation, this would fetch the actual policy evaluation
      return {
        policyId: policyEvalId,
        policyName: `Policy ${policyEvalId.slice(0, 8)}`,
        version: '1.0.0',
        status: 'EVALUATED',
      };
    });

    // Applicable controls
    const applicableControls = assessment.controlExecutionIds.map(controlExecId => {
      const controlExec = this.controlService.getExecution(controlExecId);
      return {
        controlId: controlExec?.controlId || controlExecId,
        controlName: `Control ${controlExecId.slice(0, 8)}`,
        status: controlExec?.status || 'UNKNOWN',
      };
    });

    // Evidence used (from evidence coverage and related assessments)
    const evidenceUsed: Array<{evidenceId: string; type: string; timestamp: string}> = [];
    
    // Add evidence from dataset assessments
    assessment.datasetAssessments.forEach(datasetAssessmentId => {
      evidenceUsed.push({
        evidenceId: datasetAssessmentId,
        type: 'DATASET_ASSESSMENT',
        timestamp: assessment.createdAt,
      });
    });
    
    // Add evidence from RAG assessments
    assessment.ragAssessments.forEach(ragAssessmentId => {
      evidenceUsed.push({
        evidenceId: ragAssessmentId,
        type: 'RAG_ASSESSMENT',
        timestamp: assessment.createdAt,
      });
    });
    
    // Add sensitive data assessment if present
    if (assessment.sensitiveDataAssessment) {
      evidenceUsed.push({
        evidenceId: assessment.sensitiveDataAssessment,
        type: 'SENSITIVE_DATA_ASSESSMENT',
        timestamp: assessment.createdAt,
      });
    }
    
    // Add drift assessment if present
    if (assessment.driftAssessment) {
      evidenceUsed.push({
        evidenceId: assessment.driftAssessment,
        type: 'DRIFT_ASSESSMENT',
        timestamp: assessment.createdAt,
      });
    }

    // Relevant classifications
    const relevantClassifications = assessment.datasetAssessments
      .map(datasetAssessmentId => {
        const sensitiveAssessment = this.sensitiveDataService.getSensitiveDataAssessment(datasetAssessmentId);
        if (!sensitiveAssessment) return null;
        
        return sensitiveAssessment.classifications.map(classificationId => ({
          classificationId,
          type: 'SENSITIVE_DATA',
          confidence: 0.9, // Default confidence
        }));
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .flat();

    // Detected drift
    const detectedDrift = assessment.driftAssessment
      ? [assessment.driftAssessment].map(driftId => {
          const drift = this.driftService.getDriftAssessment(driftId);
          if (!drift) return null;
          return {
            driftId,
            type: drift.driftType,
            severity: drift.severity,
          };
        }).filter((d): d is NonNullable<typeof d> => d !== null)
      : [];

    // Impact analysis
    const impactAnalysis = {
      potentiallyAffected: assessment.ragAssessments,
      severity: detectedDrift.length > 0 ? detectedDrift[0].severity : 'NO_DRIFT',
    };

    // Human review status
    const humanReviewStatus = {
      required: assessment.humanReviews.length > 0,
      tasks: assessment.humanReviews.map(taskId => ({
        taskId,
        status: 'OPEN', // In a real implementation, fetch actual status
        priority: 'MEDIUM',
      })),
    };

    // Decision
    const decision = {
      status: assessment.status,
      reasons: assessment.reasons,
    };

    // Certification consequence
    const certificationConsequence = {
      eligible: assessment.status === 'APPROVED_INTERNAL' || assessment.status === 'APPROVED_WITH_CONDITIONS',
      reason: assessment.status === 'APPROVED_INTERNAL' 
        ? 'All governance requirements met'
        : assessment.status === 'APPROVED_WITH_CONDITIONS'
        ? 'Requirements met with conditions'
        : 'Requirements not met',
    };

    return {
      assessmentId,
      whatWasEvaluated,
      applicablePolicies,
      applicableControls,
      evidenceUsed,
      relevantClassifications,
      detectedDrift,
      impactAnalysis,
      humanReviewStatus,
      decision,
      certificationConsequence,
    };
  }

  generateExplanationText(assessmentId: string): string {
    const explanation = this.explainAssessment(assessmentId);
    if (!explanation) {
      return 'Assessment not found';
    }

    const lines: string[] = [];

    lines.push(`# AI Governance Assessment Explanation`);
    lines.push('');
    lines.push(`## What Was Evaluated`);
    lines.push(explanation.whatWasEvaluated);
    lines.push('');

    lines.push(`## Applicable Policies (${explanation.applicablePolicies.length})`);
    explanation.applicablePolicies.forEach(p => {
      lines.push(`- ${p.policyName} (v${p.version}): ${p.status}`);
    });
    lines.push('');

    lines.push(`## Applicable Controls (${explanation.applicableControls.length})`);
    explanation.applicableControls.forEach(c => {
      lines.push(`- ${c.controlName}: ${c.status}`);
    });
    lines.push('');

    lines.push(`## Evidence Used (${explanation.evidenceUsed.length})`);
    explanation.evidenceUsed.forEach(e => {
      lines.push(`- ${e.type}: ${e.evidenceId}`);
    });
    lines.push('');

    if (explanation.relevantClassifications.length > 0) {
      lines.push(`## Relevant Classifications (${explanation.relevantClassifications.length})`);
      explanation.relevantClassifications.forEach(c => {
        lines.push(`- ${c.type}: ${c.confidence * 100}% confidence`);
      });
      lines.push('');
    }

    if (explanation.detectedDrift.length > 0) {
      lines.push(`## Detected Drift (${explanation.detectedDrift.length})`);
      explanation.detectedDrift.forEach(d => {
        lines.push(`- ${d.type}: ${d.severity}`);
      });
      lines.push('');
    }

    lines.push(`## Impact Analysis`);
    lines.push(`- Potentially affected: ${explanation.impactAnalysis.potentiallyAffected.length} resources`);
    lines.push(`- Severity: ${explanation.impactAnalysis.severity}`);
    lines.push('');

    lines.push(`## Human Review`);
    lines.push(`- Required: ${explanation.humanReviewStatus.required ? 'Yes' : 'No'}`);
    if (explanation.humanReviewStatus.required) {
      lines.push(`- Tasks: ${explanation.humanReviewStatus.tasks.length}`);
      explanation.humanReviewStatus.tasks.forEach(t => {
        lines.push(`  - ${t.taskId}: ${t.status} (${t.priority})`);
      });
    }
    lines.push('');

    lines.push(`## Decision`);
    lines.push(`- Status: ${explanation.decision.status}`);
    lines.push(`- Reasons:`);
    explanation.decision.reasons.forEach(r => {
      lines.push(`  - ${r}`);
    });
    lines.push('');

    lines.push(`## Certification Consequence`);
    lines.push(`- Eligible: ${explanation.certificationConsequence.eligible ? 'Yes' : 'No'}`);
    lines.push(`- Reason: ${explanation.certificationConsequence.reason}`);

    return lines.join('\n');
  }
}
