// ============================================================
// AI GOVERNANCE — AI Resource Registry
// ============================================================

import type { Asset } from '../types';
import type { AssetRepository, RelationshipRepository } from '../domain/contracts';
import type { DatasetGovernanceService } from './dataset-service';
import type { ModelGovernanceService } from './model-service';
import type { RAGGovernanceService } from './rag-service';
import type { AIGovernanceService } from './ai-governance-service';

export type AIGovernanceStatus = 'GOVERNED' | 'PARTIAL' | 'NOT_EVALUATED' | 'NOT_APPLICABLE';

export interface AIResource {
  assetId: string;
  resourceType: 'DATASET' | 'TRAINING_DATASET' | 'MODEL' | 'RAG_RESOURCE' | 'AI_USE_CASE' | 'AI_APPLICATION';
  governanceStatus: AIGovernanceStatus;
  asset: Asset;
}

export class AIResourceRegistry {
  constructor(
    private assetRepo: AssetRepository,
    private relationshipRepo: RelationshipRepository,
    private datasetService: DatasetGovernanceService,
    private modelService: ModelGovernanceService,
    private ragService: RAGGovernanceService,
    private aiGovernanceService: AIGovernanceService
  ) {}

  register(assetId: string, resourceType: AIResource['resourceType']): AIResource | undefined {
    const asset = this.assetRepo.getById(assetId);
    if (!asset) return undefined;

    const governanceStatus = this.resolveGovernanceStatus(assetId, resourceType);

    return {
      assetId,
      resourceType,
      governanceStatus,
      asset,
    };
  }

  resolve(assetId: string): AIResource | undefined {
    const asset = this.assetRepo.getById(assetId);
    if (!asset) return undefined;

    const resourceType = this.inferResourceType(asset);
    const governanceStatus = this.resolveGovernanceStatus(assetId, resourceType);

    return {
      assetId,
      resourceType,
      governanceStatus,
      asset,
    };
  }

  list(resourceType?: AIResource['resourceType']): AIResource[] {
    const allAssets = this.assetRepo.getAll();
    return allAssets
      .map(asset => {
        const type = resourceType || this.inferResourceType(asset);
        return {
          assetId: asset.id,
          resourceType: type,
          governanceStatus: this.resolveGovernanceStatus(asset.id, type),
          asset,
        };
      })
      .filter(r => !resourceType || r.resourceType === resourceType);
  }

  filter(predicate: (resource: AIResource) => boolean): AIResource[] {
    return this.list().filter(predicate);
  }

  getRelationships(assetId: string): { upstream: Asset[]; downstream: Asset[] } {
    const allRels = this.relationshipRepo.getByAssetId(assetId);
    
    const upstream = allRels
      .filter(r => r.targetAssetId === assetId)
      .map(r => this.assetRepo.getById(r.sourceAssetId))
      .filter((a): a is Asset => a !== undefined);

    const downstream = allRels
      .filter(r => r.sourceAssetId === assetId)
      .map(r => this.assetRepo.getById(r.targetAssetId))
      .filter((a): a is Asset => a !== undefined);

    return { upstream, downstream };
  }

  private inferResourceType(asset: Asset): AIResource['resourceType'] {
    if (this.datasetService.getDatasetProfile(asset.id)) return 'DATASET';
    if (this.modelService.getModelProfile(asset.id)) return 'MODEL';
    if (this.ragService.getRAGResourceProfile(asset.id)) return 'RAG_RESOURCE';
    if (this.aiGovernanceService.getAIUseCase(asset.id)) return 'AI_USE_CASE';
    return 'DATASET'; // Default fallback
  }

  private resolveGovernanceStatus(assetId: string, resourceType: AIResource['resourceType']): AIGovernanceStatus {
    switch (resourceType) {
      case 'DATASET':
      case 'TRAINING_DATASET': {
        const profile = this.datasetService.getDatasetProfile(assetId);
        return profile ? 'GOVERNED' : 'NOT_EVALUATED';
      }
      case 'MODEL': {
        const profile = this.modelService.getModelProfile(assetId);
        if (!profile) return 'NOT_EVALUATED';
        return profile.governanceStatus === 'GOVERNED' ? 'GOVERNED' : 'PARTIAL';
      }
      case 'RAG_RESOURCE': {
        const profile = this.ragService.getRAGResourceProfile(assetId);
        if (!profile) return 'NOT_EVALUATED';
        return profile.eligibilityStatus === 'ELIGIBLE' ? 'GOVERNED' : 'PARTIAL';
      }
      case 'AI_USE_CASE': {
        const useCase = this.aiGovernanceService.getAIUseCase(assetId);
        if (!useCase) return 'NOT_EVALUATED';
        return useCase.status === 'APPROVED_INTERNAL' ? 'GOVERNED' : 'PARTIAL';
      }
      default:
        return 'NOT_APPLICABLE';
    }
  }
}
