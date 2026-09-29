// ============================================================
// SERVICES — Privacy Governance Service (ORDER 11E)
// ============================================================
// Governs privacy transformations and re-identification risk
// WITHOUT executing actual data transformations
// Preserves source sovereignty and evidence-by-reference

import type { 
  AssetRepository, 
  EvidenceRepository, 
  AuditRepository,
  ClassificationRepository,
  RelationshipRepository
} from '../domain/contracts';
import type { 
  Asset,
  PrivacyTransformationRecord,
  PrivacyTransformationType,
  PrivacyTransformationStatus,
  ReidentificationRiskAssessment,
  ReidentificationRiskLevel,
  ReidentificationRiskAssessmentMethod
} from '../types';
import type { HumanReviewService } from './human-review-service';
import type { ImpactAnalyzer } from './impact-analyzer';
import { generateId } from '../lib/utils';

export class PrivacyGovernanceService {
  private transformations: Map<string, PrivacyTransformationRecord> = new Map();
  private riskAssessments: Map<string, ReidentificationRiskAssessment> = new Map();

  constructor(
    private assetRepo: AssetRepository,
    private classificationRepo: ClassificationRepository,
    private relationshipRepo: RelationshipRepository,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository,
    private humanReviewService: HumanReviewService,
    private impactAnalyzer: ImpactAnalyzer
  ) {}

  // ---- TRANSFORMATION GOVERNANCE ----

  proposeTransformation(
    assetId: string,
    transformationType: PrivacyTransformationType,
    technique: string,
    purpose: string,
    executionMode: 'GOVERNANCE_ONLY' | 'WITH_EXECUTOR' = 'GOVERNANCE_ONLY'
  ): PrivacyTransformationRecord {
    const asset = this.assetRepo.getById(assetId);
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    // Validate purpose is provided
    if (!purpose || purpose.trim() === '') {
      throw new Error('Purpose is required for privacy transformation');
    }

    const transformation: PrivacyTransformationRecord = {
      id: generateId(),
      assetId,
      sourceId: asset.sourceId,
      transformationType,
      technique,
      purpose,
      status: 'PROPOSED',
      executionMode,
      evidenceReferences: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.transformations.set(transformation.id, transformation);

    // Generate evidence
    this.evidenceRepo.save({
      id: generateId(),
      type: 'PRIVACY_TRANSFORMATION_PROPOSED',
      subjectType: 'Asset',
      subjectId: assetId,
      actor: 'system:privacy-governance',
      timestamp: new Date().toISOString(),
      source: 'PrivacyGovernanceService.proposeTransformation',
      metadata: {
        transformationId: transformation.id,
        transformationType,
        technique,
        purpose,
        executionMode,
      },
    });

    // Generate audit
    this.auditRepo.save({
      id: generateId(),
      actor: 'system:privacy-governance',
      action: 'CREATE',
      resourceType: 'PrivacyTransformationRecord',
      resourceId: transformation.id,
      timestamp: new Date().toISOString(),
      details: {
        assetId,
        transformationType,
        technique,
        purpose,
        status: 'PROPOSED',
      },
    });

    // Check if review is required
    if (this.requiresReview(transformation)) {
      this.createReviewTask(transformation);
      transformation.status = 'REQUIRES_REVIEW';
    }

    return transformation;
  }

  approveTransformation(transformationId: string, approvedBy: string): void {
    const transformation = this.transformations.get(transformationId);
    if (!transformation) {
      throw new Error(`Transformation ${transformationId} not found`);
    }

    transformation.status = 'APPROVED';
    transformation.updatedAt = new Date().toISOString();

    // Generate evidence
    this.evidenceRepo.save({
      id: generateId(),
      type: 'PRIVACY_TRANSFORMATION_REVIEWED',
      subjectType: 'PrivacyTransformationRecord',
      subjectId: transformationId,
      actor: approvedBy,
      timestamp: new Date().toISOString(),
      source: 'PrivacyGovernanceService.approveTransformation',
      metadata: { decision: 'APPROVED' },
    });

    // Generate audit
    this.auditRepo.save({
      id: generateId(),
      actor: approvedBy,
      action: 'REVIEW',
      resourceType: 'PrivacyTransformationRecord',
      resourceId: transformationId,
      timestamp: new Date().toISOString(),
      details: { decision: 'APPROVED' },
    });

    // If execution mode is WITH_EXECUTOR, move to EXECUTION_PENDING
    if (transformation.executionMode === 'WITH_EXECUTOR') {
      transformation.status = 'EXECUTION_PENDING';
    }
  }

  rejectTransformation(transformationId: string, rejectedBy: string, reason: string): void {
    const transformation = this.transformations.get(transformationId);
    if (!transformation) {
      throw new Error(`Transformation ${transformationId} not found`);
    }

    transformation.status = 'REJECTED';
    transformation.updatedAt = new Date().toISOString();

    // Generate evidence
    this.evidenceRepo.save({
      id: generateId(),
      type: 'PRIVACY_TRANSFORMATION_REVIEWED',
      subjectType: 'PrivacyTransformationRecord',
      subjectId: transformationId,
      actor: rejectedBy,
      timestamp: new Date().toISOString(),
      source: 'PrivacyGovernanceService.rejectTransformation',
      metadata: { decision: 'REJECTED', reason },
    });

    // Generate audit
    this.auditRepo.save({
      id: generateId(),
      actor: rejectedBy,
      action: 'REVIEW',
      resourceType: 'PrivacyTransformationRecord',
      resourceId: transformationId,
      timestamp: new Date().toISOString(),
      details: { decision: 'REJECTED', reason },
    });
  }

  recordExecution(transformationId: string, executorReference: string): void {
    const transformation = this.transformations.get(transformationId);
    if (!transformation) {
      throw new Error(`Transformation ${transformationId} not found`);
    }

    if (transformation.executionMode !== 'WITH_EXECUTOR') {
      throw new Error('Cannot record execution for GOVERNANCE_ONLY mode');
    }

    transformation.executorReference = executorReference;
    transformation.executedAt = new Date().toISOString();
    transformation.status = 'EXECUTED';
    transformation.updatedAt = new Date().toISOString();

    // Generate audit
    this.auditRepo.save({
      id: generateId(),
      actor: executorReference,
      action: 'UPDATE',
      resourceType: 'PrivacyTransformationRecord',
      resourceId: transformationId,
      timestamp: new Date().toISOString(),
      details: { status: 'EXECUTED' },
    });
  }

  verifyTransformation(transformationId: string, verifiedBy: string, evidenceReference: string): void {
    const transformation = this.transformations.get(transformationId);
    if (!transformation) {
      throw new Error(`Transformation ${transformationId} not found`);
    }

    transformation.status = 'VERIFIED';
    transformation.evidenceReferences.push(evidenceReference);
    transformation.updatedAt = new Date().toISOString();

    // Generate evidence
    this.evidenceRepo.save({
      id: generateId(),
      type: 'PRIVACY_TRANSFORMATION_REVIEWED',
      subjectType: 'PrivacyTransformationRecord',
      subjectId: transformationId,
      actor: verifiedBy,
      timestamp: new Date().toISOString(),
      source: 'PrivacyGovernanceService.verifyTransformation',
      metadata: { decision: 'VERIFIED', evidenceReference },
    });

    // Generate audit
    this.auditRepo.save({
      id: generateId(),
      actor: verifiedBy,
      action: 'REVIEW',
      resourceType: 'PrivacyTransformationRecord',
      resourceId: transformationId,
      timestamp: new Date().toISOString(),
      details: { decision: 'VERIFIED', evidenceReference },
    });
  }

  invalidateTransformation(transformationId: string, reason: string): void {
    const transformation = this.transformations.get(transformationId);
    if (!transformation) {
      throw new Error(`Transformation ${transformationId} not found`);
    }

    transformation.status = 'INVALIDATED';
    transformation.updatedAt = new Date().toISOString();

    // Generate evidence
    this.evidenceRepo.save({
      id: generateId(),
      type: 'PRIVACY_TRANSFORMATION_REVIEWED',
      subjectType: 'PrivacyTransformationRecord',
      subjectId: transformationId,
      actor: 'system:privacy-governance',
      timestamp: new Date().toISOString(),
      source: 'PrivacyGovernanceService.invalidateTransformation',
      metadata: { decision: 'INVALIDATED', reason },
    });

    // Generate audit
    this.auditRepo.save({
      id: generateId(),
      actor: 'system:privacy-governance',
      action: 'UPDATE',
      resourceType: 'PrivacyTransformationRecord',
      resourceId: transformationId,
      timestamp: new Date().toISOString(),
      details: { status: 'INVALIDATED', reason },
    });
  }

  getTransformation(id: string): PrivacyTransformationRecord | undefined {
    return this.transformations.get(id);
  }

  getTransformationsByAsset(assetId: string): PrivacyTransformationRecord[] {
    return Array.from(this.transformations.values()).filter(t => t.assetId === assetId);
  }

  listTransformations(status?: PrivacyTransformationStatus): PrivacyTransformationRecord[] {
    const all = Array.from(this.transformations.values());
    if (status) {
      return all.filter(t => t.status === status);
    }
    return all;
  }

  // ---- RE-IDENTIFICATION RISK ASSESSMENT ----

  assessReidentificationRisk(
    subjectId: string,
    subjectType: string,
    method: ReidentificationRiskAssessmentMethod,
    riskFactors: string[],
    assumptions: string[],
    dataLinkability: string,
    externalDataRisk: string,
    singlingOutRisk: string,
    linkabilityRisk: string,
    inferenceRisk: string,
    residualRisk: ReidentificationRiskLevel,
    assessmentResult: string,
    assessor: string,
    validUntil?: string
  ): ReidentificationRiskAssessment {
    const assessment: ReidentificationRiskAssessment = {
      id: generateId(),
      subjectId,
      subjectType,
      assessmentMethod: method,
      riskFactors,
      assumptions,
      dataLinkability,
      externalDataRisk,
      singlingOutRisk,
      linkabilityRisk,
      inferenceRisk,
      residualRisk,
      assessmentResult,
      assessor,
      assessedAt: new Date().toISOString(),
      validUntil,
      evidenceReferences: [],
    };

    this.riskAssessments.set(assessment.id, assessment);

    // Generate evidence
    this.evidenceRepo.save({
      id: generateId(),
      type: 'PRIVACY_RISK_ASSESSED',
      subjectType: subjectType,
      subjectId: subjectId,
      actor: assessor,
      timestamp: new Date().toISOString(),
      source: 'PrivacyGovernanceService.assessReidentificationRisk',
      metadata: {
        assessmentId: assessment.id,
        method,
        residualRisk,
      },
    });

    // Generate audit
    this.auditRepo.save({
      id: generateId(),
      actor: assessor,
      action: 'CREATE',
      resourceType: 'ReidentificationRiskAssessment',
      resourceId: assessment.id,
      timestamp: new Date().toISOString(),
      details: {
        subjectId,
        subjectType,
        method,
        residualRisk,
      },
    });

    // Check if high risk requires review
    if (residualRisk === 'HIGH' || residualRisk === 'CRITICAL') {
      this.createRiskReviewTask(assessment);
    }

    return assessment;
  }

  invalidateRiskAssessment(assessmentId: string, reason: string): void {
    const assessment = this.riskAssessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Risk assessment ${assessmentId} not found`);
    }

    // Generate evidence
    this.evidenceRepo.save({
      id: generateId(),
      type: 'PRIVACY_ASSESSMENT_INVALIDATED',
      subjectType: assessment.subjectType,
      subjectId: assessment.subjectId,
      actor: 'system:privacy-governance',
      timestamp: new Date().toISOString(),
      source: 'PrivacyGovernanceService.invalidateRiskAssessment',
      metadata: { assessmentId, reason },
    });

    // Generate audit
    this.auditRepo.save({
      id: generateId(),
      actor: 'system:privacy-governance',
      action: 'UPDATE',
      resourceType: 'ReidentificationRiskAssessment',
      resourceId: assessmentId,
      timestamp: new Date().toISOString(),
      details: { status: 'INVALIDATED', reason },
    });

    // Note: We don't delete the assessment, just mark it as invalidated
    // Historical assessments remain auditable
  }

  getRiskAssessment(id: string): ReidentificationRiskAssessment | undefined {
    return this.riskAssessments.get(id);
  }

  getLatestRiskAssessment(subjectId: string, subjectType: string): ReidentificationRiskAssessment | undefined {
    const assessments = Array.from(this.riskAssessments.values())
      .filter(a => a.subjectId === subjectId && a.subjectType === subjectType)
      .sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime());
    
    return assessments[0];
  }

  listRiskAssessments(): ReidentificationRiskAssessment[] {
    return Array.from(this.riskAssessments.values());
  }

  // ---- CHANGE INVALIDATION ----

  invalidateDueToChange(assetId: string, changeType: string, reason: string): void {
    // Invalidate all active transformations for this asset
    const transformations = this.getTransformationsByAsset(assetId);
    for (const transformation of transformations) {
      if (transformation.status !== 'INVALIDATED' && transformation.status !== 'REJECTED') {
        this.invalidateTransformation(transformation.id, `${changeType}: ${reason}`);
      }
    }

    // Invalidate all active risk assessments for this asset
    const assessments = Array.from(this.riskAssessments.values())
      .filter(a => a.subjectId === assetId && a.subjectType === 'Asset');
    
    for (const assessment of assessments) {
      this.invalidateRiskAssessment(assessment.id, `${changeType}: ${reason}`);
    }

    // Use ImpactAnalyzer to find downstream dependencies
    const impact = this.impactAnalyzer.analyze(assetId);
    
    // Invalidate downstream if needed
    for (const downstreamId of impact.potentiallyAffected) {
      const downstreamTransformations = this.getTransformationsByAsset(downstreamId);
      for (const transformation of downstreamTransformations) {
        if (transformation.status !== 'INVALIDATED' && transformation.status !== 'REJECTED') {
          this.invalidateTransformation(
            transformation.id, 
            `Upstream ${changeType} on ${assetId}: ${reason}`
          );
        }
      }
    }
  }

  // ---- HELPER METHODS ----

  private requiresReview(transformation: PrivacyTransformationRecord): boolean {
    // Check if asset has sensitive classification
    const classifications = this.classificationRepo.getByAssetId(transformation.assetId);
    const hasSensitiveClassification = classifications.some(c => 
      c.classificationType === 'PII_EMAIL' ||
      c.classificationType === 'PII_NAME' ||
      c.classificationType === 'PII_PHONE' ||
      c.classificationType === 'FINANCIAL'
    );

    // Check if transformation type requires review
    const requiresReviewByType = 
      transformation.transformationType === 'ANONYMIZATION' ||
      transformation.transformationType === 'PSEUDONYMIZATION';

    return hasSensitiveClassification || requiresReviewByType;
  }

  private createReviewTask(transformation: PrivacyTransformationRecord): void {
    const asset = this.assetRepo.getById(transformation.assetId);
    if (!asset) return;

    this.humanReviewService.createTask(
      'PRIVACY_TRANSFORMATION_REVIEW',
      'PrivacyTransformationRecord',
      transformation.id,
      `Privacy transformation ${transformation.transformationType} on ${asset.name} requires review`,
      'HIGH'
    );
  }

  private createRiskReviewTask(assessment: ReidentificationRiskAssessment): void {
    this.humanReviewService.createTask(
      'PRIVACY_RISK_REVIEW',
      'ReidentificationRiskAssessment',
      assessment.id,
      `Re-identification risk assessment with ${assessment.residualRisk} risk requires review`,
      assessment.residualRisk === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
    );
  }
}
