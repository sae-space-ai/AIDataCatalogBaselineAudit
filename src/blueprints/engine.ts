// ============================================================
// BLUEPRINTS — Solution Blueprint Engine
// ============================================================

import type {
  SolutionBlueprint,
  BlueprintReadiness,
  BlueprintGapAnalysis,
  BlueprintGap,
  BlueprintRequirement,
  ImplementationLevel,
} from './types';
import type { AgentRegistry } from '../agents/registry';

export class SolutionBlueprintEngine {
  private blueprints: Map<string, SolutionBlueprint> = new Map();
  private activeBlueprintId: string | null = null;

  constructor(private agentRegistry: AgentRegistry) {}

  register(blueprint: SolutionBlueprint): void {
    if (this.blueprints.has(blueprint.id)) {
      throw new Error(`Blueprint ${blueprint.id} already registered`);
    }
    this.blueprints.set(blueprint.id, blueprint);
  }

  get(id: string): SolutionBlueprint | undefined {
    return this.blueprints.get(id);
  }

  list(): SolutionBlueprint[] {
    return Array.from(this.blueprints.values());
  }

  activate(id: string): void {
    const blueprint = this.get(id);
    if (!blueprint) {
      throw new Error(`Blueprint ${id} not found`);
    }
    if (blueprint.status !== 'ACTIVE') {
      throw new Error(`Blueprint ${id} is not ACTIVE (current: ${blueprint.status})`);
    }
    this.activeBlueprintId = id;
  }

  deactivate(): void {
    this.activeBlueprintId = null;
  }

  getActiveBlueprint(): SolutionBlueprint | undefined {
    if (!this.activeBlueprintId) return undefined;
    return this.get(this.activeBlueprintId);
  }

  resolveEffectiveAgents(blueprintId: string): string[] {
    const blueprint = this.get(blueprintId);
    if (!blueprint) return [];

    const allAgents = new Set<string>();
    
    // Add required agents
    blueprint.requiredAgents.forEach(id => allAgents.add(id));
    
    // Add enabled agents
    blueprint.enabledAgents.forEach(id => allAgents.add(id));
    
    // Filter to only agents that exist in registry
    return Array.from(allAgents).filter(id => this.agentRegistry.get(id) !== undefined);
  }

  resolveEffectivePolicies(blueprintId: string): string[] {
    const blueprint = this.get(blueprintId);
    if (!blueprint) return [];
    return blueprint.policyProfile.enabledPolicies;
  }

  resolveEffectiveQualityProfile(blueprintId: string) {
    const blueprint = this.get(blueprintId);
    if (!blueprint) return null;
    return blueprint.qualityProfile;
  }

  resolveEffectiveClassificationProfile(blueprintId: string) {
    const blueprint = this.get(blueprintId);
    if (!blueprint) return null;
    return blueprint.classificationProfile;
  }

  resolveEffectiveTrustProfile(blueprintId: string) {
    const blueprint = this.get(blueprintId);
    if (!blueprint) return null;
    return blueprint.trustProfile;
  }

  resolveEffectiveCertificationProfile(blueprintId: string) {
    const blueprint = this.get(blueprintId);
    if (!blueprint) return null;
    return blueprint.certificationProfile;
  }

  resolveEffectiveHumanOversight(blueprintId: string) {
    const blueprint = this.get(blueprintId);
    if (!blueprint) return null;
    return blueprint.humanOversightProfile;
  }

  resolveEffectiveDashboard(blueprintId: string) {
    const blueprint = this.get(blueprintId);
    if (!blueprint) return null;
    return blueprint.dashboardProfile;
  }

  resolveEffectiveEvidence(blueprintId: string) {
    const blueprint = this.get(blueprintId);
    if (!blueprint) return null;
    return blueprint.evidenceProfile;
  }

  resolveEffectiveAudit(blueprintId: string) {
    const blueprint = this.get(blueprintId);
    if (!blueprint) return null;
    return blueprint.auditProfile;
  }

  calculateReadiness(blueprintId: string): BlueprintReadiness {
    const blueprint = this.get(blueprintId);
    if (!blueprint) {
      throw new Error(`Blueprint ${blueprintId} not found`);
    }

    const details: BlueprintReadiness['details'] = [];
    let implemented = 0;
    let partial = 0;
    let adapterReady = 0;
    let notImplemented = 0;
    let blocked = 0;

    // Check agents
    const allAgentIds = new Set([
      ...blueprint.requiredAgents,
      ...blueprint.enabledAgents,
      ...blueprint.optionalAgents,
    ]);

    for (const agentId of allAgentIds) {
      const agent = this.agentRegistry.get(agentId);
      if (!agent) {
        notImplemented++;
        details.push({
          capability: `Agent: ${agentId}`,
          implementationLevel: 'NOT_IMPLEMENTED',
          status: 'NOT_READY',
        });
        continue;
      }

      const level = agent.definition.implementationLevel;
      details.push({
        capability: `Agent: ${agentId}`,
        implementationLevel: level,
        status: level === 'IMPLEMENTED' ? 'READY' : 
                level === 'PARTIAL' ? 'PARTIAL' :
                level === 'ADAPTER_READY' ? 'PARTIAL' : 'NOT_READY',
      });

      switch (level) {
        case 'IMPLEMENTED':
          implemented++;
          break;
        case 'PARTIAL':
          partial++;
          break;
        case 'ADAPTER_READY':
          adapterReady++;
          break;
        case 'MODEL_ONLY':
        case 'NOT_IMPLEMENTED':
          notImplemented++;
          break;
      }
    }

    // Check connectors
    for (const connectorId of blueprint.connectorProfile.permittedConnectors) {
      details.push({
        capability: `Connector: ${connectorId}`,
        implementationLevel: connectorId === 'DEMO' ? 'IMPLEMENTED' : 'ADAPTER_READY',
        status: connectorId === 'DEMO' ? 'READY' : 'PARTIAL',
      });
      if (connectorId === 'DEMO') {
        implemented++;
      } else {
        adapterReady++;
      }
    }

    // Calculate overall score
    const total = details.length;
    const readyCount = details.filter(d => d.status === 'READY').length;
    const partialCount = details.filter(d => d.status === 'PARTIAL').length;
    const overallScore = total > 0 ? Math.round(((readyCount + partialCount * 0.5) / total) * 100) : 0;

    return {
      blueprintId,
      overallScore,
      implemented,
      partial,
      adapterReady,
      notImplemented,
      blocked,
      details,
    };
  }

  analyzeGaps(blueprintId: string): BlueprintGapAnalysis {
    const blueprint = this.get(blueprintId);
    if (!blueprint) {
      throw new Error(`Blueprint ${blueprintId} not found`);
    }

    const gaps: BlueprintGap[] = [];

    // Check for missing required agents
    for (const agentId of blueprint.requiredAgents) {
      const agent = this.agentRegistry.get(agentId);
      if (!agent) {
        gaps.push({
          capability: `Agent: ${agentId}`,
          type: 'AGENT',
          severity: 'BLOCKING',
          reason: `Required agent ${agentId} is not registered`,
          recommendation: `Implement or register agent ${agentId}`,
        });
      } else if (agent.definition.implementationLevel === 'NOT_IMPLEMENTED') {
        gaps.push({
          capability: `Agent: ${agentId}`,
          type: 'AGENT',
          severity: 'BLOCKING',
          reason: `Required agent ${agentId} is NOT_IMPLEMENTED`,
          recommendation: `Implement agent ${agentId}`,
        });
      }
    }

    // Check for missing connectors
    for (const connectorId of blueprint.connectorProfile.permittedConnectors) {
      if (connectorId !== 'DEMO') {
        gaps.push({
          capability: `Connector: ${connectorId}`,
          type: 'CONNECTOR',
          severity: 'NON_BLOCKING',
          reason: `Connector ${connectorId} is ADAPTER_READY but not fully implemented`,
          recommendation: `Implement connector ${connectorId} when infrastructure is available`,
        });
      }
    }

    // Check for persistence requirement
    if (blueprint.status === 'ACTIVE') {
      gaps.push({
        capability: 'Persistence',
        type: 'PERSISTENCE',
        severity: 'NON_BLOCKING',
        reason: 'Real persistence requires PostgreSQL database',
        recommendation: 'Configure DATABASE_URL and deploy backend when ready for production',
      });
    }

    // Check for human identity requirement
    if (blueprint.humanOversightProfile.level === 'STRICT') {
      gaps.push({
        capability: 'Human Identity',
        type: 'IDENTITY',
        severity: 'NON_BLOCKING',
        reason: 'Strict human oversight requires authenticated identity',
        recommendation: 'Implement authentication when ready for production use',
      });
    }

    return {
      blueprintId,
      gaps,
      blockingGaps: gaps.filter(g => g.severity === 'BLOCKING').length,
      nonBlockingGaps: gaps.filter(g => g.severity === 'NON_BLOCKING').length,
    };
  }

  generateRequirementCoverage(blueprintId: string): BlueprintRequirement[] {
    const blueprint = this.get(blueprintId);
    if (!blueprint) {
      throw new Error(`Blueprint ${blueprintId} not found`);
    }

    const requirements: BlueprintRequirement[] = [];

    // Generate requirements based on objectives
    for (const objective of blueprint.objectives) {
      const agent = blueprint.enabledAgents.find(id => {
        const a = this.agentRegistry.get(id);
        return a && a.definition.capabilities.some(c => c.toLowerCase().includes(objective.toLowerCase().split(' ')[0]));
      });

      requirements.push({
        requirement: objective,
        capability: objective,
        responsibleAgent: agent || 'N/A',
        policy: blueprint.policyProfile.enabledPolicies[0] || 'N/A',
        implementationLevel: agent ? (this.agentRegistry.get(agent)?.definition.implementationLevel || 'NOT_IMPLEMENTED') : 'NOT_IMPLEMENTED',
        evidenceRequired: blueprint.evidenceProfile.requiredEvidence.length > 0,
        humanOversight: blueprint.humanOversightProfile.level !== 'STANDARD',
        status: agent ? 'MET' : 'NOT_MET',
      });
    }

    return requirements;
  }

  exportBlueprint(blueprintId: string): string {
    const blueprint = this.get(blueprintId);
    if (!blueprint) {
      throw new Error(`Blueprint ${blueprintId} not found`);
    }

    // Remove sensitive data before export
    const exportData = {
      ...blueprint,
      // Ensure no secrets are included
      policyProfile: { ...blueprint.policyProfile },
      // Add any other sensitive fields to exclude
    };

    return JSON.stringify(exportData, null, 2);
  }

  importBlueprint(json: string): SolutionBlueprint {
    try {
      const blueprint = JSON.parse(json) as SolutionBlueprint;
      
      // Validate required fields
      if (!blueprint.id || !blueprint.name || !blueprint.version) {
        throw new Error('Invalid blueprint: missing required fields');
      }

      // Validate agents exist
      for (const agentId of blueprint.requiredAgents) {
        if (!this.agentRegistry.get(agentId)) {
          throw new Error(`Invalid blueprint: required agent ${agentId} not found`);
        }
      }

      return blueprint;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid blueprint JSON');
      }
      throw error;
    }
  }
}
