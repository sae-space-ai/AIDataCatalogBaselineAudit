// ============================================================
// GOVERNANCE — Remediation Service
// ============================================================

import type { RemediationAction, RemediationStatus } from './types';
import type { EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class RemediationService {
  private actions: Map<string, RemediationAction> = new Map();

  constructor(
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  // ---- REMEDIATION CREATION ----

  createAction(
    source: string,
    sourceId: string,
    subjectType: string,
    subjectId: string,
    issue: string,
    recommendedAction: string
  ): RemediationAction {
    const action: RemediationAction = {
      id: generateId(),
      source,
      sourceId,
      subjectType,
      subjectId,
      issue,
      recommendedAction,
      status: 'OPEN',
      evidenceIds: [],
      createdAt: new Date().toISOString(),
    };

    this.actions.set(action.id, action);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:remediation-service',
      action: 'CREATE',
      resourceType: 'RemediationAction',
      resourceId: action.id,
      timestamp: new Date().toISOString(),
      details: {
        source,
        sourceId,
        subjectType,
        subjectId,
        status: 'OPEN',
      },
    });

    return action;
  }

  // ---- REMEDIATION MANAGEMENT ----

  assignAction(actionId: string, assignedTo: string, dueDate?: string): void {
    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`Remediation action ${actionId} not found`);
    }

    action.assignedTo = assignedTo;
    action.dueDate = dueDate;
    action.status = 'IN_PROGRESS';

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:remediation-service',
      action: 'UPDATE',
      resourceType: 'RemediationAction',
      resourceId: actionId,
      timestamp: new Date().toISOString(),
      details: { assignedTo, dueDate, status: 'IN_PROGRESS' },
    });
  }

  resolveAction(actionId: string, resolvedBy: string, evidenceIds: string[] = []): void {
    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`Remediation action ${actionId} not found`);
    }

    action.status = 'RESOLVED';
    action.resolvedAt = new Date().toISOString();
    action.evidenceIds.push(...evidenceIds);

    this.auditRepo.save({
      id: generateId(),
      actor: resolvedBy,
      action: 'UPDATE',
      resourceType: 'RemediationAction',
      resourceId: actionId,
      timestamp: new Date().toISOString(),
      details: { status: 'RESOLVED' },
    });
  }

  acceptRisk(actionId: string, acceptedBy: string, reason: string): void {
    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`Remediation action ${actionId} not found`);
    }

    action.status = 'ACCEPTED_RISK';
    action.resolvedAt = new Date().toISOString();

    // Generate evidence for risk acceptance
    const evidenceId = generateId();
    this.evidenceRepo.save({
      id: evidenceId,
      type: 'POLICY_EVALUATION',
      subjectType: action.subjectType,
      subjectId: action.subjectId,
      actor: acceptedBy,
      timestamp: new Date().toISOString(),
      source: 'RemediationService.acceptRisk',
      metadata: {
        actionId,
        reason,
        status: 'ACCEPTED_RISK',
      },
    });
    action.evidenceIds.push(evidenceId);

    this.auditRepo.save({
      id: generateId(),
      actor: acceptedBy,
      action: 'UPDATE',
      resourceType: 'RemediationAction',
      resourceId: actionId,
      timestamp: new Date().toISOString(),
      details: { status: 'ACCEPTED_RISK', reason },
    });
  }

  cancelAction(actionId: string, cancelledBy: string, reason: string): void {
    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`Remediation action ${actionId} not found`);
    }

    action.status = 'CANCELLED';

    this.auditRepo.save({
      id: generateId(),
      actor: cancelledBy,
      action: 'UPDATE',
      resourceType: 'RemediationAction',
      resourceId: actionId,
      timestamp: new Date().toISOString(),
      details: { status: 'CANCELLED', reason },
    });
  }

  // ---- REMEDIATION RETRIEVAL ----

  getAction(id: string): RemediationAction | undefined {
    return this.actions.get(id);
  }

  getActionsBySubject(subjectType: string, subjectId: string): RemediationAction[] {
    return Array.from(this.actions.values()).filter(
      a => a.subjectType === subjectType && a.subjectId === subjectId
    );
  }

  getActionsBySource(source: string, sourceId: string): RemediationAction[] {
    return Array.from(this.actions.values()).filter(
      a => a.source === source && a.sourceId === sourceId
    );
  }

  listActions(status?: RemediationStatus): RemediationAction[] {
    const all = Array.from(this.actions.values());
    if (status) {
      return all.filter(a => a.status === status);
    }
    return all;
  }

  getOverdueActions(): RemediationAction[] {
    const now = new Date().toISOString();
    return this.listActions('IN_PROGRESS').filter(
      a => a.dueDate && a.dueDate < now
    );
  }

  getActionsAssignedTo(assignedTo: string): RemediationAction[] {
    return this.listActions().filter(a => a.assignedTo === assignedTo);
  }
}
