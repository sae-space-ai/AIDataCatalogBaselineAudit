// ============================================================
// GOVERNANCE — Risk Service
// ============================================================

import type { GovernanceRisk, RiskState } from './types';
import type { EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class RiskService {
  private risks: Map<string, GovernanceRisk> = new Map();

  constructor(
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  // ---- RISK ASSESSMENT ----

  assessRisk(
    subjectType: string,
    subjectId: string,
    subjectData: Record<string, unknown>
  ): GovernanceRisk {
    const risk: GovernanceRisk = {
      id: generateId(),
      subjectType,
      subjectId,
      likelihood: this.assessLikelihood(subjectData),
      impact: this.assessImpact(subjectData),
      severity: 'NOT_EVALUATED',
      reason: '',
      evidenceIds: [],
      status: 'IDENTIFIED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Calculate severity based on likelihood and impact
    risk.severity = this.calculateSeverity(risk.likelihood, risk.impact);
    risk.reason = this.generateRiskReason(risk);

    this.risks.set(risk.id, risk);

    // Generate evidence
    const evidenceId = generateId();
    this.evidenceRepo.save({
      id: evidenceId,
      type: 'POLICY_EVALUATION',
      subjectType,
      subjectId,
      actor: 'system:risk-service',
      timestamp: new Date().toISOString(),
      source: 'RiskService.assessRisk',
      metadata: {
        riskId: risk.id,
        likelihood: risk.likelihood,
        impact: risk.impact,
        severity: risk.severity,
      },
    });
    risk.evidenceIds.push(evidenceId);

    // Generate audit event
    this.auditRepo.save({
      id: generateId(),
      actor: 'system:risk-service',
      action: 'CREATE',
      resourceType: 'GovernanceRisk',
      resourceId: risk.id,
      timestamp: new Date().toISOString(),
      details: {
        subjectType,
        subjectId,
        severity: risk.severity,
      },
    });

    return risk;
  }

  private assessLikelihood(data: Record<string, unknown>): RiskState {
    // Simplified likelihood assessment
    // In a real implementation, this would be more sophisticated

    const classification = data['classification'] as string | undefined;
    const sensitivity = data['sensitivity'] as string | undefined;

    // High likelihood for sensitive data
    if (classification?.startsWith('PII') || sensitivity === 'RESTRICTED') {
      return 'HIGH';
    }

    // Medium likelihood for confidential data
    if (sensitivity === 'CONFIDENTIAL') {
      return 'MEDIUM';
    }

    // Low likelihood for public/internal data
    if (sensitivity === 'PUBLIC' || sensitivity === 'INTERNAL') {
      return 'LOW';
    }

    return 'NOT_EVALUATED';
  }

  private assessImpact(data: Record<string, unknown>): RiskState {
    // Simplified impact assessment
    // In a real implementation, this would consider business impact

    const classification = data['classification'] as string | undefined;
    const trustScore = data['trustScore'] as number | undefined;

    // High impact for financial/PII data
    if (classification === 'FINANCIAL' || classification?.startsWith('PII')) {
      return 'HIGH';
    }

    // Medium impact for low trust scores
    if (trustScore !== undefined && trustScore < 50) {
      return 'MEDIUM';
    }

    // Low impact for high trust scores
    if (trustScore !== undefined && trustScore >= 80) {
      return 'LOW';
    }

    return 'NOT_EVALUATED';
  }

  private calculateSeverity(likelihood: RiskState, impact: RiskState): RiskState {
    // Simple risk matrix
    const riskMatrix: Record<string, Record<string, RiskState>> = {
      'LOW': {
        'LOW': 'LOW',
        'MEDIUM': 'LOW',
        'HIGH': 'MEDIUM',
        'CRITICAL': 'MEDIUM',
        'NOT_EVALUATED': 'NOT_EVALUATED',
      },
      'MEDIUM': {
        'LOW': 'LOW',
        'MEDIUM': 'MEDIUM',
        'HIGH': 'HIGH',
        'CRITICAL': 'HIGH',
        'NOT_EVALUATED': 'NOT_EVALUATED',
      },
      'HIGH': {
        'LOW': 'MEDIUM',
        'MEDIUM': 'HIGH',
        'HIGH': 'HIGH',
        'CRITICAL': 'CRITICAL',
        'NOT_EVALUATED': 'NOT_EVALUATED',
      },
      'CRITICAL': {
        'LOW': 'MEDIUM',
        'MEDIUM': 'HIGH',
        'HIGH': 'CRITICAL',
        'CRITICAL': 'CRITICAL',
        'NOT_EVALUATED': 'NOT_EVALUATED',
      },
      'NOT_EVALUATED': {
        'LOW': 'NOT_EVALUATED',
        'MEDIUM': 'NOT_EVALUATED',
        'HIGH': 'NOT_EVALUATED',
        'CRITICAL': 'NOT_EVALUATED',
        'NOT_EVALUATED': 'NOT_EVALUATED',
      },
    };

    return riskMatrix[likelihood]?.[impact] || 'NOT_EVALUATED';
  }

  private generateRiskReason(risk: GovernanceRisk): string {
    const parts: string[] = [];

    if (risk.likelihood !== 'NOT_EVALUATED') {
      parts.push(`Likelihood: ${risk.likelihood}`);
    }

    if (risk.impact !== 'NOT_EVALUATED') {
      parts.push(`Impact: ${risk.impact}`);
    }

    if (risk.severity !== 'NOT_EVALUATED') {
      parts.push(`Overall severity: ${risk.severity}`);
    }

    if (parts.length === 0) {
      return 'Risk not fully evaluated';
    }

    return parts.join(', ');
  }

  // ---- RISK MANAGEMENT ----

  mitigateRisk(riskId: string): void {
    const risk = this.risks.get(riskId);
    if (!risk) {
      throw new Error(`Risk ${riskId} not found`);
    }

    risk.status = 'MITIGATED';
    risk.updatedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:risk-service',
      action: 'UPDATE',
      resourceType: 'GovernanceRisk',
      resourceId: riskId,
      timestamp: new Date().toISOString(),
      details: { status: 'MITIGATED' },
    });
  }

  acceptRisk(riskId: string, acceptedBy: string): void {
    const risk = this.risks.get(riskId);
    if (!risk) {
      throw new Error(`Risk ${riskId} not found`);
    }

    risk.status = 'ACCEPTED';
    risk.updatedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: acceptedBy,
      action: 'UPDATE',
      resourceType: 'GovernanceRisk',
      resourceId: riskId,
      timestamp: new Date().toISOString(),
      details: { status: 'ACCEPTED' },
    });
  }

  // ---- RISK RETRIEVAL ----

  getRisk(id: string): GovernanceRisk | undefined {
    return this.risks.get(id);
  }

  getRisksBySubject(subjectType: string, subjectId: string): GovernanceRisk[] {
    return Array.from(this.risks.values()).filter(
      r => r.subjectType === subjectType && r.subjectId === subjectId
    );
  }

  listRisks(severity?: RiskState): GovernanceRisk[] {
    const all = Array.from(this.risks.values());
    if (severity) {
      return all.filter(r => r.severity === severity);
    }
    return all;
  }

  getHighRisks(): GovernanceRisk[] {
    return this.listRisks().filter(
      r => r.severity === 'HIGH' || r.severity === 'CRITICAL'
    );
  }
}
