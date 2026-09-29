// ============================================================
// AGENTS — Registry
// ============================================================

import type { Agent, AgentDefinition, AgentRun, AgentEvent, AgentStatus, ImplementationLevel } from './types';
import { generateId } from '../lib/utils';

export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private runs: Map<string, AgentRun> = new Map();

  register(agent: Agent): void {
    if (this.agents.has(agent.definition.agentId)) {
      throw new Error(`Agent ${agent.definition.agentId} already registered`);
    }
    this.agents.set(agent.definition.agentId, agent);
  }

  unregister(agentId: string): void {
    this.agents.delete(agentId);
  }

  get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  getByImplementationLevel(level: ImplementationLevel): Agent[] {
    return this.getAll().filter(a => a.definition.implementationLevel === level);
  }

  getDependencies(agentId: string): Agent[] {
    const agent = this.get(agentId);
    if (!agent) return [];
    return agent.definition.dependencies
      .map(depId => this.get(depId))
      .filter((a): a is Agent => a !== undefined);
  }

  getDependents(agentId: string): Agent[] {
    return this.getAll().filter(a => 
      a.definition.dependencies.includes(agentId)
    );
  }

  createRun(agentId: string, trigger: string, correlationId: string): AgentRun {
    const run: AgentRun = {
      id: generateId(),
      agentId,
      trigger,
      status: 'IDLE',
      startedAt: new Date().toISOString(),
      inputReferences: [],
      outputReferences: [],
      evidenceIds: [],
      auditEventIds: [],
      retryCount: 0,
      correlationId,
    };
    this.runs.set(run.id, run);
    return run;
  }

  updateRun(runId: string, updates: Partial<AgentRun>): AgentRun | undefined {
    const run = this.runs.get(runId);
    if (!run) return undefined;
    const updated = { ...run, ...updates };
    this.runs.set(runId, updated);
    return updated;
  }

  getRun(runId: string): AgentRun | undefined {
    return this.runs.get(runId);
  }

  getRunsByAgent(agentId: string): AgentRun[] {
    return Array.from(this.runs.values())
      .filter(r => r.agentId === agentId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  getAllRuns(): AgentRun[] {
    return Array.from(this.runs.values())
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  updateAgentStatus(agentId: string, status: AgentStatus): void {
    const agent = this.get(agentId);
    if (agent) {
      agent.definition.status = status;
      if (status === 'COMPLETED' || status === 'FAILED') {
        agent.definition.lastRun = new Date().toISOString();
      }
    }
  }

  updateAgentMetrics(agentId: string, duration: number, success: boolean): void {
    const agent = this.get(agentId);
    if (!agent) return;

    const metrics = agent.definition.metrics;
    metrics.runs++;
    
    if (success) {
      metrics.successes++;
      metrics.lastSuccessfulRun = new Date().toISOString();
    } else {
      metrics.failures++;
    }

    // Update average duration
    const totalDuration = metrics.averageDuration * (metrics.runs - 1) + duration;
    metrics.averageDuration = totalDuration / metrics.runs;
  }
}
