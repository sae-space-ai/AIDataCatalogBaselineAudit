// ============================================================
// AI GOVERNANCE — Data Drift Service
// ============================================================

import type { 
  DataDriftAssessment, 
  DriftType, 
  DriftSeverity,
  DriftThresholdProfile,
  DriftChange
} from './types';
import type { EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class DataDriftService {
  private assessments: Map<string, DataDriftAssessment> = new Map();
  private thresholdProfiles: Map<string, DriftThresholdProfile> = new Map();

  constructor(
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  // ---- Threshold Profile Management ----

  registerThresholdProfile(
    name: string,
    driftType: DriftType,
    thresholds: { minor: number; material: number; critical: number },
    applicableTo: string[] = []
  ): DriftThresholdProfile {
    const profile: DriftThresholdProfile = {
      id: generateId(),
      name,
      driftType,
      thresholds,
      applicableTo,
    };

    this.thresholdProfiles.set(profile.id, profile);
    return profile;
  }

  getThresholdProfile(id: string): DriftThresholdProfile | undefined {
    return this.thresholdProfiles.get(id);
  }

  getThresholdProfileForDriftType(driftType: DriftType): DriftThresholdProfile | undefined {
    return Array.from(this.thresholdProfiles.values()).find(p => p.driftType === driftType);
  }

  // ---- Drift Assessment ----

  assessDrift(
    subjectType: string,
    subjectId: string,
    driftType: DriftType,
    changes: DriftChange[],
    previousSnapshot?: string,
    currentSnapshot?: string
  ): DataDriftAssessment {
    // Determine severity based on changes
    const severity = this.calculateDriftSeverity(driftType, changes);

    // Generate reason
    const reason = this.generateDriftReason(driftType, changes, severity);

    // Identify affected resources (simplified - would use ImpactAnalyzer in real implementation)
    const affectedResources: string[] = [];

    const assessment: DataDriftAssessment = {
      id: generateId(),
      subjectType,
      subjectId,
      driftType,
      severity,
      previousSnapshot,
      currentSnapshot,
      changes,
      reason,
      evidenceIds: [],
      affectedResources,
      assessedAt: new Date().toISOString(),
    };

    this.assessments.set(assessment.id, assessment);

    // Generate evidence
    if (severity !== 'NO_DRIFT' && severity !== 'NOT_EVALUATED') {
      const evidenceId = generateId();
      this.evidenceRepo.save({
        id: evidenceId,
        type: 'ASSET_UPDATED',
        subjectType,
        subjectId,
        actor: 'system:data-drift',
        timestamp: new Date().toISOString(),
        source: 'DataDriftService.assessDrift',
        metadata: { 
          driftType, 
          severity, 
          changeCount: changes.length 
        },
      });
      assessment.evidenceIds.push(evidenceId);
    }

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:data-drift',
      action: 'SCAN',
      resourceType: 'DataDriftAssessment',
      resourceId: assessment.id,
      timestamp: new Date().toISOString(),
      details: { subjectType, subjectId, driftType, severity },
    });

    return assessment;
  }

  private calculateDriftSeverity(driftType: DriftType, changes: DriftChange[]): DriftSeverity {
    if (changes.length === 0) {
      return 'NO_DRIFT';
    }

    // Count high-impact changes
    const highImpactChanges = changes.filter(c => c.impact === 'HIGH').length;
    const mediumImpactChanges = changes.filter(c => c.impact === 'MEDIUM').length;

    // Determine severity based on impact
    if (highImpactChanges > 0) {
      return 'CRITICAL_DRIFT';
    }

    if (mediumImpactChanges > 2 || changes.length > 5) {
      return 'MATERIAL_DRIFT';
    }

    if (changes.length > 0) {
      return 'MINOR_DRIFT';
    }

    return 'NO_DRIFT';
  }

  private generateDriftReason(
    driftType: DriftType, 
    changes: DriftChange[], 
    severity: DriftSeverity
  ): string {
    if (severity === 'NO_DRIFT') {
      return 'No drift detected';
    }

    const changeSummary = changes.map(c => `${c.field} (${c.changeType})`).join(', ');
    
    switch (driftType) {
      case 'SCHEMA_DRIFT':
        return `Schema changes detected: ${changeSummary}`;
      case 'QUALITY_DRIFT':
        return `Quality metrics changed: ${changeSummary}`;
      case 'CLASSIFICATION_DRIFT':
        return `Classification changes detected: ${changeSummary}`;
      case 'STATISTICAL_DRIFT':
        return `Statistical distribution changes: ${changeSummary}`;
      case 'SOURCE_DRIFT':
        return `Source data changes: ${changeSummary}`;
      default:
        return `Drift detected: ${changeSummary}`;
    }
  }

  // ---- Assessment Retrieval ----

  getDriftAssessment(id: string): DataDriftAssessment | undefined {
    return this.assessments.get(id);
  }

  getDriftAssessmentsForSubject(subjectType: string, subjectId: string): DataDriftAssessment[] {
    return Array.from(this.assessments.values()).filter(
      a => a.subjectType === subjectType && a.subjectId === subjectId
    );
  }

  listDriftAssessments(severity?: DriftSeverity): DataDriftAssessment[] {
    const all = Array.from(this.assessments.values());
    if (severity) {
      return all.filter(a => a.severity === severity);
    }
    return all;
  }

  getMaterialOrCriticalDrifts(): DataDriftAssessment[] {
    return this.listDriftAssessments().filter(
      a => a.severity === 'MATERIAL_DRIFT' || a.severity === 'CRITICAL_DRIFT'
    );
  }

  // ---- Impact Analysis ----

  getAffectedResources(assessmentId: string): string[] {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      return [];
    }
    return assessment.affectedResources;
  }

  markAffectedResource(assessmentId: string, resourceId: string): void {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Drift assessment ${assessmentId} not found`);
    }

    if (!assessment.affectedResources.includes(resourceId)) {
      assessment.affectedResources.push(resourceId);
    }
  }

  // ---- Summary Methods ----

  getDriftSummary(): {
    total: number;
    noDrift: number;
    minorDrift: number;
    materialDrift: number;
    criticalDrift: number;
    notEvaluated: number;
  } {
    const assessments = Array.from(this.assessments.values());
    
    return {
      total: assessments.length,
      noDrift: assessments.filter(a => a.severity === 'NO_DRIFT').length,
      minorDrift: assessments.filter(a => a.severity === 'MINOR_DRIFT').length,
      materialDrift: assessments.filter(a => a.severity === 'MATERIAL_DRIFT').length,
      criticalDrift: assessments.filter(a => a.severity === 'CRITICAL_DRIFT').length,
      notEvaluated: assessments.filter(a => a.severity === 'NOT_EVALUATED').length,
    };
  }

  // ---- Governance Invalidation ----

  invalidateRelatedAssessments(subjectType: string, subjectId: string): void {
    // Mark related training data approvals as stale
    // Mark related RAG eligibility as stale
    // Mark related AI governance assessments as stale
    // This would integrate with other services in a real implementation

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:data-drift',
      action: 'UPDATE',
      resourceType: 'DataDriftAssessment',
      resourceId: subjectId,
      timestamp: new Date().toISOString(),
      details: { 
        action: 'INVALIDATE_RELATED',
        subjectType,
        subjectId 
      },
    });
  }
}
