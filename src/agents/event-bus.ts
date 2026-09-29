// ============================================================
// AGENTS — In-Memory Event Bus
// ============================================================

import type { EventBus, AgentEvent } from './types';

export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, Set<(event: AgentEvent) => Promise<void>>> = new Map();
  private eventHistory: AgentEvent[] = [];
  private maxHistory: number = 1000;

  async publish(event: AgentEvent): Promise<void> {
    this.eventHistory.push(event);
    
    // Trim history if needed
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistory);
    }

    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error(`[EventBus] Handler error for ${event.type}:`, error);
        }
      }
    }
  }

  subscribe(eventType: string, handler: (event: AgentEvent) => Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  unsubscribe(eventType: string, handler: (event: AgentEvent) => Promise<void>): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  getEventHistory(limit: number = 100): AgentEvent[] {
    return this.eventHistory.slice(-limit);
  }

  getEventsByType(type: string): AgentEvent[] {
    return this.eventHistory.filter(e => e.type === type);
  }

  getEventsByCorrelationId(correlationId: string): AgentEvent[] {
    return this.eventHistory.filter(e => e.correlationId === correlationId);
  }

  clear(): void {
    this.eventHistory = [];
    this.handlers.clear();
  }
}

// ============================================================
// AGENTS — Manual Scheduler
// ============================================================

import type { Scheduler, ScheduledTask } from './types';

export class ManualScheduler implements Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();

  async schedule(agentId: string, cronExpression: string): Promise<void> {
    const task: ScheduledTask = {
      agentId,
      cronExpression,
      nextRun: new Date().toISOString(), // Simplified
      enabled: true,
    };
    this.tasks.set(agentId, task);
  }

  async cancel(agentId: string): Promise<void> {
    this.tasks.delete(agentId);
  }

  async list(): Promise<ScheduledTask[]> {
    return Array.from(this.tasks.values());
  }

  isEnabled(agentId: string): boolean {
    const task = this.tasks.get(agentId);
    return task?.enabled ?? false;
  }
}
