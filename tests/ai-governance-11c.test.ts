// ============================================================
// TESTS — AI Governance Integration Services (11C)
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { HumanReviewService } from '../src/services/human-review-service';
import { AIUsagePolicyService } from '../src/ai-governance/usage-policy-service';
import { AIGovernanceExplainabilityService } from '../src/ai-governance/explainability-service';
import { 
  AI_GOVERNANCE_PROFILES, 
  getAIProfile, 
  listAIProfiles,
  PUBLIC_ADMINISTRATION_AI_PROFILE,
  SME_AI_PROFILE,
  GENAI_AI_PROFILE,
  SENSITIVE_AI_DATA_PROFILE,
  ENTERPRISE_AI_PROFILE,
  MLOPS_AI_PROFILE
} from '../src/ai-governance/profiles';
import {
  InMemoryEvidenceRepository,
  InMemoryAuditRepository,
} from '../src/infrastructure/in-memory-repository';
import { PolicyService } from '../src/governance/policy-service';
import { ControlService } from '../src/governance/control-service';
import { AIGovernanceService } from '../src/ai-governance/ai-governance-service';
import { DatasetGovernanceService } from '../src/ai-governance/dataset-service';
import { TrainingDataService } from '../src/ai-governance/training-data-service';
import { ModelGovernanceService } from '../src/ai-governance/model-service';
import { RAGGovernanceService } from '../src/ai-governance/rag-service';
import { SensitiveDataPreventionService } from '../src/ai-governance/sensitive-data-service';
import { DataDriftService } from '../src/ai-governance/drift-service';
import { InMemoryAssetRepository, InMemoryClassificationRepository } from '../src/infrastructure/in-memory-repository';

// ---- Human Review Service Tests ----

describe('HumanReviewService', () => {
  let service: HumanReviewService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    service = new HumanReviewService(evidenceRepo, auditRepo);
  });

  it('should create a review task', () => {
    const task = service.createTask(
      'AI_GOVERNANCE_REVIEW',
      'Dataset',
      'dataset-1',
      'Requires human review',
      'HIGH'
    );

    expect(task).toBeDefined();
    expect(task.type).toBe('AI_GOVERNANCE_REVIEW');
    expect(task.status).toBe('OPEN');
    expect(task.priority).toBe('HIGH');
  });

  it('should list tasks by status', () => {
    service.createTask('REVIEW_1', 'Dataset', 'dataset-1', 'Reason 1', 'HIGH');
    service.createTask('REVIEW_2', 'Dataset', 'dataset-2', 'Reason 2', 'MEDIUM');

    const openTasks = service.listTasks('OPEN');
    expect(openTasks.length).toBe(2);
  });

  it('should resolve a task', () => {
    const task = service.createTask('REVIEW', 'Dataset', 'dataset-1', 'Reason', 'HIGH');
    
    service.resolveTask(task.id, 'APPROVED', 'demo-reviewer');
    
    const resolved = service.getTask(task.id);
    expect(resolved?.status).toBe('RESOLVED');
    expect(resolved?.decision).toBe('APPROVED');
    expect(resolved?.resolvedAt).toBeDefined();
  });

  it('should generate evidence on task resolution', () => {
    const task = service.createTask('REVIEW', 'Dataset', 'dataset-1', 'Reason', 'HIGH');
    
    service.resolveTask(task.id, 'APPROVED', 'demo-reviewer');
    
    const evidence = evidenceRepo.getAll();
    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.some(e => e.type === 'CLASSIFICATION_REVIEWED')).toBe(true);
  });

  it('should generate audit on task creation', () => {
    service.createTask('REVIEW', 'Dataset', 'dataset-1', 'Reason', 'HIGH');
    
    const audits = auditRepo.getAll();
    expect(audits.length).toBeGreaterThan(0);
    expect(audits.some(a => a.action === 'CREATE')).toBe(true);
  });
});

// ---- AI Usage Policy Service Tests ----

describe('AIUsagePolicyService', () => {
  let service: AIUsagePolicyService;
  let policyService: PolicyService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    policyService = new PolicyService(evidenceRepo, auditRepo);
    service = new AIUsagePolicyService(policyService, evidenceRepo, auditRepo);
  });

  it('should check purpose limitation - compatible', () => {
    const result = service.checkPurposeLimitation(
      'Customer data analysis',
      'Customer analytics'
    );

    expect(result.compatible).toBe(true);
    expect(result.requiresReview).toBe(false);
  });

  it('should check purpose limitation - incompatible', () => {
    const result = service.checkPurposeLimitation(
      'Customer data analysis',
      'Marketing campaigns'
    );

    expect(result.compatible).toBe(false);
    expect(result.requiresReview).toBe(true);
  });

  it('should check purpose limitation - restricted keywords', () => {
    const result = service.checkPurposeLimitation(
      'Personal sensitive data',
      'General analytics'
    );

    expect(result.compatible).toBe(false);
    expect(result.requiresReview).toBe(true);
  });

  it('should check purpose limitation - missing information', () => {
    const result = service.checkPurposeLimitation('', 'Some purpose');

    expect(result.compatible).toBe(false);
    expect(result.requiresReview).toBe(true);
  });
});

// ---- AI Governance Profiles Tests ----

describe('AI Governance Profiles', () => {
  it('should have 6 profiles defined', () => {
    expect(AI_GOVERNANCE_PROFILES.length).toBe(6);
  });

  it('should get profile by ID', () => {
    const profile = getAIProfile('public-administration-ai');
    expect(profile).toBeDefined();
    expect(profile?.name).toBe('Public Administration AI Governance');
  });

  it('should list all profiles', () => {
    const profiles = listAIProfiles();
    expect(profiles.length).toBe(6);
  });

  it('should have correct profile IDs', () => {
    expect(PUBLIC_ADMINISTRATION_AI_PROFILE.id).toBe('public-administration-ai');
    expect(SME_AI_PROFILE.id).toBe('sme-ai');
    expect(GENAI_AI_PROFILE.id).toBe('genai-ai');
    expect(SENSITIVE_AI_DATA_PROFILE.id).toBe('sensitive-ai-data');
    expect(ENTERPRISE_AI_PROFILE.id).toBe('enterprise-ai');
    expect(MLOPS_AI_PROFILE.id).toBe('mlops-ai');
  });

  it('should have non-invasive constraints in all profiles', () => {
    AI_GOVERNANCE_PROFILES.forEach(profile => {
      expect(profile.nonInvasiveConstraints.metadataFirst).toBe(true);
      expect(profile.nonInvasiveConstraints.readOnlyByDefault).toBe(true);
      expect(profile.nonInvasiveConstraints.dataMinimization).toBe(true);
      expect(profile.nonInvasiveConstraints.sourceSovereignty).toBe(true);
      expect(profile.nonInvasiveConstraints.evidenceByReference).toBe(true);
    });
  });

  it('should have human review expectations', () => {
    AI_GOVERNANCE_PROFILES.forEach(profile => {
      expect(profile.humanReviewExpectations).toBeDefined();
      expect(profile.humanReviewExpectations.level).toBeDefined();
      expect(profile.humanReviewExpectations.triggers.length).toBeGreaterThan(0);
    });
  });

  it('should have evidence expectations', () => {
    AI_GOVERNANCE_PROFILES.forEach(profile => {
      expect(profile.evidenceExpectations).toBeDefined();
      expect(profile.evidenceExpectations.requiredTypes.length).toBeGreaterThan(0);
      expect(profile.evidenceExpectations.minimumCoverage).toBeGreaterThan(0);
    });
  });
});

// ---- AI Governance Explainability Service Tests ----

describe('AIGovernanceExplainabilityService', () => {
  let service: AIGovernanceExplainabilityService;
  let aiGovernanceService: AIGovernanceService;
  let policyService: PolicyService;
  let controlService: ControlService;
  let sensitiveDataService: SensitiveDataPreventionService;
  let driftService: DataDriftService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;
  let assetRepo: InMemoryAssetRepository;
  let classificationRepo: InMemoryClassificationRepository;
  let datasetService: DatasetGovernanceService;
  let trainingDataService: TrainingDataService;
  let modelService: ModelGovernanceService;
  let ragService: RAGGovernanceService;

  beforeEach(() => {
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    assetRepo = new InMemoryAssetRepository();
    classificationRepo = new InMemoryClassificationRepository();
    policyService = new PolicyService(evidenceRepo, auditRepo);
    controlService = new ControlService(evidenceRepo, auditRepo);
    datasetService = new DatasetGovernanceService(assetRepo, evidenceRepo, auditRepo);
    trainingDataService = new TrainingDataService(evidenceRepo, auditRepo);
    modelService = new ModelGovernanceService(evidenceRepo, auditRepo);
    ragService = new RAGGovernanceService(evidenceRepo, auditRepo);
    sensitiveDataService = new SensitiveDataPreventionService(classificationRepo, evidenceRepo, auditRepo);
    driftService = new DataDriftService(evidenceRepo, auditRepo);

    aiGovernanceService = new AIGovernanceService(
      datasetService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      evidenceRepo,
      auditRepo
    );

    service = new AIGovernanceExplainabilityService(
      aiGovernanceService,
      policyService,
      controlService,
      sensitiveDataService,
      driftService
    );
  });

  it('should return undefined for non-existent assessment', () => {
    const result = service.explainAssessment('non-existent');
    expect(result).toBeUndefined();
  });

  it('should generate explanation text', () => {
    // Create a use case and assessment
    const useCase = aiGovernanceService.createAIUseCase(
      'Test Use Case',
      'Description',
      'Purpose',
      'Domain',
      'app-1'
    );

    const assessment = aiGovernanceService.assessAIGovernance(useCase.id);
    
    const explanation = service.generateExplanationText(assessment.id);
    expect(explanation).toBeDefined();
    expect(explanation).toContain('AI Governance Assessment Explanation');
  });
});
