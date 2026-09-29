// ============================================================
// GOVERNANCE — Policy Service
// ============================================================

import type {
  PolicyDefinition,
  PolicyStatus,
  PolicyEvaluationV2,
  PolicyConflict,
  PolicyException,
  EvidenceRequirement,
  ConditionEvaluation,
} from './types';
import type { EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class PolicyService {
  private policies: Map<string, PolicyDefinition[]> = new Map(); // policyId -> versions[]
  private exceptions: Map<string, PolicyException> = new Map();

  constructor(
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  // ---- POLICY REGISTRATION ----

  registerPolicy(policy: PolicyDefinition): void {
    const existing = this.policies.get(policy.id) || [];
    
    // Check for duplicate version
    if (existing.some(p => p.version === policy.version)) {
      throw new Error(`Policy ${policy.id} version ${policy.version} already exists`);
    }

    existing.push(policy);
    this.policies.set(policy.id, existing);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:policy-service',
      action: 'CREATE',
      resourceType: 'Policy',
      resourceId: policy.id,
      timestamp: new Date().toISOString(),
      details: { version: policy.version, status: policy.status },
    });
  }

  getPolicy(id: string, version?: string): PolicyDefinition | undefined {
    const versions = this.policies.get(id);
    if (!versions || versions.length === 0) return undefined;

    if (version) {
      return versions.find(p => p.version === version);
    }

    // Return latest version
    return versions[versions.length - 1];
  }

  getPolicyVersions(id: string): PolicyDefinition[] {
    return this.policies.get(id) || [];
  }

  listPolicies(status?: PolicyStatus): PolicyDefinition[] {
    const allPolicies: PolicyDefinition[] = [];
    
    for (const versions of this.policies.values()) {
      const latest = versions[versions.length - 1];
      if (!status || latest.status === status) {
        allPolicies.push(latest);
      }
    }

    return allPolicies;
  }

  updatePolicyStatus(id: string, status: PolicyStatus): void {
    const policy = this.getPolicy(id);
    if (!policy) {
      throw new Error(`Policy ${id} not found`);
    }

    policy.status = status;
    policy.updatedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:policy-service',
      action: 'UPDATE',
      resourceType: 'Policy',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { status },
    });
  }

  // ---- POLICY EVALUATION ----

  evaluatePolicy(
    policyId: string,
    subjectType: string,
    subjectId: string,
    subjectData: Record<string, unknown>,
    simulationMode: boolean = false
  ): PolicyEvaluationV2 {
    const policy = this.getPolicy(policyId);
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    // Check if policy is active (unless in simulation mode)
    if (!simulationMode && policy.status !== 'ACTIVE') {
      return {
        id: generateId(),
        policyId,
        policyVersion: policy.version,
        subjectType,
        subjectId,
        applicability: 'NOT_APPLICABLE',
        conditionsEvaluated: [],
        controlsExecuted: [],
        status: 'NOT_APPLICABLE',
        reason: `Policy is not ACTIVE (current status: ${policy.status})`,
        evidenceIds: [],
        timestamp: new Date().toISOString(),
        simulationMode,
      };
    }

    // Check scope applicability
    if (!this.isPolicyApplicable(policy, subjectType, subjectId, subjectData)) {
      return {
        id: generateId(),
        policyId,
        policyVersion: policy.version,
        subjectType,
        subjectId,
        applicability: 'NOT_APPLICABLE',
        conditionsEvaluated: [],
        controlsExecuted: [],
        status: 'NOT_APPLICABLE',
        reason: 'Policy scope does not apply to this subject',
        evidenceIds: [],
        timestamp: new Date().toISOString(),
        simulationMode,
      };
    }

    // Check for active exceptions
    const activeException = this.getActiveException(policyId, subjectType, subjectId);
    if (activeException) {
      return {
        id: generateId(),
        policyId,
        policyVersion: policy.version,
        subjectType,
        subjectId,
        applicability: 'APPLICABLE',
        conditionsEvaluated: [],
        controlsExecuted: [],
        status: 'NOT_APPLICABLE',
        reason: `Active exception: ${activeException.id}`,
        evidenceIds: activeException.evidenceIds,
        timestamp: new Date().toISOString(),
        simulationMode,
      };
    }

    // Evaluate conditions
    const conditionsEvaluated: ConditionEvaluation[] = policy.conditions.map(condition => {
      return this.evaluateCondition(condition, subjectData);
    });

    // Determine result based on conditions
    const allConditionsMet = conditionsEvaluated.every(c => c.result);
    const status = allConditionsMet ? 'PASS' : 'FAIL';

    const evaluation: PolicyEvaluationV2 = {
      id: generateId(),
      policyId,
      policyVersion: policy.version,
      subjectType,
      subjectId,
      applicability: 'APPLICABLE',
      conditionsEvaluated,
      controlsExecuted: [], // Controls will be executed separately
      status,
      reason: allConditionsMet
        ? 'All conditions met'
        : `Conditions not met: ${conditionsEvaluated.filter(c => !c.result).map(c => c.explanation).join(', ')}`,
      evidenceIds: [],
      timestamp: new Date().toISOString(),
      simulationMode,
    };

    // Generate evidence
    this.evidenceRepo.save({
      id: generateId(),
      type: 'POLICY_EVALUATION',
      subjectType,
      subjectId,
      actor: 'system:policy-service',
      timestamp: new Date().toISOString(),
      source: 'PolicyService.evaluatePolicy',
      metadata: {
        policyId,
        policyVersion: policy.version,
        status,
        simulationMode,
      },
    });

    // Generate audit event
    this.auditRepo.save({
      id: generateId(),
      actor: simulationMode ? 'system:policy-service:simulation' : 'system:policy-service',
      action: 'SCAN',
      resourceType: 'PolicyEvaluation',
      resourceId: evaluation.id,
      timestamp: new Date().toISOString(),
      details: {
        policyId,
        policyVersion: policy.version,
        subjectType,
        subjectId,
        status,
        simulationMode,
      },
    });

    return evaluation;
  }

  private isPolicyApplicable(
    policy: PolicyDefinition,
    subjectType: string,
    subjectId: string,
    subjectData: Record<string, unknown>
  ): boolean {
    if (policy.scope.length === 0) {
      return true; // No scope restrictions
    }

    // Check if any scope matches
    return policy.scope.some(scope => {
      switch (scope.type) {
        case 'ASSET_TYPE':
          return subjectData['type'] === scope.value;
        case 'ASSET':
          return subjectId === scope.value;
        case 'CLASSIFICATION':
          return subjectData['classification'] === scope.value;
        case 'SOURCE':
          return subjectData['sourceId'] === scope.value;
        default:
          return true;
      }
    });
  }

  private evaluateCondition(
    condition: PolicyDefinition['conditions'][0],
    subjectData: Record<string, unknown>
  ): ConditionEvaluation {
    const actualValue = subjectData[condition.field];
    let result = false;
    let explanation = '';

    switch (condition.operator) {
      case 'EQUALS':
        result = actualValue === condition.value;
        explanation = `${condition.field} ${result ? '==' : '!='} ${condition.value}`;
        break;
      case 'NOT_EQUALS':
        result = actualValue !== condition.value;
        explanation = `${condition.field} ${result ? '!=' : '=='} ${condition.value}`;
        break;
      case 'GREATER_THAN':
        result = typeof actualValue === 'number' && actualValue > (condition.value as number);
        explanation = `${condition.field} ${result ? '>' : '<='} ${condition.value}`;
        break;
      case 'LESS_THAN':
        result = typeof actualValue === 'number' && actualValue < (condition.value as number);
        explanation = `${condition.field} ${result ? '<' : '>='} ${condition.value}`;
        break;
      case 'EXISTS':
        result = actualValue !== undefined && actualValue !== null;
        explanation = `${condition.field} ${result ? 'exists' : 'does not exist'}`;
        break;
      case 'NOT_EXISTS':
        result = actualValue === undefined || actualValue === null;
        explanation = `${condition.field} ${result ? 'does not exist' : 'exists'}`;
        break;
      case 'IN':
        result = Array.isArray(condition.value) && condition.value.includes(actualValue);
        explanation = `${condition.field} ${result ? 'in' : 'not in'} [${condition.value}]`;
        break;
      case 'NOT_IN':
        result = Array.isArray(condition.value) && !condition.value.includes(actualValue);
        explanation = `${condition.field} ${result ? 'not in' : 'in'} [${condition.value}]`;
        break;
      default:
        result = false;
        explanation = `Operator ${condition.operator} not implemented`;
    }

    return {
      condition,
      result,
      actualValue,
      explanation,
    };
  }

  // ---- POLICY EXCEPTIONS ----

  requestException(exception: Omit<PolicyException, 'id' | 'status' | 'createdAt'>): PolicyException {
    const newException: PolicyException = {
      ...exception,
      id: generateId(),
      status: 'REQUESTED',
      createdAt: new Date().toISOString(),
    };

    this.exceptions.set(newException.id, newException);

    this.auditRepo.save({
      id: generateId(),
      actor: exception.requestedBy,
      action: 'CREATE',
      resourceType: 'PolicyException',
      resourceId: newException.id,
      timestamp: new Date().toISOString(),
      details: { policyId: exception.policyId, status: 'REQUESTED' },
    });

    return newException;
  }

  approveException(id: string, approvedBy: string): void {
    const exception = this.exceptions.get(id);
    if (!exception) {
      throw new Error(`Exception ${id} not found`);
    }

    exception.status = 'APPROVED';
    exception.approvedBy = approvedBy;

    this.auditRepo.save({
      id: generateId(),
      actor: approvedBy,
      action: 'UPDATE',
      resourceType: 'PolicyException',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { status: 'APPROVED' },
    });
  }

  rejectException(id: string, rejectedBy: string): void {
    const exception = this.exceptions.get(id);
    if (!exception) {
      throw new Error(`Exception ${id} not found`);
    }

    exception.status = 'REJECTED';

    this.auditRepo.save({
      id: generateId(),
      actor: rejectedBy,
      action: 'UPDATE',
      resourceType: 'PolicyException',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { status: 'REJECTED' },
    });
  }

  private getActiveException(policyId: string, subjectType: string, subjectId: string): PolicyException | undefined {
    const now = new Date().toISOString();
    
    for (const exception of this.exceptions.values()) {
      if (
        exception.policyId === policyId &&
        exception.subjectType === subjectType &&
        exception.subjectId === subjectId &&
        exception.status === 'APPROVED' &&
        exception.validFrom <= now &&
        (!exception.validUntil || exception.validUntil > now)
      ) {
        return exception;
      }
    }

    return undefined;
  }
}
