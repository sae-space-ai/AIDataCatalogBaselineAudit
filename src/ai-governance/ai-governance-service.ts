// ============================================================
// AI GOVERNANCE — Main AI Governance Service
// ============================================================

import type { 
  AIUseCase, 
  AIUseCaseStatus,
  AIGovernanceAssessment,
  AIGovernanceStatus
} from './types';
import type { DatasetGovernanceService } from './dataset-service';
import type { TrainingDataService } from './training-data-service';
import type { ModelGovernanceService } from './model-service';
import type { RAGGovernanceService } from './rag-service';
import type { SensitiveDataPreventionService } from './sensitive-data-service';
import type { DataDriftService } from './drift-service';
import type { EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class AIGovernanceService {
  private useCases: Map<string, AIUseCase> = new Map();
  private assessments: Map<string, AIGovernanceAssessment> = new Map();

  constructor(
    private datasetService: DatasetGovernanceService,
    private trainingDataService: TrainingDataService,
    private modelService: ModelGovernanceService,
    private ragService: RAGGovernanceService,
    private sensitiveDataService: SensitiveDataPreventionService,
    private driftService: DataDriftService,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  // ---- AI Use Case Management ----

  createAIUseCase(
    name: string,
    description: string,
    purpose: string,
    businessDomain: string,
    aiApplicationAssetId: string,
    ownerReference?: string
  ): AIUseCase {
    const useCase: AIUseCase = {
      id: generateId(),
      name,
      description,
      purpose,
      businessDomain,
      ownerReference,
      aiApplicationAssetId,
      modelReferences: [],
      datasetReferences: [],
      ragResourceReferences: [],
      humanOversightProfile: {
        required: false,
        level: 'STANDARD',
      },
      policyProfile: {
        policyIds: [],
      },
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.useCases.set(useCase.id, useCase);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:ai-governance',
      action: 'CREATE',
      resourceType: 'AIUseCase',
      resourceId: useCase.id,
      timestamp: new Date().toISOString(),
      details: { name, purpose, businessDomain },
    });

    return useCase;
  }

  getAIUseCase(id: string): AIUseCase | undefined {
    return this.useCases.get(id);
  }

  listAIUseCases(status?: AIUseCaseStatus): AIUseCase[] {
    const all = Array.from(this.useCases.values());
    if (status) {
      return all.filter(uc => uc.status === status);
    }
    return all;
  }

  updateAIUseCase(id: string, updates: Partial<AIUseCase>): void {
    const useCase = this.useCases.get(id);
    if (!useCase) {
      throw new Error(`AI use case ${id} not found`);
    }

    const updated = { ...useCase, ...updates, updatedAt: new Date().toISOString() };
    this.useCases.set(id, updated);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:ai-governance',
      action: 'UPDATE',
      resourceType: 'AIUseCase',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { updates: Object.keys(updates) },
    });
  }

  // ---- Resource References ----

  addModelReference(useCaseId: string, modelAssetId: string): void {
    const useCase = this.useCases.get(useCaseId);
    if (!useCase) {
      throw new Error(`AI use case ${useCaseId} not found`);
    }

    if (!useCase.modelReferences.includes(modelAssetId)) {
      useCase.modelReferences.push(modelAssetId);
      useCase.updatedAt = new Date().toISOString();
    }
  }

  addDatasetReference(useCaseId: string, datasetAssetId: string): void {
    const useCase = this.useCases.get(useCaseId);
    if (!useCase) {
      throw new Error(`AI use case ${useCaseId} not found`);
    }

    if (!useCase.datasetReferences.includes(datasetAssetId)) {
      useCase.datasetReferences.push(datasetAssetId);
      useCase.updatedAt = new Date().toISOString();
    }
  }

  addRAGResourceReference(useCaseId: string, ragAssetId: string): void {
    const useCase = this.useCases.get(useCaseId);
    if (!useCase) {
      throw new Error(`AI use case ${useCaseId} not found`);
    }

    if (!useCase.ragResourceReferences.includes(ragAssetId)) {
      useCase.ragResourceReferences.push(ragAssetId);
      useCase.updatedAt = new Date().toISOString();
    }
  }

  // ---- AI Governance Assessment ----

  assessAIGovernance(useCaseId: string): AIGovernanceAssessment {
    const useCase = this.useCases.get(useCaseId);
    if (!useCase) {
      throw new Error(`AI use case ${useCaseId} not found`);
    }

    const assessment: AIGovernanceAssessment = {
      id: generateId(),
      subjectType: 'AIUseCase',
      subjectId: useCaseId,
      aiUseCaseId: useCaseId,
      datasetAssessments: [],
      ragAssessments: [],
      policyAssessmentIds: [],
      controlExecutionIds: [],
      evidenceCoverage: {
        required: 0,
        available: 0,
        status: 'NOT_EVALUATED' as any,
      },
      humanReviews: [],
      status: 'NOT_EVALUATED',
      reasons: [],
      createdAt: new Date().toISOString(),
    };

    // Assess datasets
    for (const datasetId of useCase.datasetReferences) {
      const sensitiveAssessment = this.sensitiveDataService.getLatestSensitiveDataAssessment('Dataset', datasetId);
      if (sensitiveAssessment) {
        assessment.datasetAssessments.push(sensitiveAssessment.id);
      }
    }

    // Assess RAG resources
    for (const ragId of useCase.ragResourceReferences) {
      const ragAssessment = this.ragService.getLatestRAGEligibilityAssessment(ragId);
      if (ragAssessment) {
        assessment.ragAssessments.push(ragAssessment.id);
      }
    }

    // Assess models
    for (const modelId of useCase.modelReferences) {
      const modelInputAssessment = this.modelService.evaluateModelInputGovernance(modelId);
      assessment.modelInputAssessment = modelInputAssessment;
    }

    // Determine overall status
    assessment.status = this.determineAIGovernanceStatus(assessment);
    assessment.completedAt = new Date().toISOString();

    this.assessments.set(assessment.id, assessment);

    // Generate evidence
    const evidenceId = generateId();
    this.evidenceRepo.save({
      id: evidenceId,
      type: 'ASSET_DISCOVERED',
      subjectType: 'AIUseCase',
      subjectId: useCaseId,
      actor: 'system:ai-governance',
      timestamp: new Date().toISOString(),
      source: 'AIGovernanceService.assessAIGovernance',
      metadata: { status: assessment.status },
    });

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:ai-governance',
      action: 'SCAN',
      resourceType: 'AIGovernanceAssessment',
      resourceId: assessment.id,
      timestamp: new Date().toISOString(),
      details: { useCaseId, status: assessment.status },
    });

    return assessment;
  }

  private determineAIGovernanceStatus(assessment: AIGovernanceAssessment): AIGovernanceStatus {
    // Check dataset assessments
    for (const datasetAssessmentId of assessment.datasetAssessments) {
      const datasetAssessment = this.sensitiveDataService.getSensitiveDataAssessment(datasetAssessmentId);
      if (datasetAssessment?.status === 'BLOCKED') {
        return 'NOT_APPROVED';
      }
      if (datasetAssessment?.status === 'REQUIRES_REVIEW') {
        return 'REQUIRES_REVIEW';
      }
    }

    // Check RAG assessments
    for (const ragAssessmentId of assessment.ragAssessments) {
      const ragAssessment = this.ragService.getRAGEligibilityAssessment(ragAssessmentId);
      if (ragAssessment?.status === 'NOT_ELIGIBLE') {
        return 'NOT_APPROVED';
      }
      if (ragAssessment?.status === 'REQUIRES_REVIEW') {
        return 'REQUIRES_REVIEW';
      }
    }

    // Check model input assessment
    if (assessment.modelInputAssessment?.status === 'FAIL') {
      return 'NOT_APPROVED';
    }
    if (assessment.modelInputAssessment?.status === 'REQUIRES_REVIEW') {
      return 'REQUIRES_REVIEW';
    }

    // If all checks pass
    if (
      assessment.datasetAssessments.length > 0 &&
      assessment.ragAssessments.length > 0 &&
      assessment.modelInputAssessment?.status === 'PASS'
    ) {
      return 'APPROVED_INTERNAL';
    }

    return 'NOT_EVALUATED';
  }

  getAIGovernanceAssessment(id: string): AIGovernanceAssessment | undefined {
    return this.assessments.get(id);
  }

  getLatestAIGovernanceAssessment(useCaseId: string): AIGovernanceAssessment | undefined {
    const assessments = Array.from(this.assessments.values())
      .filter(a => a.aiUseCaseId === useCaseId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return assessments[0];
  }

  listAIGovernanceAssessments(status?: AIGovernanceStatus): AIGovernanceAssessment[] {
    const all = Array.from(this.assessments.values());
    if (status) {
      return all.filter(a => a.status === status);
    }
    return all;
  }

  // ---- Summary Methods ----

  getAIGovernanceSummary(): {
    totalUseCases: number;
    draft: number;
    underReview: number;
    approved: number;
    suspended: number;
    retired: number;
    totalAssessments: number;
    approvedAssessments: number;
    requiresReview: number;
    notApproved: number;
  } {
    const useCases = Array.from(this.useCases.values());
    const assessments = Array.from(this.assessments.values());
    
    return {
      totalUseCases: useCases.length,
      draft: useCases.filter(uc => uc.status === 'DRAFT').length,
      underReview: useCases.filter(uc => uc.status === 'UNDER_REVIEW').length,
      approved: useCases.filter(uc => uc.status === 'APPROVED_INTERNAL').length,
      suspended: useCases.filter(uc => uc.status === 'SUSPENDED').length,
      retired: useCases.filter(uc => uc.status === 'RETIRED').length,
      totalAssessments: assessments.length,
      approvedAssessments: assessments.filter(a => a.status === 'APPROVED_INTERNAL').length,
      requiresReview: assessments.filter(a => a.status === 'REQUIRES_REVIEW').length,
      notApproved: assessments.filter(a => a.status === 'NOT_APPROVED').length,
    };
  }
}
