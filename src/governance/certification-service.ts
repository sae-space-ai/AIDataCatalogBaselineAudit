// ============================================================
// GOVERNANCE — Certification Service
// ============================================================

import type {
  CertificationDefinition,
  CertificationAssessment,
  CertificationRecord,
  CertificationState,
  CertificationRequirement,
  CertificationRequirementEvaluation,
} from './types';
import type { EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class CertificationService {
  private definitions: Map<string, CertificationDefinition> = new Map();
  private assessments: Map<string, CertificationAssessment> = new Map();
  private records: Map<string, CertificationRecord> = new Map();

  constructor(
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  // ---- CERTIFICATION DEFINITIONS ----

  registerDefinition(definition: CertificationDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new Error(`Certification definition ${definition.id} already exists`);
    }
    this.definitions.set(definition.id, definition);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:certification-service',
      action: 'CREATE',
      resourceType: 'CertificationDefinition',
      resourceId: definition.id,
      timestamp: new Date().toISOString(),
      details: { name: definition.name },
    });
  }

  getDefinition(id: string): CertificationDefinition | undefined {
    return this.definitions.get(id);
  }

  listDefinitions(): CertificationDefinition[] {
    return Array.from(this.definitions.values());
  }

  // ---- CERTIFICATION ASSESSMENT ----

  assessCertification(
    certificationId: string,
    subjectType: string,
    subjectId: string,
    subjectData: Record<string, unknown>
  ): CertificationAssessment {
    const definition = this.getDefinition(certificationId);
    if (!definition) {
      throw new Error(`Certification definition ${certificationId} not found`);
    }

    const assessment: CertificationAssessment = {
      id: generateId(),
      certificationId,
      subjectType,
      subjectId,
      state: 'UNCERTIFIED',
      requirementsEvaluated: [],
      evidenceIds: [],
      assessedAt: new Date().toISOString(),
    };

    // Evaluate each requirement
    for (const requirement of definition.requirements) {
      const evaluation = this.evaluateRequirement(requirement, subjectData);
      assessment.requirementsEvaluated.push(evaluation);
    }

    // Determine certification state
    assessment.state = this.determineCertificationState(assessment);

    // Calculate expiration date
    if (assessment.state === 'CERTIFIED') {
      const expiresAt = new Date(assessment.assessedAt);
      expiresAt.setDate(expiresAt.getDate() + definition.validForDays);
      assessment.expiresAt = expiresAt.toISOString();
    }

    this.assessments.set(assessment.id, assessment);

    // Generate evidence
    this.evidenceRepo.save({
      id: generateId(),
      type: 'POLICY_EVALUATION',
      subjectType,
      subjectId,
      actor: 'system:certification-service',
      timestamp: new Date().toISOString(),
      source: 'CertificationService.assessCertification',
      metadata: {
        certificationId,
        assessmentId: assessment.id,
        state: assessment.state,
      },
    });

    // Generate audit event
    this.auditRepo.save({
      id: generateId(),
      actor: 'system:certification-service',
      action: 'SCAN',
      resourceType: 'CertificationAssessment',
      resourceId: assessment.id,
      timestamp: new Date().toISOString(),
      details: {
        certificationId,
        subjectType,
        subjectId,
        state: assessment.state,
      },
    });

    return assessment;
  }

  private evaluateRequirement(
    requirement: CertificationRequirement,
    subjectData: Record<string, unknown>
  ): CertificationRequirementEvaluation {
    let status: 'MET' | 'NOT_MET' | 'NOT_EVALUATED' = 'NOT_EVALUATED';
    let actualValue: unknown = undefined;
    let explanation = '';

    switch (requirement.type) {
      case 'QUALITY':
        actualValue = subjectData['qualityScore'];
        if (typeof actualValue === 'number' && requirement.threshold !== undefined) {
          status = actualValue >= requirement.threshold ? 'MET' : 'NOT_MET';
          explanation = `Quality score ${actualValue} ${status === 'MET' ? '>=' : '<'} threshold ${requirement.threshold}`;
        }
        break;

      case 'CLASSIFICATION':
        actualValue = subjectData['classificationReviewed'];
        status = actualValue === true ? 'MET' : 'NOT_MET';
        explanation = `Classification ${status === 'MET' ? 'is' : 'is not'} reviewed`;
        break;

      case 'LINEAGE':
        actualValue = subjectData['lineageAvailable'];
        status = actualValue === true ? 'MET' : 'NOT_MET';
        explanation = `Lineage ${status === 'MET' ? 'is' : 'is not'} available`;
        break;

      case 'METADATA':
        actualValue = subjectData['metadataCompleteness'];
        if (typeof actualValue === 'number' && requirement.threshold !== undefined) {
          status = actualValue >= requirement.threshold ? 'MET' : 'NOT_MET';
          explanation = `Metadata completeness ${actualValue} ${status === 'MET' ? '>=' : '<'} threshold ${requirement.threshold}`;
        }
        break;

      case 'TRUST':
        actualValue = subjectData['trustScore'];
        if (typeof actualValue === 'number' && requirement.threshold !== undefined) {
          status = actualValue >= requirement.threshold ? 'MET' : 'NOT_MET';
          explanation = `Trust score ${actualValue} ${status === 'MET' ? '>=' : '<'} threshold ${requirement.threshold}`;
        }
        break;

      case 'POLICY':
        actualValue = subjectData['policyCompliant'];
        status = actualValue === true ? 'MET' : 'NOT_MET';
        explanation = `Policy ${status === 'MET' ? 'is' : 'is not'} compliant`;
        break;

      case 'EVIDENCE':
        actualValue = subjectData['evidenceCoverage'];
        if (typeof actualValue === 'number' && requirement.threshold !== undefined) {
          status = actualValue >= requirement.threshold ? 'MET' : 'NOT_MET';
          explanation = `Evidence coverage ${actualValue} ${status === 'MET' ? '>=' : '<'} threshold ${requirement.threshold}`;
        }
        break;

      case 'HUMAN_APPROVAL':
        actualValue = subjectData['humanApproved'];
        status = actualValue === true ? 'MET' : 'NOT_MET';
        explanation = `Human approval ${status === 'MET' ? 'is' : 'is not'} granted`;
        break;

      default:
        explanation = `Unknown requirement type: ${requirement.type}`;
    }

    return {
      requirement,
      status,
      actualValue,
      explanation,
    };
  }

  private determineCertificationState(assessment: CertificationAssessment): CertificationState {
    const evaluations = assessment.requirementsEvaluated;

    if (evaluations.length === 0) {
      return 'UNCERTIFIED';
    }

    // Check mandatory requirements
    const mandatoryRequirements = evaluations.filter(e => e.requirement.mandatory);
    const allMandatoryMet = mandatoryRequirements.every(e => e.status === 'MET');

    if (!allMandatoryMet) {
      const anyNotEvaluated = mandatoryRequirements.some(e => e.status === 'NOT_EVALUATED');
      if (anyNotEvaluated) {
        return 'REQUIRES_REVIEW';
      }
      return 'UNCERTIFIED';
    }

    // All mandatory requirements met
    const allMet = evaluations.every(e => e.status === 'MET');
    if (allMet) {
      return 'CERTIFIED';
    }

    // Some non-mandatory requirements not met
    return 'ELIGIBLE';
  }

  // ---- CERTIFICATION RECORDS ----

  grantCertification(
    assessmentId: string,
    grantedBy: string
  ): CertificationRecord {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }

    if (assessment.state !== 'CERTIFIED') {
      throw new Error(`Assessment ${assessmentId} is not in CERTIFIED state`);
    }

    const record: CertificationRecord = {
      id: generateId(),
      certificationId: assessment.certificationId,
      subjectType: assessment.subjectType,
      subjectId: assessment.subjectId,
      state: 'CERTIFIED',
      grantedAt: new Date().toISOString(),
      grantedBy,
      expiresAt: assessment.expiresAt,
      evidenceIds: assessment.evidenceIds,
    };

    this.records.set(record.id, record);

    this.auditRepo.save({
      id: generateId(),
      actor: grantedBy,
      action: 'CREATE',
      resourceType: 'CertificationRecord',
      resourceId: record.id,
      timestamp: new Date().toISOString(),
      details: {
        certificationId: assessment.certificationId,
        subjectType: assessment.subjectType,
        subjectId: assessment.subjectId,
      },
    });

    return record;
  }

  revokeCertification(
    recordId: string,
    revokedBy: string,
    reason: string
  ): void {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`Certification record ${recordId} not found`);
    }

    record.state = 'REVOKED';
    record.revokedAt = new Date().toISOString();
    record.revokedBy = revokedBy;
    record.revokedReason = reason;

    this.auditRepo.save({
      id: generateId(),
      actor: revokedBy,
      action: 'UPDATE',
      resourceType: 'CertificationRecord',
      resourceId: recordId,
      timestamp: new Date().toISOString(),
      details: { state: 'REVOKED', reason },
    });
  }

  getRecord(id: string): CertificationRecord | undefined {
    return this.records.get(id);
  }

  getRecordsBySubject(subjectType: string, subjectId: string): CertificationRecord[] {
    return Array.from(this.records.values()).filter(
      r => r.subjectType === subjectType && r.subjectId === subjectId
    );
  }

  // ---- CERTIFICATION INVALIDATION ----

  invalidateCertification(
    subjectType: string,
    subjectId: string,
    reason: string
  ): void {
    const records = this.getRecordsBySubject(subjectType, subjectId);
    
    for (const record of records) {
      if (record.state === 'CERTIFIED') {
        record.state = 'SUSPENDED';
        
        this.auditRepo.save({
          id: generateId(),
          actor: 'system:certification-service',
          action: 'UPDATE',
          resourceType: 'CertificationRecord',
          resourceId: record.id,
          timestamp: new Date().toISOString(),
          details: { state: 'SUSPENDED', reason },
        });
      }
    }
  }
}
