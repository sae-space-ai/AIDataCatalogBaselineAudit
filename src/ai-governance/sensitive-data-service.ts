// ============================================================
// AI GOVERNANCE — Sensitive Data Prevention Service
// ============================================================

import type { 
  SensitiveDataAssessment, 
  SensitiveDataStatus 
} from './types';
import type { ClassificationRepository, EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class SensitiveDataPreventionService {
  private assessments: Map<string, SensitiveDataAssessment> = new Map();

  constructor(
    private classificationRepo: ClassificationRepository,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  // ---- Sensitive Data Assessment ----

  assessSensitiveData(
    subjectType: string,
    subjectId: string,
    classificationIds: string[]
  ): SensitiveDataAssessment {
    // Analyze classifications for sensitive data
    const allClassifications = this.classificationRepo.getAll();
    const classifications = allClassifications.filter(c => classificationIds.includes(c.id));

    const piiDetected = classifications.some(c => 
      c.classificationType === 'PII_EMAIL' || 
      c.classificationType === 'PII_NAME' || 
      c.classificationType === 'PII_PHONE'
    );

    const financialDataDetected = classifications.some(c => 
      c.classificationType === 'FINANCIAL'
    );

    // Note: Classification doesn't have sensitivity property
    // We infer sensitivity from classificationType
    const confidentialDataDetected = classifications.some(c => 
      c.classificationType === 'FINANCIAL' || 
      c.classificationType === 'GEOGRAPHIC'
    );

    // Determine status
    let status: SensitiveDataStatus = 'CLEAR';
    const reasons: string[] = [];

    if (classifications.length === 0) {
      status = 'NOT_EVALUATED';
      reasons.push('No classifications available for assessment');
    } else {
      if (piiDetected) {
        status = 'RESTRICTED';
        reasons.push('PII data detected');
      }

      if (financialDataDetected) {
        status = 'RESTRICTED';
        reasons.push('Financial data detected');
      }

      if (confidentialDataDetected) {
        status = 'RESTRICTED';
        reasons.push('Confidential data detected');
      }

      // Check if any classification is not reviewed
      const hasUnreviewed = classifications.some(c => 
        c.reviewStatus === 'PENDING' || c.reviewStatus === 'SUGGESTED'
      );

      if (hasUnreviewed) {
        status = 'REQUIRES_REVIEW';
        reasons.push('Some classifications require human review');
      }

      // Check if any classification has low confidence
      const hasLowConfidence = classifications.some(c => c.confidence < 0.7);
      if (hasLowConfidence) {
        status = 'REQUIRES_REVIEW';
        reasons.push('Some classifications have low confidence');
      }
    }

    const assessment: SensitiveDataAssessment = {
      id: generateId(),
      subjectType,
      subjectId,
      status,
      piiDetected,
      financialDataDetected,
      confidentialDataDetected,
      classifications: classificationIds,
      reasons,
      evidenceIds: [],
      assessedAt: new Date().toISOString(),
    };

    this.assessments.set(assessment.id, assessment);

    // Generate evidence
    const evidenceId = generateId();
    this.evidenceRepo.save({
      id: evidenceId,
      type: 'CLASSIFICATION_CREATED',
      subjectType,
      subjectId,
      actor: 'system:sensitive-data-prevention',
      timestamp: new Date().toISOString(),
      source: 'SensitiveDataPreventionService.assessSensitiveData',
      metadata: { 
        status, 
        piiDetected, 
        financialDataDetected, 
        confidentialDataDetected 
      },
    });
    assessment.evidenceIds.push(evidenceId);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:sensitive-data-prevention',
      action: 'SCAN',
      resourceType: 'SensitiveDataAssessment',
      resourceId: assessment.id,
      timestamp: new Date().toISOString(),
      details: { subjectType, subjectId, status },
    });

    return assessment;
  }

  // ---- Assessment Retrieval ----

  getSensitiveDataAssessment(id: string): SensitiveDataAssessment | undefined {
    return this.assessments.get(id);
  }

  getLatestSensitiveDataAssessment(subjectType: string, subjectId: string): SensitiveDataAssessment | undefined {
    const assessments = Array.from(this.assessments.values())
      .filter(a => a.subjectType === subjectType && a.subjectId === subjectId)
      .sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime());
    
    return assessments[0];
  }

  listSensitiveDataAssessments(status?: SensitiveDataStatus): SensitiveDataAssessment[] {
    const all = Array.from(this.assessments.values());
    if (status) {
      return all.filter(a => a.status === status);
    }
    return all;
  }

  // ---- Summary Methods ----

  getSensitiveDataSummary(): {
    total: number;
    clear: number;
    restricted: number;
    blocked: number;
    requiresReview: number;
    notEvaluated: number;
  } {
    const assessments = Array.from(this.assessments.values());
    
    return {
      total: assessments.length,
      clear: assessments.filter(a => a.status === 'CLEAR').length,
      restricted: assessments.filter(a => a.status === 'RESTRICTED').length,
      blocked: assessments.filter(a => a.status === 'BLOCKED').length,
      requiresReview: assessments.filter(a => a.status === 'REQUIRES_REVIEW').length,
      notEvaluated: assessments.filter(a => a.status === 'NOT_EVALUATED').length,
    };
  }

  // ---- Control Methods ----

  blockSensitiveData(assessmentId: string, blockedBy: string, reason: string): void {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Sensitive data assessment ${assessmentId} not found`);
    }

    assessment.status = 'BLOCKED';
    assessment.reasons.push(`Blocked by ${blockedBy}: ${reason}`);

    this.auditRepo.save({
      id: generateId(),
      actor: blockedBy,
      action: 'UPDATE',
      resourceType: 'SensitiveDataAssessment',
      resourceId: assessmentId,
      timestamp: new Date().toISOString(),
      details: { status: 'BLOCKED', reason },
    });
  }

  approveSensitiveDataUse(assessmentId: string, approvedBy: string, conditions?: string): void {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Sensitive data assessment ${assessmentId} not found`);
    }

    assessment.status = 'CLEAR';
    if (conditions) {
      assessment.reasons.push(`Approved by ${approvedBy} with conditions: ${conditions}`);
    } else {
      assessment.reasons.push(`Approved by ${approvedBy}`);
    }

    this.auditRepo.save({
      id: generateId(),
      actor: approvedBy,
      action: 'REVIEW',
      resourceType: 'SensitiveDataAssessment',
      resourceId: assessmentId,
      timestamp: new Date().toISOString(),
      details: { status: 'CLEAR', conditions },
    });
  }
}
