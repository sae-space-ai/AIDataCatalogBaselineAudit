// ============================================================
// HUMAN REVIEW — Service
// ============================================================

import type { HumanReviewTask, HumanReviewTaskStatus } from '../agents/types';
import type { EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class HumanReviewService {
  private tasks: Map<string, HumanReviewTask> = new Map();

  constructor(
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  createTask(
    type: string,
    subjectType: string,
    subjectId: string,
    reason: string,
    priority: HumanReviewTask['priority'] = 'MEDIUM'
  ): HumanReviewTask {
    const task: HumanReviewTask = {
      id: generateId(),
      type,
      subjectType,
      subjectId,
      reason,
      priority,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      evidenceIds: [],
    };

    this.tasks.set(task.id, task);

    // Generate audit event
    this.auditRepo.save({
      id: generateId(),
      actor: 'system:human-review',
      action: 'CREATE',
      resourceType: 'HumanReviewTask',
      resourceId: task.id,
      timestamp: new Date().toISOString(),
      details: { type, subjectType, subjectId, priority },
    });

    return task;
  }

  getTask(id: string): HumanReviewTask | undefined {
    return this.tasks.get(id);
  }

  listTasks(status?: HumanReviewTaskStatus): HumanReviewTask[] {
    const all = Array.from(this.tasks.values());
    if (status) {
      return all.filter(t => t.status === status);
    }
    return all;
  }

  listTasksBySubject(subjectType: string, subjectId: string): HumanReviewTask[] {
    return Array.from(this.tasks.values()).filter(
      t => t.subjectType === subjectType && t.subjectId === subjectId
    );
  }

  assignTask(id: string, assignedTo: string): void {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Human review task ${id} not found`);
    }

    task.assignedTo = assignedTo;
    task.status = 'ASSIGNED';

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:human-review',
      action: 'UPDATE',
      resourceType: 'HumanReviewTask',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { assignedTo, status: 'ASSIGNED' },
    });
  }

  resolveTask(id: string, decision: string, resolvedBy: string): void {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Human review task ${id} not found`);
    }

    task.status = 'RESOLVED';
    task.decision = decision;
    task.resolvedAt = new Date().toISOString();

    // Generate evidence
    const evidenceId = generateId();
    this.evidenceRepo.save({
      id: evidenceId,
      type: 'CLASSIFICATION_REVIEWED',
      subjectType: task.subjectType,
      subjectId: task.subjectId,
      actor: resolvedBy,
      timestamp: new Date().toISOString(),
      source: 'HumanReviewService.resolveTask',
      metadata: { taskId: id, decision },
    });
    task.evidenceIds.push(evidenceId);

    this.auditRepo.save({
      id: generateId(),
      actor: resolvedBy,
      action: 'REVIEW',
      resourceType: 'HumanReviewTask',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { decision, status: 'RESOLVED' },
    });
  }

  rejectTask(id: string, reason: string, rejectedBy: string): void {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Human review task ${id} not found`);
    }

    task.status = 'REJECTED';
    task.decision = reason;
    task.resolvedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: rejectedBy,
      action: 'REVIEW',
      resourceType: 'HumanReviewTask',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { reason, status: 'REJECTED' },
    });
  }

  cancelTask(id: string, reason: string, cancelledBy: string): void {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Human review task ${id} not found`);
    }

    task.status = 'CANCELLED';
    task.decision = reason;
    task.resolvedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: cancelledBy,
      action: 'UPDATE',
      resourceType: 'HumanReviewTask',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { reason, status: 'CANCELLED' },
    });
  }

  getOpenTasks(): HumanReviewTask[] {
    return this.listTasks('OPEN');
  }

  getTasksByPriority(priority: HumanReviewTask['priority']): HumanReviewTask[] {
    return Array.from(this.tasks.values()).filter(t => t.priority === priority);
  }
}
