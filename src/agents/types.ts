// ============================================================
// AGENTS — Core Types
// ============================================================

export type AgentStatus = 'IDLE' | 'RUNNING' | 'WAITING' | 'NEEDS_REVIEW' | 'COMPLETED' | 'FAILED' | 'BLOCKED';

export type AgentExecutionMode = 'MANUAL' | 'AUTOMATIC' | 'SCHEDULED';

export type ImplementationLevel = 'IMPLEMENTED' | 'PARTIAL' | 'MODEL_ONLY' | 'ADAPTER_READY' | 'NOT_IMPLEMENTED';

export type HumanReviewTaskStatus = 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'REJECTED' | 'CANCELLED';

export type AgentPermission = 'READ' | 'WRITE';

export interface AgentDefinition {
  agentId: string;
  name: string;
  mission: string;
  capabilities: string[];
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  permissions: Record<string, AgentPermission[]>;
  trigger: 'MANUAL' | 'EVENT' | 'SCHEDULED';
  executionMode: AgentExecutionMode;
  status: AgentStatus;
  lastRun?: string;
  metrics: AgentMetrics;
  evidenceProduced: number;
  auditEventsProduced: number;
  humanOversightRequired: boolean;
  failurePolicy: FailurePolicy;
  implementationLevel: ImplementationLevel;
}

export interface AgentMetrics {
  runs: number;
  successes: number;
  failures: number;
  blocked: number;
  needsReview: number;
  averageDuration: number;
  lastSuccessfulRun?: string;
}

export interface FailurePolicy {
  maxRetries: number;
  retryDelay: number;
  escalateAfterRetries: boolean;
  blockDownstream: boolean;
}

export interface AgentRun {
  id: string;
  agentId: string;
  trigger: string;
  status: AgentStatus;
  startedAt: string;
  completedAt?: string;
  inputReferences: string[];
  outputReferences: string[];
  evidenceIds: string[];
  auditEventIds: string[];
  error?: string;
  retryCount: number;
  correlationId: string;
}

export interface AgentEvent {
  id: string;
  type: string;
  source: string;
  subjectType: string;
  subjectId: string;
  timestamp: string;
  correlationId: string;
  payloadReference?: string;
}

export interface HumanReviewTask {
  id: string;
  type: string;
  subjectType: string;
  subjectId: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: HumanReviewTaskStatus;
  createdAt: string;
  assignedTo?: string;
  resolvedAt?: string;
  decision?: string;
  evidenceIds: string[];
}

export interface EventBus {
  publish(event: AgentEvent): Promise<void>;
  subscribe(eventType: string, handler: (event: AgentEvent) => Promise<void>): void;
  unsubscribe(eventType: string, handler: (event: AgentEvent) => Promise<void>): void;
  getEventsByCorrelationId(correlationId: string): AgentEvent[];
}

export interface Scheduler {
  schedule(agentId: string, cronExpression: string): Promise<void>;
  cancel(agentId: string): Promise<void>;
  list(): Promise<ScheduledTask[]>;
}

export interface ScheduledTask {
  agentId: string;
  cronExpression: string;
  nextRun: string;
  enabled: boolean;
}

export interface Agent {
  definition: AgentDefinition;
  execute(context: AgentExecutionContext): Promise<AgentExecutionResult>;
}

export interface AgentExecutionContext {
  correlationId: string;
  trigger: string;
  inputs: Record<string, unknown>;
  eventBus: EventBus;
}

export interface AgentExecutionResult {
  success: boolean;
  outputs: Record<string, unknown>;
  evidenceIds: string[];
  auditEventIds: string[];
  error?: string;
  requiresHumanReview?: boolean;
  reviewReason?: string;
}
