// ============================================================
// AGENTS — Governance Orchestrator
// ============================================================

import type { Agent, AgentRun, AgentEvent, AgentStatus, EventBus } from './types';
import type { AgentRegistry } from './registry';
import { generateId } from '../lib/utils';

export class GovernanceOrchestrator {
  constructor(
    private registry: AgentRegistry,
    private eventBus: EventBus
  ) {}

  async orchestrate(trigger: string, context: Record<string, unknown>): Promise<string> {
    const correlationId = generateId();
    
    // Publish orchestration start event
    await this.eventBus.publish({
      id: generateId(),
      type: 'ORCHESTRATION_STARTED',
      source: 'governance-orchestrator',
      subjectType: 'Orchestration',
      subjectId: correlationId,
      timestamp: new Date().toISOString(),
      correlationId,
      payloadReference: trigger,
    });

    // Determine execution order based on dependencies
    const executionOrder = this.determineExecutionOrder(trigger);
    
    let previousOutputs: Record<string, unknown> = { ...context };
    const allEvidenceIds: string[] = [];
    const allAuditEventIds: string[] = [];

    for (const agentId of executionOrder) {
      const agent = this.registry.get(agentId);
      if (!agent) continue;

      // Check if dependencies succeeded
      const dependencies = this.registry.getDependencies(agentId);
      const failedDeps = dependencies.filter(dep => dep.definition.status === 'FAILED');
      
      if (failedDeps.length > 0 && agent.definition.failurePolicy.blockDownstream) {
        this.registry.updateAgentStatus(agentId, 'BLOCKED');
        continue;
      }

      // Execute agent
      const run = this.registry.createRun(agentId, trigger, correlationId);
      this.registry.updateAgentStatus(agentId, 'RUNNING');

      try {
        const startTime = Date.now();
        const result = await agent.execute({
          correlationId,
          trigger,
          inputs: previousOutputs,
          eventBus: this.eventBus,
        });
        const duration = Date.now() - startTime;

        // Update run
        this.registry.updateRun(run.id, {
          status: result.success ? 'COMPLETED' : 'FAILED',
          completedAt: new Date().toISOString(),
          outputReferences: Object.keys(result.outputs),
          evidenceIds: result.evidenceIds,
          auditEventIds: result.auditEventIds,
          error: result.error,
        });

        // Update agent status and metrics
        this.registry.updateAgentStatus(agentId, result.success ? 'COMPLETED' : 'FAILED');
        this.registry.updateAgentMetrics(agentId, duration, result.success);

        // Collect outputs for next agents
        previousOutputs = { ...previousOutputs, ...result.outputs };
        allEvidenceIds.push(...result.evidenceIds);
        allAuditEventIds.push(...result.auditEventIds);

        // Publish agent completion event
        await this.eventBus.publish({
          id: generateId(),
          type: result.success ? 'AGENT_COMPLETED' : 'AGENT_FAILED',
          source: agentId,
          subjectType: 'AgentRun',
          subjectId: run.id,
          timestamp: new Date().toISOString(),
          correlationId,
        });

        // Handle human review requirement
        if (result.requiresHumanReview) {
          this.registry.updateAgentStatus(agentId, 'NEEDS_REVIEW');
          await this.eventBus.publish({
            id: generateId(),
            type: 'HUMAN_REVIEW_REQUIRED',
            source: agentId,
            subjectType: 'AgentRun',
            subjectId: run.id,
            timestamp: new Date().toISOString(),
            correlationId,
            payloadReference: result.reviewReason,
          });
        }

        // Stop if critical failure
        if (!result.success && agent.definition.failurePolicy.blockDownstream) {
          break;
        }
      } catch (error) {
        this.registry.updateRun(run.id, {
          status: 'FAILED',
          completedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        });
        this.registry.updateAgentStatus(agentId, 'FAILED');

        await this.eventBus.publish({
          id: generateId(),
          type: 'AGENT_FAILED',
          source: agentId,
          subjectType: 'AgentRun',
          subjectId: run.id,
          timestamp: new Date().toISOString(),
          correlationId,
        });

        if (agent.definition.failurePolicy.blockDownstream) {
          break;
        }
      }
    }

    // Publish orchestration completion event
    await this.eventBus.publish({
      id: generateId(),
      type: 'ORCHESTRATION_COMPLETED',
      source: 'governance-orchestrator',
      subjectType: 'Orchestration',
      subjectId: correlationId,
      timestamp: new Date().toISOString(),
      correlationId,
    });

    return correlationId;
  }

  private determineExecutionOrder(trigger: string): string[] {
    // Simplified execution order based on trigger
    // In production, this would use topological sort based on dependencies
    
    const allAgents = this.registry.getAll();
    const order: string[] = [];
    const visited = new Set<string>();

    const visit = (agentId: string) => {
      if (visited.has(agentId)) return;
      visited.add(agentId);

      const agent = this.registry.get(agentId);
      if (!agent) return;

      // Visit dependencies first
      for (const depId of agent.definition.dependencies) {
        visit(depId);
      }

      order.push(agentId);
    };

    // Start with agents that match the trigger
    for (const agent of allAgents) {
      if (agent.definition.trigger === 'EVENT' || agent.definition.trigger === 'MANUAL') {
        visit(agent.definition.agentId);
      }
    }

    return order;
  }

  async getOrchestrationStatus(correlationId: string): Promise<{
    runs: AgentRun[];
    events: AgentEvent[];
  }> {
    const allRuns = this.registry.getAllRuns();
    const runs = allRuns.filter(r => r.correlationId === correlationId);
    
    const events = await this.eventBus.getEventsByCorrelationId(correlationId);

    return { runs, events };
  }
}
