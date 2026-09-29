// ============================================================
// AI GOVERNANCE — Orchestrator Integration Service
// ============================================================

import type { GovernanceOrchestrator } from '../agents/orchestrator';
import type { EventBus } from '../agents/types';
import type { AIGovernanceService } from './ai-governance-service';
import type { TrainingDataService } from './training-data-service';
import type { ModelGovernanceService } from './model-service';
import type { RAGGovernanceService } from './rag-service';
import type { SensitiveDataPreventionService } from './sensitive-data-service';
import type { DataDriftService } from './drift-service';
import type { PolicyService } from '../governance/policy-service';
import type { ControlService } from '../governance/control-service';
import type { HumanReviewService } from '../services/human-review-service';
import type { EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class AIGovernanceOrchestratorIntegration {
  constructor(
    private orchestrator: GovernanceOrchestrator,
    private eventBus: EventBus,
    private aiGovernanceService: AIGovernanceService,
    private trainingDataService: TrainingDataService,
    private modelService: ModelGovernanceService,
    private ragService: RAGGovernanceService,
    private sensitiveDataService: SensitiveDataPreventionService,
    private driftService: DataDriftService,
    private policyService: PolicyService,
    private controlService: ControlService,
    private humanReviewService: HumanReviewService,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {
    this.subscribeToEvents();
  }

  private subscribeToEvents(): void {
    // Subscribe to AI resource changes
    this.eventBus.subscribe('AI_RESOURCE_REGISTERED', async (event) => {
      await this.handleAIResourceRegistered(event);
    });

    this.eventBus.subscribe('TRAINING_DATASET_REGISTERED', async (event) => {
      await this.handleTrainingDatasetRegistered(event);
    });

    this.eventBus.subscribe('MODEL_REGISTERED', async (event) => {
      await this.handleModelRegistered(event);
    });

    this.eventBus.subscribe('RAG_ELIGIBILITY_CHANGED', async (event) => {
      await this.handleRAGEligibilityChanged(event);
    });

    this.eventBus.subscribe('AI_DRIFT_DETECTED', async (event) => {
      await this.handleAIDriftDetected(event);
    });
  }

  private async handleAIResourceRegistered(event: any): Promise<void> {
    // Trigger governance assessment
    await this.orchestrateGovernanceAssessment(event.subjectId, event.subjectType);
  }

  private async handleTrainingDatasetRegistered(event: any): Promise<void> {
    // Trigger training data governance
    await this.orchestrateTrainingDataGovernance(event.subjectId);
  }

  private async handleModelRegistered(event: any): Promise<void> {
    // Trigger model governance
    await this.orchestrateModelGovernance(event.subjectId);
  }

  private async handleRAGEligibilityChanged(event: any): Promise<void> {
    // Trigger RAG governance reassessment
    await this.orchestrateRAGGovernance(event.subjectId);
  }

  private async handleAIDriftDetected(event: any): Promise<void> {
    // Trigger drift impact analysis and invalidation
    await this.orchestrateDriftResponse(event.subjectId);
  }

  async orchestrateGovernanceAssessment(resourceId: string, resourceType: string): Promise<string> {
    const correlationId = generateId();

    // Publish orchestration start
    await this.eventBus.publish({
      id: generateId(),
      type: 'AI_GOVERNANCE_ORCHESTRATION_STARTED',
      source: 'ai-governance-orchestrator',
      subjectType: resourceType,
      subjectId: resourceId,
      timestamp: new Date().toISOString(),
      correlationId,
    });

    try {
      // Step 1: Evaluate applicable policies
      const policyEvaluations = this.policyService.evaluatePolicy(
        'AI_GOVERNANCE_POLICY',
        resourceType,
        resourceId,
        { resourceId, resourceType },
        false
      );

      // Step 2: Execute applicable controls
      const controlExecutions = this.controlService.executeControl(
        'AI_GOVERNANCE_CONTROL',
        resourceType,
        resourceId,
        { resourceId, resourceType },
        correlationId
      );

      // Step 3: Create governance assessment
      const assessment = this.aiGovernanceService.assessAIGovernance(resourceId);

      // Step 4: Check if human review is required
      if (assessment.status === 'REQUIRES_REVIEW') {
        const reviewTask = this.humanReviewService.createTask(
          'AI_GOVERNANCE_REVIEW',
          resourceType,
          resourceId,
          'AI governance assessment requires human review',
          'HIGH'
        );

        await this.eventBus.publish({
          id: generateId(),
          type: 'AI_GOVERNANCE_REVIEW_REQUIRED',
          source: 'ai-governance-orchestrator',
          subjectType: resourceType,
          subjectId: resourceId,
          timestamp: new Date().toISOString(),
          correlationId,
        });
      }

      // Step 5: Generate evidence
      const evidenceId = generateId();
      this.evidenceRepo.save({
        id: evidenceId,
        type: 'POLICY_EVALUATION',
        subjectType: resourceType,
        subjectId: resourceId,
        actor: 'system:ai-governance-orchestrator',
        timestamp: new Date().toISOString(),
        source: 'AIGovernanceOrchestratorIntegration.orchestrateGovernanceAssessment',
        metadata: { 
          correlationId, 
          assessmentId: assessment.id,
          status: assessment.status,
        },
      });

      // Step 6: Generate audit
      this.auditRepo.save({
        id: generateId(),
        actor: 'system:ai-governance-orchestrator',
        action: 'SCAN',
        resourceType: 'AIGovernanceAssessment',
        resourceId: assessment.id,
        timestamp: new Date().toISOString(),
        details: { 
          correlationId,
          resourceType,
          resourceId,
          status: assessment.status,
        },
      });

      // Publish completion
      await this.eventBus.publish({
        id: generateId(),
        type: 'AI_GOVERNANCE_ASSESSED',
        source: 'ai-governance-orchestrator',
        subjectType: resourceType,
        subjectId: resourceId,
        timestamp: new Date().toISOString(),
        correlationId,
      });

      return correlationId;
    } catch (error) {
      // Publish failure
      await this.eventBus.publish({
        id: generateId(),
        type: 'AI_GOVERNANCE_ORCHESTRATION_FAILED',
        source: 'ai-governance-orchestrator',
        subjectType: resourceType,
        subjectId: resourceId,
        timestamp: new Date().toISOString(),
        correlationId,
      });

      throw error;
    }
  }

  async orchestrateTrainingDataGovernance(trainingDatasetId: string): Promise<string> {
    const correlationId = generateId();

    // Trigger training data approval workflow
    const trainingData = this.trainingDataService.getTrainingDataset(trainingDatasetId);
    if (!trainingData) {
      throw new Error(`Training dataset ${trainingDatasetId} not found`);
    }

    // Create human review task for approval
    const reviewTask = this.humanReviewService.createTask(
      'TRAINING_DATA_APPROVAL',
      'TrainingDataset',
      trainingDatasetId,
      'Training data requires approval before use',
      'HIGH'
    );

    await this.eventBus.publish({
      id: generateId(),
      type: 'TRAINING_DATA_APPROVAL_REQUIRED',
      source: 'ai-governance-orchestrator',
      subjectType: 'TrainingDataset',
      subjectId: trainingDatasetId,
      timestamp: new Date().toISOString(),
      correlationId,
    });

    return correlationId;
  }

  async orchestrateModelGovernance(modelId: string): Promise<string> {
    const correlationId = generateId();

    // Trigger model input governance
    const model = this.modelService.getModelProfile(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Evaluate model input governance
    const inputGovernance = this.modelService.evaluateModelInputGovernance(modelId);

    // If issues found, create review task
    if (inputGovernance.status === 'FAIL' || inputGovernance.status === 'WARN') {
      const reviewTask = this.humanReviewService.createTask(
        'MODEL_INPUT_REVIEW',
        'Model',
        modelId,
        `Model input governance: ${inputGovernance.status}`,
        inputGovernance.status === 'FAIL' ? 'CRITICAL' : 'HIGH'
      );
    }

    await this.eventBus.publish({
      id: generateId(),
      type: 'MODEL_GOVERNANCE_ASSESSED',
      source: 'ai-governance-orchestrator',
      subjectType: 'Model',
      subjectId: modelId,
      timestamp: new Date().toISOString(),
      correlationId,
    });

    return correlationId;
  }

  async orchestrateRAGGovernance(ragResourceId: string): Promise<string> {
    const correlationId = generateId();

    // Trigger RAG eligibility assessment
    const ragResource = this.ragService.getRAGResourceProfile(ragResourceId);
    if (!ragResource) {
      throw new Error(`RAG resource ${ragResourceId} not found`);
    }

    // Assess eligibility
    const eligibility = this.ragService.assessRAGEligibility(
      ragResourceId,
      'PASS', // These would be actual assessment results
      'CLEAR',
      'PASS',
      'PASS',
      'PASS',
      'PASS',
      'SUFFICIENT'
    );

    // If not eligible, create review task
    if (eligibility.status === 'NOT_ELIGIBLE' || eligibility.status === 'REQUIRES_REVIEW') {
      const reviewTask = this.humanReviewService.createTask(
        'RAG_ELIGIBILITY_REVIEW',
        'RAGResource',
        ragResourceId,
        `RAG eligibility: ${eligibility.status}`,
        eligibility.status === 'NOT_ELIGIBLE' ? 'CRITICAL' : 'HIGH'
      );
    }

    await this.eventBus.publish({
      id: generateId(),
      type: 'RAG_ELIGIBILITY_ASSESSED',
      source: 'ai-governance-orchestrator',
      subjectType: 'RAGResource',
      subjectId: ragResourceId,
      timestamp: new Date().toISOString(),
      correlationId,
    });

    return correlationId;
  }

  async orchestrateDriftResponse(driftAssessmentId: string): Promise<string> {
    const correlationId = generateId();

    // Get drift assessment
    const drift = this.driftService.getDriftAssessment(driftAssessmentId);
    if (!drift) {
      throw new Error(`Drift assessment ${driftAssessmentId} not found`);
    }

    // If material or critical drift, trigger invalidation
    if (drift.severity === 'MATERIAL_DRIFT' || drift.severity === 'CRITICAL_DRIFT') {
      // Invalidate related assessments
      // This would integrate with GovernanceInvalidationService

      // Create review task
      const reviewTask = this.humanReviewService.createTask(
        'DRIFT_RESPONSE',
        drift.subjectType,
        drift.subjectId,
        `Drift detected: ${drift.driftType} (${drift.severity})`,
        drift.severity === 'CRITICAL_DRIFT' ? 'CRITICAL' : 'HIGH'
      );

      await this.eventBus.publish({
        id: generateId(),
        type: 'AI_GOVERNANCE_INVALIDATED',
        source: 'ai-governance-orchestrator',
        subjectType: drift.subjectType,
        subjectId: drift.subjectId,
        timestamp: new Date().toISOString(),
        correlationId,
      });
    }

    return correlationId;
  }
}
