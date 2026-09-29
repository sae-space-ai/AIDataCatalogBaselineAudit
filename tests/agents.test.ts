// ============================================================
// TESTS — Agent Architecture
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry } from '../src/agents/registry';
import { InMemoryEventBus, ManualScheduler } from '../src/agents/event-bus';
import { GovernanceOrchestrator } from '../src/agents/orchestrator';
import type { Agent, AgentDefinition, AgentExecutionContext, AgentExecutionResult } from '../src/agents/types';

// Mock agent for testing
class MockAgent implements Agent {
  definition: AgentDefinition = {
    agentId: 'mock-agent',
    name: 'Mock Agent',
    mission: 'Test agent',
    capabilities: ['test'],
    inputs: [],
    outputs: [],
    dependencies: [],
    permissions: {},
    trigger: 'MANUAL',
    executionMode: 'AUTOMATIC',
    status: 'IDLE',
    metrics: { runs: 0, successes: 0, failures: 0, blocked: 0, needsReview: 0, averageDuration: 0 },
    evidenceProduced: 0,
    auditEventsProduced: 0,
    humanOversightRequired: false,
    failurePolicy: { maxRetries: 1, retryDelay: 1000, escalateAfterRetries: false, blockDownstream: false },
    implementationLevel: 'IMPLEMENTED',
  };

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    return {
      success: true,
      outputs: { result: 'success' },
      evidenceIds: [],
      auditEventIds: [],
    };
  }
}

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  it('should register an agent', () => {
    const agent = new MockAgent();
    registry.register(agent);
    expect(registry.get('mock-agent')).toBeDefined();
  });

  it('should prevent duplicate registration', () => {
    const agent = new MockAgent();
    registry.register(agent);
    expect(() => registry.register(agent)).toThrow();
  });

  it('should unregister an agent', () => {
    const agent = new MockAgent();
    registry.register(agent);
    registry.unregister('mock-agent');
    expect(registry.get('mock-agent')).toBeUndefined();
  });

  it('should get all agents', () => {
    const agent1 = new MockAgent();
    const agent2 = new MockAgent();
    agent2.definition.agentId = 'mock-agent-2';
    
    registry.register(agent1);
    registry.register(agent2);
    
    expect(registry.getAll().length).toBe(2);
  });

  it('should create and track agent runs', () => {
    const agent = new MockAgent();
    registry.register(agent);
    
    const run = registry.createRun('mock-agent', 'MANUAL', 'corr-123');
    expect(run.agentId).toBe('mock-agent');
    expect(run.status).toBe('IDLE');
    
    registry.updateRun(run.id, { status: 'COMPLETED' });
    const updatedRun = registry.getRun(run.id);
    expect(updatedRun?.status).toBe('COMPLETED');
  });

  it('should update agent metrics', () => {
    const agent = new MockAgent();
    registry.register(agent);
    
    registry.updateAgentMetrics('mock-agent', 100, true);
    registry.updateAgentMetrics('mock-agent', 200, false);
    
    const updatedAgent = registry.get('mock-agent');
    expect(updatedAgent?.definition.metrics.runs).toBe(2);
    expect(updatedAgent?.definition.metrics.successes).toBe(1);
    expect(updatedAgent?.definition.metrics.failures).toBe(1);
  });
});

describe('InMemoryEventBus', () => {
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    eventBus = new InMemoryEventBus();
  });

  it('should publish and track events', async () => {
    const event = {
      id: 'evt-1',
      type: 'TEST_EVENT',
      source: 'test',
      subjectType: 'Test',
      subjectId: 'test-1',
      timestamp: new Date().toISOString(),
      correlationId: 'corr-1',
    };

    await eventBus.publish(event);
    
    const history = eventBus.getEventHistory();
    expect(history.length).toBe(1);
    expect(history[0].type).toBe('TEST_EVENT');
  });

  it('should subscribe to events', async () => {
    let received = false;
    
    eventBus.subscribe('TEST_EVENT', async () => {
      received = true;
    });

    await eventBus.publish({
      id: 'evt-1',
      type: 'TEST_EVENT',
      source: 'test',
      subjectType: 'Test',
      subjectId: 'test-1',
      timestamp: new Date().toISOString(),
      correlationId: 'corr-1',
    });

    expect(received).toBe(true);
  });

  it('should filter events by correlation ID', async () => {
    await eventBus.publish({
      id: 'evt-1',
      type: 'TEST_EVENT',
      source: 'test',
      subjectType: 'Test',
      subjectId: 'test-1',
      timestamp: new Date().toISOString(),
      correlationId: 'corr-1',
    });

    await eventBus.publish({
      id: 'evt-2',
      type: 'TEST_EVENT',
      source: 'test',
      subjectType: 'Test',
      subjectId: 'test-2',
      timestamp: new Date().toISOString(),
      correlationId: 'corr-2',
    });

    const events = eventBus.getEventsByCorrelationId('corr-1');
    expect(events.length).toBe(1);
  });
});

describe('ManualScheduler', () => {
  let scheduler: ManualScheduler;

  beforeEach(() => {
    scheduler = new ManualScheduler();
  });

  it('should schedule tasks', async () => {
    await scheduler.schedule('agent-1', '0 * * * *');
    const tasks = await scheduler.list();
    expect(tasks.length).toBe(1);
    expect(tasks[0].agentId).toBe('agent-1');
  });

  it('should cancel tasks', async () => {
    await scheduler.schedule('agent-1', '0 * * * *');
    await scheduler.cancel('agent-1');
    const tasks = await scheduler.list();
    expect(tasks.length).toBe(0);
  });
});

describe('GovernanceOrchestrator', () => {
  let registry: AgentRegistry;
  let eventBus: InMemoryEventBus;
  let orchestrator: GovernanceOrchestrator;

  beforeEach(() => {
    registry = new AgentRegistry();
    eventBus = new InMemoryEventBus();
    orchestrator = new GovernanceOrchestrator(registry, eventBus);
  });

  it('should orchestrate agent execution', async () => {
    const agent = new MockAgent();
    registry.register(agent);

    const correlationId = await orchestrator.orchestrate('TEST_TRIGGER', {});
    expect(correlationId).toBeDefined();

    const status = await orchestrator.getOrchestrationStatus(correlationId);
    expect(status.runs.length).toBeGreaterThan(0);
  });

  it('should respect agent dependencies', async () => {
    const agent1 = new MockAgent();
    agent1.definition.agentId = 'agent-1';
    
    const agent2 = new MockAgent();
    agent2.definition.agentId = 'agent-2';
    agent2.definition.dependencies = ['agent-1'];

    registry.register(agent1);
    registry.register(agent2);

    const correlationId = await orchestrator.orchestrate('TEST_TRIGGER', {});
    const status = await orchestrator.getOrchestrationStatus(correlationId);

    // Both agents should have run
    expect(status.runs.length).toBe(2);
  });
});
