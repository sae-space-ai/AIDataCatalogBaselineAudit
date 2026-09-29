// ============================================================
// AI GOVERNANCE — Integration Services
// ============================================================

import type { Asset, AssetRelationship } from '../types';
import type { RelationshipRepository, EvidenceRepository, AuditRepository } from '../domain/contracts';
import type { AIGovernanceService } from './ai-governance-service';
import type { DataDriftService } from './drift-service';
import type { TrainingDataService } from './training-data-service';
import type { RAGGovernanceService } from './rag-service';
import type { CertificationService } from '../governance/certification-service';
import type { ImpactAnalyzer } from '../services/impact-analyzer';
import { generateId } from '../lib/utils';

// ---- AI Use Case Dependency Graph ----

export interface DependencyNode {
  assetId: string;
  assetType: string;
  name: string;
  relationships: {
    upstream: string[];
    downstream: string[];
  };
}

export class AIDependencyGraph {
  constructor(
    private relationshipRepo: RelationshipRepository,
    private aiGovernanceService: AIGovernanceService
  ) {}

  buildGraph(useCaseId: string): DependencyNode[] {
    const useCase = this.aiGovernanceService.getAIUseCase(useCaseId);
    if (!useCase) return [];

    const nodes: Map<string, DependencyNode> = new Map();
    const visited = new Set<string>();

    // Start with AI Application
    this.traverseGraph(useCase.aiApplicationAssetId, nodes, visited);

    // Add models
    for (const modelId of useCase.modelReferences) {
      this.traverseGraph(modelId, nodes, visited);
    }

    // Add datasets
    for (const datasetId of useCase.datasetReferences) {
      this.traverseGraph(datasetId, nodes, visited);
    }

    // Add RAG resources
    for (const ragId of useCase.ragResourceReferences) {
      this.traverseGraph(ragId, nodes, visited);
    }

    return Array.from(nodes.values());
  }

  private traverseGraph(
    assetId: string,
    nodes: Map<string, DependencyNode>,
    visited: Set<string>
  ): void {
    if (visited.has(assetId)) return;
    visited.add(assetId);

    const relationships = this.relationshipRepo.getByAssetId(assetId);
    
    const upstream = relationships
      .filter(r => r.targetAssetId === assetId)
      .map(r => r.sourceAssetId);

    const downstream = relationships
      .filter(r => r.sourceAssetId === assetId)
      .map(r => r.targetAssetId);

    // Get asset info (simplified - would need asset repo in real implementation)
    nodes.set(assetId, {
      assetId,
      assetType: 'UNKNOWN', // Would be resolved from asset
      name: `Asset ${assetId.slice(0, 8)}`,
      relationships: { upstream, downstream },
    });

    // Traverse upstream
    for (const upId of upstream) {
      this.traverseGraph(upId, nodes, visited);
    }

    // Traverse downstream
    for (const downId of downstream) {
      this.traverseGraph(downId, nodes, visited);
    }
  }
}

// ---- Purpose Limitation Assessment ----

export interface PurposeLimitationResult {
  datasetPurpose: string;
  useCasePurpose: string;
  compatibility: 'COMPATIBLE' | 'INCOMPATIBLE' | 'REQUIRES_REVIEW' | 'NOT_EVALUATED';
  reasons: string[];
}

export class PurposeLimitationService {
  assess(datasetPurpose: string, useCasePurpose: string): PurposeLimitationResult {
    const reasons: string[] = [];
    let compatibility: PurposeLimitationResult['compatibility'] = 'NOT_EVALUATED';

    if (!datasetPurpose || !useCasePurpose) {
      return {
        datasetPurpose,
        useCasePurpose,
        compatibility: 'NOT_EVALUATED',
        reasons: ['Missing purpose information'],
      };
    }

    // Simple keyword-based compatibility check
    const datasetKeywords = datasetPurpose.toLowerCase().split(/\s+/);
    const useCaseKeywords = useCasePurpose.toLowerCase().split(/\s+/);

    const commonKeywords = datasetKeywords.filter(k => useCaseKeywords.includes(k));

    if (commonKeywords.length > 0) {
      compatibility = 'COMPATIBLE';
      reasons.push(`Common keywords found: ${commonKeywords.join(', ')}`);
    } else {
      compatibility = 'REQUIRES_REVIEW';
      reasons.push('No common keywords found - manual review required');
    }

    // Check for restricted purposes
    const restrictedKeywords = ['personal', 'sensitive', 'confidential', 'restricted'];
    const hasRestricted = datasetKeywords.some(k => restrictedKeywords.includes(k));

    if (hasRestricted) {
      compatibility = 'REQUIRES_REVIEW';
      reasons.push('Dataset contains restricted keywords - review required');
    }

    return {
      datasetPurpose,
      useCasePurpose,
      compatibility,
      reasons,
    };
  }
}

// ---- Drift Impact Integration ----

export class DriftImpactService {
  constructor(
    private driftService: DataDriftService,
    private impactAnalyzer: ImpactAnalyzer
  ) {}

  analyzeDriftImpact(driftAssessmentId: string): {
    driftType: string;
    severity: string;
    potentiallyAffected: string[];
  } {
    const assessment = this.driftService.getDriftAssessment(driftAssessmentId);
    if (!assessment) {
      return {
        driftType: 'UNKNOWN',
        severity: 'NOT_EVALUATED',
        potentiallyAffected: [],
      };
    }

    // Use ImpactAnalyzer to find affected resources
    const impact = this.impactAnalyzer.analyze(assessment.subjectId);

    return {
      driftType: assessment.driftType,
      severity: assessment.severity,
      potentiallyAffected: impact.potentiallyAffected,
    };
  }
}

// ---- Governance Invalidation Service ----

export class GovernanceInvalidationService {
  constructor(
    private trainingDataService: TrainingDataService,
    private ragService: RAGGovernanceService,
    private aiGovernanceService: AIGovernanceService,
    private certificationService: CertificationService,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  invalidateRelatedAssessments(subjectType: string, subjectId: string): void {
    // Invalidate training data approvals
    const trainingDatasets = this.trainingDataService.listTrainingDatasets();
    for (const td of trainingDatasets) {
      if (td.datasetAssetId === subjectId) {
        this.trainingDataService.markAsStale(td.id);
      }
    }

    // Invalidate RAG eligibility
    const ragResources = this.ragService.listRAGResourceProfiles();
    for (const rag of ragResources) {
      if (rag.assetId === subjectId) {
        this.ragService.markAsStale(rag.assetId);
      }
    }

    // Invalidate AI governance assessments
    const aiAssessments = this.aiGovernanceService.listAIGovernanceAssessments();
    for (const assessment of aiAssessments) {
      if (assessment.subjectId === subjectId) {
        // Mark as stale (would need update method in real implementation)
      }
    }

    // Invalidate certifications
    this.certificationService.invalidateCertification(subjectType, subjectId, 'Material change detected');

    // Generate evidence
    this.evidenceRepo.save({
      id: generateId(),
      type: 'ASSET_UPDATED',
      subjectType,
      subjectId,
      actor: 'system:governance-invalidation',
      timestamp: new Date().toISOString(),
      source: 'GovernanceInvalidationService.invalidateRelatedAssessments',
      metadata: { reason: 'Material change detected' },
    });

    // Generate audit
    this.auditRepo.save({
      id: generateId(),
      actor: 'system:governance-invalidation',
      action: 'UPDATE',
      resourceType: subjectType,
      resourceId: subjectId,
      timestamp: new Date().toISOString(),
      details: { action: 'INVALIDATE_RELATED', reason: 'Material change detected' },
    });
  }
}

// ---- AI Reproducibility Service ----

export interface ReproducibilityRecord {
  id: string;
  aiUseCaseId: string;
  modelVersionId: string;
  trainingDatasetVersionIds: string[];
  validationDatasetVersionIds: string[];
  testDatasetVersionIds: string[];
  governanceSnapshotIds: string[];
  policyVersionIds: string[];
  evidenceIds: string[];
  timestamp: string;
  reproducibilityLevel: 'FULL' | 'GOVERNANCE_REPRODUCIBILITY_ONLY' | 'NOT_EVALUATED';
}

export class AIReproducibilityService {
  private records: Map<string, ReproducibilityRecord> = new Map();

  constructor(
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  createRecord(
    aiUseCaseId: string,
    modelVersionId: string,
    trainingDatasetVersionIds: string[],
    validationDatasetVersionIds: string[],
    testDatasetVersionIds: string[],
    governanceSnapshotIds: string[],
    policyVersionIds: string[],
    evidenceIds: string[]
  ): ReproducibilityRecord {
    const record: ReproducibilityRecord = {
      id: generateId(),
      aiUseCaseId,
      modelVersionId,
      trainingDatasetVersionIds,
      validationDatasetVersionIds,
      testDatasetVersionIds,
      governanceSnapshotIds,
      policyVersionIds,
      evidenceIds,
      timestamp: new Date().toISOString(),
      reproducibilityLevel: 'GOVERNANCE_REPRODUCIBILITY_ONLY', // Conservative default
    };

    this.records.set(record.id, record);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:ai-reproducibility',
      action: 'CREATE',
      resourceType: 'AIReproducibilityRecord',
      resourceId: record.id,
      timestamp: new Date().toISOString(),
      details: { aiUseCaseId, modelVersionId },
    });

    return record;
  }

  getRecord(id: string): ReproducibilityRecord | undefined {
    return this.records.get(id);
  }

  getRecordsByUseCase(aiUseCaseId: string): ReproducibilityRecord[] {
    return Array.from(this.records.values()).filter(r => r.aiUseCaseId === aiUseCaseId);
  }
}
