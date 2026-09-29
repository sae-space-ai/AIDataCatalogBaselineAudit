// ============================================================
// GOVERNANCE — Policy Conflict Detector
// ============================================================

import type { PolicyDefinition, PolicyConflict } from './types';
import type { PolicyService } from './policy-service';
import type { AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class PolicyConflictDetector {
  private conflicts: Map<string, PolicyConflict> = new Map();

  constructor(
    private policyService: PolicyService,
    private auditRepo: AuditRepository
  ) {}

  // ---- CONFLICT DETECTION ----

  detectConflicts(): PolicyConflict[] {
    const policies = this.policyService.listPolicies('ACTIVE');
    const detectedConflicts: PolicyConflict[] = [];

    // Check each pair of policies for conflicts
    for (let i = 0; i < policies.length; i++) {
      for (let j = i + 1; j < policies.length; j++) {
        const conflict = this.checkPairConflict(policies[i], policies[j]);
        if (conflict) {
          detectedConflicts.push(conflict);
          this.conflicts.set(conflict.id, conflict);
        }
      }
    }

    return detectedConflicts;
  }

  private checkPairConflict(
    policy1: PolicyDefinition,
    policy2: PolicyDefinition
  ): PolicyConflict | null {
    // Check for overlapping scopes
    const hasOverlappingScope = this.hasOverlappingScope(policy1.scope, policy2.scope);
    
    if (!hasOverlappingScope) {
      return null; // No overlap, no conflict
    }

    // Check for contradictory conditions
    const hasContradictoryConditions = this.hasContradictoryConditions(
      policy1.conditions,
      policy2.conditions
    );

    if (hasContradictoryConditions) {
      return {
        id: generateId(),
        policyIds: [policy1.id, policy2.id],
        conflictType: 'CONTRADICTORY',
        description: `Policies ${policy1.name} and ${policy2.name} have contradictory conditions on overlapping scope`,
        resolution: 'HUMAN_REVIEW_REQUIRED',
        detectedAt: new Date().toISOString(),
      };
    }

    // Check for priority ambiguity
    if (policy1.priority === undefined && policy2.priority === undefined) {
      return {
        id: generateId(),
        policyIds: [policy1.id, policy2.id],
        conflictType: 'PRIORITY_AMBIGUITY',
        description: `Policies ${policy1.name} and ${policy2.name} have overlapping scope but no priority defined`,
        resolution: 'HUMAN_REVIEW_REQUIRED',
        detectedAt: new Date().toISOString(),
      };
    }

    // Check for incompatible actions (simplified)
    // In a real implementation, this would check the actual controls and actions
    const hasOverlappingControls = this.hasOverlappingControls(policy1.controls, policy2.controls);
    
    if (hasOverlappingControls) {
      return {
        id: generateId(),
        policyIds: [policy1.id, policy2.id],
        conflictType: 'OVERLAPPING',
        description: `Policies ${policy1.name} and ${policy2.name} have overlapping controls`,
        resolution: 'PRIORITY_BASED',
        detectedAt: new Date().toISOString(),
      };
    }

    return null;
  }

  private hasOverlappingScope(
    scope1: PolicyDefinition['scope'],
    scope2: PolicyDefinition['scope']
  ): boolean {
    if (scope1.length === 0 || scope2.length === 0) {
      return true; // No scope restrictions means applies to everything
    }

    return scope1.some(s1 =>
      scope2.some(s2 => s1.type === s2.type && s1.value === s2.value)
    );
  }

  private hasContradictoryConditions(
    conditions1: PolicyDefinition['conditions'],
    conditions2: PolicyDefinition['conditions']
  ): boolean {
    // Simplified contradiction detection
    // In a real implementation, this would be more sophisticated
    
    for (const c1 of conditions1) {
      for (const c2 of conditions2) {
        if (c1.field === c2.field) {
          // Check for direct contradictions
          if (
            (c1.operator === 'EQUALS' && c2.operator === 'NOT_EQUALS' && c1.value === c2.value) ||
            (c1.operator === 'NOT_EQUALS' && c2.operator === 'EQUALS' && c1.value === c2.value)
          ) {
            return true;
          }

          // Check for range contradictions
          if (
            (c1.operator === 'GREATER_THAN' && c2.operator === 'LESS_THAN') ||
            (c1.operator === 'LESS_THAN' && c2.operator === 'GREATER_THAN')
          ) {
            const v1 = c1.value as number;
            const v2 = c2.value as number;
            if (v1 >= v2) {
              return true; // Contradictory ranges
            }
          }
        }
      }
    }

    return false;
  }

  private hasOverlappingControls(controls1: string[], controls2: string[]): boolean {
    return controls1.some(c => controls2.includes(c));
  }

  // ---- CONFLICT RESOLUTION ----

  resolveConflict(
    conflictId: string,
    resolvedBy: string,
    resolution: 'PRIORITY_BASED' | 'HUMAN_REVIEW_REQUIRED' | 'UNRESOLVED'
  ): void {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    conflict.resolution = resolution;
    conflict.resolvedAt = new Date().toISOString();
    conflict.resolvedBy = resolvedBy;

    this.auditRepo.save({
      id: generateId(),
      actor: resolvedBy,
      action: 'UPDATE',
      resourceType: 'PolicyConflict',
      resourceId: conflictId,
      timestamp: new Date().toISOString(),
      details: { resolution },
    });
  }

  getConflict(id: string): PolicyConflict | undefined {
    return this.conflicts.get(id);
  }

  listConflicts(resolved?: boolean): PolicyConflict[] {
    const all = Array.from(this.conflicts.values());
    if (resolved === undefined) {
      return all;
    }
    return all.filter(c => (c.resolvedAt !== undefined) === resolved);
  }

  getConflictsForPolicy(policyId: string): PolicyConflict[] {
    return Array.from(this.conflicts.values()).filter(
      c => c.policyIds.includes(policyId)
    );
  }
}
