// ============================================================
// SERVICES — Search Service
// SEARCH_MODE = KEYWORD_STRUCTURED
// ============================================================

import type {
  AssetRepository,
  ClassificationRepository,
  QualityRepository,
  TrustScoreRepository,
} from '../domain/contracts';
import type {
  Asset,
  AssetType,
  QualityStatus,
  SearchQuery,
  SearchResult,
  SensitivityLevel,
} from '../types';

export type SearchMode = 'KEYWORD_STRUCTURED';

export class SearchService {
  readonly mode: SearchMode = 'KEYWORD_STRUCTURED';

  constructor(
    private assetRepo: AssetRepository,
    private classificationRepo: ClassificationRepository,
    private qualityRepo: QualityRepository,
    private trustScoreRepo: TrustScoreRepository
  ) {}

  search(query: SearchQuery): SearchResult {
    // Delegate basic search to repository
    const baseResult = this.assetRepo.search(query);

    // Additional filtering by quality status if requested
    let filteredAssets = baseResult.assets;

    if (query.qualityStatus) {
      filteredAssets = filteredAssets.filter(asset => {
        const results = this.qualityRepo.getByAssetId(asset.id);
        if (results.length === 0) return false;
        return results.some(r => r.status === query.qualityStatus);
      });
    }

    // Text search also includes metadata and classification
    if (query.text) {
      const lower = query.text.toLowerCase();
      filteredAssets = filteredAssets.filter(asset => {
        // Already matched by name/qualifiedName/description in repo
        // Now also check metadata and classification
        const metadataStr = JSON.stringify(asset.metadata).toLowerCase();
        if (metadataStr.includes(lower)) return true;
        
        const classifications = this.classificationRepo.getByAssetId(asset.id);
        if (classifications.some(c => c.classificationType.toLowerCase().includes(lower))) return true;
        
        return false;
      });
    }

    // Enrich with classification and trust info (already available via repos)
    return {
      assets: filteredAssets,
      total: filteredAssets.length,
      page: baseResult.page,
      pageSize: baseResult.pageSize,
    };
  }

  /**
   * Get assets by type with optional text filter.
   */
  getByType(type: AssetType, text?: string): Asset[] {
    return this.search({ type, text }).assets;
  }

  /**
   * Get assets by sensitivity level.
   */
  getBySensitivity(sensitivity: SensitivityLevel): Asset[] {
    return this.search({ sensitivity }).assets;
  }

  /**
   * Get assets with quality issues.
   */
  getWithQualityIssues(status: QualityStatus): Asset[] {
    return this.search({ qualityStatus: status }).assets;
  }

  /**
   * Get search suggestions based on existing asset names.
   */
  getSuggestions(prefix: string, limit: number = 5): string[] {
    if (!prefix || prefix.length < 2) return [];

    const allAssets = this.assetRepo.getAll();
    const lower = prefix.toLowerCase();

    const suggestions = new Set<string>();
    for (const asset of allAssets) {
      if (asset.name.toLowerCase().includes(lower)) {
        suggestions.add(asset.name);
      }
      if (asset.qualifiedName.toLowerCase().includes(lower)) {
        suggestions.add(asset.qualifiedName);
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }
}
