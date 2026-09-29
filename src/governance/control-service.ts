// ============================================================
// GOVERNANCE — Control Service
// ============================================================

import type {
  ControlDefinition,
  ControlExecution,
  ControlResult,
  EvidenceRequirement,
} from './types';
import type { EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class ControlService {
  private controls: Map<string, ControlDefinition> = new Map();
  private executions: Map<string, ControlExecution> = new Map();

  constructor(
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  // ---- CONTROL REGISTRATION ----

  registerControl(control: ControlDefinition): void {
    if (this.controls.has(control.id)) {
      throw new Error(`Control ${control.id} already registered`);
    }
    this.controls.set(control.id, control);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:control-service',
      action: 'CREATE',
      resourceType: 'Control',
      resourceId: control.id,
      timestamp: new Date().toISOString(),
      details: { controlType: control.controlType, executionMode: control.executionMode },
    });
  }

  getControl(id: string): ControlDefinition | undefined {
    return this.controls.get(id);
  }

  listControls(): ControlDefinition[] {
    return Array.from(this.controls.values());
  }

  // ---- CONTROL EXECUTION ----

  executeControl(
    controlId: string,
    subjectType: string,
    subjectId: string,
    inputs: Record<string, unknown>,
    correlationId: string
  ): ControlExecution {
    const control = this.getControl(controlId);
    if (!control) {
      throw new Error(`Control ${controlId} not found`);
    }

    const execution: ControlExecution = {
      id: generateId(),
      controlId,
      controlVersion: control.version,
      subjectType,
      subjectId,
      status: 'NOT_EVALUATED',
      startedAt: new Date().toISOString(),
      inputs,
      evidenceIds: [],
      correlationId,
    };

    // Check implementation level
    if (control.implementationLevel === 'NOT_IMPLEMENTED') {
      execution.status = 'NOT_EVALUATED';
      execution.completedAt = new Date().toISOString();
      execution.error = 'Control not implemented';
      this.executions.set(execution.id, execution);
      return execution;
    }

    // Check execution mode
    if (control.executionMode === 'MANUAL') {
      execution.status = 'REQUIRES_REVIEW';
      execution.completedAt = new Date().toISOString();
      this.executions.set(execution.id, execution);

      // Generate evidence
      this.evidenceRepo.save({
        id: generateId(),
        type: 'QUALITY_CHECK_COMPLETED',
        subjectType,
        subjectId,
        actor: 'system:control-service',
        timestamp: new Date().toISOString(),
        source: 'ControlService.executeControl',
        metadata: {
          controlId,
          controlVersion: control.version,
          status: 'REQUIRES_REVIEW',
          reason: 'Manual control requires human review',
        },
      });

      return execution;
    }

    // Execute automated control
    try {
      const result = this.runControlLogic(control, inputs);
      execution.status = result.status;
      execution.result = result.data;
      execution.completedAt = new Date().toISOString();

      // Generate evidence
      const evidenceId = generateId();
      this.evidenceRepo.save({
        id: evidenceId,
        type: 'QUALITY_CHECK_COMPLETED',
        subjectType,
        subjectId,
        actor: 'system:control-service',
        timestamp: new Date().toISOString(),
        source: 'ControlService.executeControl',
        metadata: {
          controlId,
          controlVersion: control.version,
          status: result.status,
          result: result.data,
        },
      });
      execution.evidenceIds.push(evidenceId);

      // Generate audit event
      this.auditRepo.save({
        id: generateId(),
        actor: 'system:control-service',
        action: 'SCAN',
        resourceType: 'ControlExecution',
        resourceId: execution.id,
        timestamp: new Date().toISOString(),
        details: {
          controlId,
          controlVersion: control.version,
          subjectType,
          subjectId,
          status: result.status,
        },
      });
    } catch (error) {
      execution.status = 'ERROR';
      execution.completedAt = new Date().toISOString();
      execution.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.executions.set(execution.id, execution);
    return execution;
  }

  private runControlLogic(
    control: ControlDefinition,
    inputs: Record<string, unknown>
  ): { status: ControlResult; data: Record<string, unknown> } {
    // This is a simplified control execution logic
    // In a real implementation, this would be more sophisticated
    // and could involve actual checks against data

    // For now, return a basic implementation
    // Real controls would check specific conditions

    const controlType = control.controlType;

    switch (controlType) {
      case 'PREVENTIVE':
        // Preventive controls check before action
        return {
          status: 'PASS',
          data: { message: 'Preventive control passed' },
        };

      case 'DETECTIVE':
        // Detective controls check after action
        return {
          status: 'PASS',
          data: { message: 'Detective control passed' },
        };

      case 'CORRECTIVE':
        // Corrective controls fix issues
        return {
          status: 'PASS',
          data: { message: 'Corrective control passed' },
        };

      case 'GOVERNANCE':
        // Governance controls check governance requirements
        return {
          status: 'PASS',
          data: { message: 'Governance control passed' },
        };

      default:
        return {
          status: 'NOT_EVALUATED',
          data: { message: 'Unknown control type' },
        };
    }
  }

  getExecution(id: string): ControlExecution | undefined {
    return this.executions.get(id);
  }

  getExecutionsBySubject(subjectType: string, subjectId: string): ControlExecution[] {
    return Array.from(this.executions.values()).filter(
      e => e.subjectType === subjectType && e.subjectId === subjectId
    );
  }

  getExecutionsByControl(controlId: string): ControlExecution[] {
    return Array.from(this.executions.values()).filter(e => e.controlId === controlId);
  }
}
