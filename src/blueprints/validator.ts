// ============================================================
// BLUEPRINTS — Validator
// ============================================================

import type { SolutionBlueprint } from './types';
import type { AgentRegistry } from '../agents/registry';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class BlueprintValidator {
  constructor(private agentRegistry: AgentRegistry) {}

  validate(blueprint: SolutionBlueprint): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!blueprint.id) errors.push('Blueprint ID is required');
    if (!blueprint.name) errors.push('Blueprint name is required');
    if (!blueprint.version) errors.push('Blueprint version is required');
    if (!blueprint.description) warnings.push('Blueprint description is recommended');

    // Validate status
    const validStatuses = ['DRAFT', 'ACTIVE', 'DISABLED', 'DEPRECATED'];
    if (!validStatuses.includes(blueprint.status)) {
      errors.push(`Invalid status: ${blueprint.status}`);
    }

    // Validate agents
    for (const agentId of blueprint.requiredAgents) {
      const agent = this.agentRegistry.get(agentId);
      if (!agent) {
        errors.push(`Required agent ${agentId} not found in registry`);
      }
    }

    for (const agentId of blueprint.enabledAgents) {
      const agent = this.agentRegistry.get(agentId);
      if (!agent) {
        warnings.push(`Enabled agent ${agentId} not found in registry`);
      }
    }

    // Validate trust weights sum to 1.0
    const weights = blueprint.trustProfile.weights;
    const weightSum = 
      weights.metadataCompleteness +
      weights.qualityScore +
      weights.classificationConfidence +
      weights.lineageAvailability +
      weights.reviewStatus;

    if (Math.abs(weightSum - 1.0) > 0.01) {
      errors.push(`Trust weights must sum to 1.0 (current: ${weightSum})`);
    }

    // Validate quality thresholds
    for (const [dimension, threshold] of Object.entries(blueprint.qualityProfile.thresholds)) {
      if (threshold < 0 || threshold > 1) {
        errors.push(`Quality threshold for ${dimension} must be between 0 and 1`);
      }
    }

    // Validate certification requirements
    if (blueprint.certificationProfile.requirements.qualityThreshold < 0 ||
        blueprint.certificationProfile.requirements.qualityThreshold > 100) {
      errors.push('Certification quality threshold must be between 0 and 100');
    }

    // Validate dashboard widgets
    const validWidgets = [
      'Assets', 'Sources', 'Sensitive Data', 'Quality', 'Trust',
      'Lineage', 'Pending Reviews', 'Policies', 'Evidence', 'Audit',
      'Training Data', 'RAG Resources', 'Drift', 'Certification', 'Agent Operations'
    ];

    for (const widget of blueprint.dashboardProfile.visibleWidgets) {
      if (!validWidgets.includes(widget)) {
        warnings.push(`Unknown dashboard widget: ${widget}`);
      }
    }

    // Validate human oversight level
    const validLevels = ['STANDARD', 'HIGH', 'STRICT'];
    if (!validLevels.includes(blueprint.humanOversightProfile.level)) {
      errors.push(`Invalid human oversight level: ${blueprint.humanOversightProfile.level}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  canActivate(blueprint: SolutionBlueprint): boolean {
    const result = this.validate(blueprint);
    return result.valid && blueprint.status === 'ACTIVE';
  }
}
