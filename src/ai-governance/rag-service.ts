// ============================================================
// AI GOVERNANCE — RAG Governance Service
// ============================================================

import type { 
  RAGResourceProfile, 
  RAGResourceType, 
  RAGEligibilityStatus,
  RAGEligibilityAssessment 
} from './types';
import type { EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class RAGGovernanceService {
  private profiles: Map<string, RAGResourceProfile> = new Map();
  private assessments: Map<string, RAGEligibilityAssessment> = new Map();

  constructor(
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  // ---- RAG Resource Profile Management ----

  registerRAGResourceProfile(
    assetId: string,
    resourceType: RAGResourceType,
    sourceReference: string,
    versionReference?: string,
    usageRestrictions?: string[]
  ): RAGResourceProfile {
    const profile: RAGResourceProfile = {
      assetId,
      resourceType,
      sourceReference,
      versionReference,
      eligibilityStatus: 'NOT_EVALUATED',
      policyAssessmentIds: [],
      evidenceIds: [],
      usageRestrictions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(assetId, profile);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:rag-governance',
      action: 'CREATE',
      resourceType: 'RAGResourceProfile',
      resourceId: assetId,
      timestamp: new Date().toISOString(),
      details: { resourceType, sourceReference },
    });

    return profile;
  }

  getRAGResourceProfile(assetId: string): RAGResourceProfile | undefined {
    return this.profiles.get(assetId);
  }

  listRAGResourceProfiles(type?: RAGResourceType): RAGResourceProfile[] {
    const all = Array.from(this.profiles.values());
    if (type) {
      return all.filter(p => p.resourceType === type);
    }
    return all;
  }

  updateRAGResourceProfile(assetId: string, updates: Partial<RAGResourceProfile>): void {
    const profile = this.profiles.get(assetId);
    if (!profile) {
      throw new Error(`RAG resource profile ${assetId} not found`);
    }

    const updated = { ...profile, ...updates, updatedAt: new Date().toISOString() };
    this.profiles.set(assetId, updated);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:rag-governance',
      action: 'UPDATE',
      resourceType: 'RAGResourceProfile',
      resourceId: assetId,
      timestamp: new Date().toISOString(),
      details: { updates: Object.keys(updates) },
    });
  }

  // ---- RAG Eligibility Assessment ----

  assessRAGEligibility(
    assetId: string,
    classificationCheck: RAGEligibilityAssessment['classificationCheck'],
    sensitiveDataCheck: RAGEligibilityAssessment['sensitiveDataCheck'],
    qualityCheck: RAGEligibilityAssessment['qualityCheck'],
    lineageCheck: RAGEligibilityAssessment['lineageCheck'],
    freshnessCheck: RAGEligibilityAssessment['freshnessCheck'],
    policyCheck: RAGEligibilityAssessment['policyCheck'],
    evidenceCheck: RAGEligibilityAssessment['evidenceCheck'],
    reasons: string[] = []
  ): RAGEligibilityAssessment {
    const profile = this.profiles.get(assetId);
    if (!profile) {
      throw new Error(`RAG resource profile ${assetId} not found`);
    }

    // Determine overall eligibility status
    let status: RAGEligibilityStatus = 'ELIGIBLE';

    // Check for blocking conditions
    if (policyCheck === 'FAIL') {
      status = 'NOT_ELIGIBLE';
      reasons.push('Policy check failed');
    } else if (sensitiveDataCheck === 'BLOCKED') {
      status = 'NOT_ELIGIBLE';
      reasons.push('Sensitive data check blocked');
    } else if (evidenceCheck === 'INSUFFICIENT') {
      status = 'NOT_ELIGIBLE';
      reasons.push('Insufficient evidence');
    } else if (
      classificationCheck === 'NOT_EVALUATED' ||
      sensitiveDataCheck === 'NOT_EVALUATED' ||
      qualityCheck === 'NOT_EVALUATED' ||
      lineageCheck === 'NOT_EVALUATED'
    ) {
      status = 'NOT_EVALUATED';
      reasons.push('Some checks not evaluated');
    } else if (
      classificationCheck === 'FAIL' ||
      sensitiveDataCheck === 'RESTRICTED' ||
      qualityCheck === 'FAIL' ||
      lineageCheck === 'FAIL' ||
      freshnessCheck === 'FAIL'
    ) {
      status = 'REQUIRES_REVIEW';
      reasons.push('Some checks require review');
    }

    const assessment: RAGEligibilityAssessment = {
      id: generateId(),
      ragResourceAssetId: assetId,
      status,
      classificationCheck,
      sensitiveDataCheck,
      qualityCheck,
      lineageCheck,
      freshnessCheck,
      policyCheck,
      evidenceCheck,
      reasons,
      evidenceIds: [],
      assessedAt: new Date().toISOString(),
    };

    this.assessments.set(assessment.id, assessment);

    // Update profile eligibility status
    profile.eligibilityStatus = status;
    profile.updatedAt = new Date().toISOString();

    // Generate evidence
    const evidenceId = generateId();
    this.evidenceRepo.save({
      id: evidenceId,
      type: 'ASSET_DISCOVERED',
      subjectType: 'RAGEligibilityAssessment',
      subjectId: assessment.id,
      actor: 'system:rag-governance',
      timestamp: new Date().toISOString(),
      source: 'RAGGovernanceService.assessRAGEligibility',
      metadata: { assetId, status, reasons },
    });
    assessment.evidenceIds.push(evidenceId);
    profile.evidenceIds.push(evidenceId);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:rag-governance',
      action: 'SCAN',
      resourceType: 'RAGEligibilityAssessment',
      resourceId: assessment.id,
      timestamp: new Date().toISOString(),
      details: { assetId, status },
    });

    return assessment;
  }

  getRAGEligibilityAssessment(id: string): RAGEligibilityAssessment | undefined {
    return this.assessments.get(id);
  }

  getLatestRAGEligibilityAssessment(assetId: string): RAGEligibilityAssessment | undefined {
    const assessments = Array.from(this.assessments.values())
      .filter(a => a.ragResourceAssetId === assetId)
      .sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime());
    
    return assessments[0];
  }

  listRAGEligibilityAssessments(status?: RAGEligibilityStatus): RAGEligibilityAssessment[] {
    const all = Array.from(this.assessments.values());
    if (status) {
      return all.filter(a => a.status === status);
    }
    return all;
  }

  // ---- Safety Rules ----

  markAsStale(assetId: string): void {
    const profile = this.profiles.get(assetId);
    if (!profile) {
      throw new Error(`RAG resource profile ${assetId} not found`);
    }

    profile.eligibilityStatus = 'STALE';
    profile.updatedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:rag-governance',
      action: 'UPDATE',
      resourceType: 'RAGResourceProfile',
      resourceId: assetId,
      timestamp: new Date().toISOString(),
      details: { eligibilityStatus: 'STALE' },
    });
  }

  // ---- Summary Methods ----

  getRAGGovernanceSummary(): {
    total: number;
    eligible: number;
    notEligible: number;
    requiresReview: number;
    notEvaluated: number;
    stale: number;
  } {
    const profiles = Array.from(this.profiles.values());
    
    return {
      total: profiles.length,
      eligible: profiles.filter(p => p.eligibilityStatus === 'ELIGIBLE').length,
      notEligible: profiles.filter(p => p.eligibilityStatus === 'NOT_ELIGIBLE').length,
      requiresReview: profiles.filter(p => p.eligibilityStatus === 'REQUIRES_REVIEW').length,
      notEvaluated: profiles.filter(p => p.eligibilityStatus === 'NOT_EVALUATED').length,
      stale: profiles.filter(p => p.eligibilityStatus === 'STALE').length,
    };
  }
}
