// ============================================================
// SERVICES — Impact Analyzer
// Uses AssetRelationship graph exclusively
// ============================================================

import type { RelationshipRepository, AssetRepository } from '../domain/contracts';
import type { Asset, AssetRelationship, ImpactAnalysis } from '../types';

export class ImpactAnalyzer {
  constructor(
    private relationshipRepo: RelationshipRepository,
    private assetRepo: AssetRepository
  ) {}

  /**
   * Analyze the impact of changes to a given asset.
   * Returns upstream/downstream counts and list of potentially affected assets.
   * 
   * IMPORTANT: This is structural analysis only.
   * "POTENTIALLY_AFFECTED" means there is a dependency relationship,
   * NOT that the asset will definitely be impacted.
   */
  analyze(assetId: string): ImpactAnalysis {
    const upstream = this.getTransitiveUpstream(assetId);
    const downstream = this.getTransitiveDownstream(assetId);

    // Potentially affected = downstream dependencies
    // (assets that depend on this one may be impacted by changes)
    const potentiallyAffected = downstream
      .map(rel => rel.targetAssetId)
      .filter(id => id !== assetId);

    // Deduplicate
    const uniqueAffected = [...new Set(potentiallyAffected)];

    return {
      assetId,
      upstreamCount: upstream.length,
      downstreamCount: downstream.length,
      potentiallyAffected: uniqueAffected,
      analysisDate: new Date().toISOString(),
    };
  }

  /**
   * Get all upstream dependencies (transitive).
   * These are assets that this asset depends on.
   */
  getTransitiveUpstream(assetId: string, visited: Set<string> = new Set()): AssetRelationship[] {
    if (visited.has(assetId)) return [];
    visited.add(assetId);

    const direct = this.relationshipRepo.getUpstream(assetId);
    const all: AssetRelationship[] = [...direct];

    for (const rel of direct) {
      const transitive = this.getTransitiveUpstream(rel.sourceAssetId, visited);
      all.push(...transitive);
    }

    return all;
  }

  /**
   * Get all downstream dependencies (transitive).
   * These are assets that depend on this asset.
   */
  getTransitiveDownstream(assetId: string, visited: Set<string> = new Set()): AssetRelationship[] {
    if (visited.has(assetId)) return [];
    visited.add(assetId);

    const direct = this.relationshipRepo.getDownstream(assetId);
    const all: AssetRelationship[] = [...direct];

    for (const rel of direct) {
      const transitive = this.getTransitiveDownstream(rel.targetAssetId, visited);
      all.push(...transitive);
    }

    return all;
  }

  /**
   * Get direct upstream assets (one level).
   */
  getDirectUpstreamAssets(assetId: string): Asset[] {
    const upstream = this.relationshipRepo.getUpstream(assetId);
    return upstream
      .map(rel => this.assetRepo.getById(rel.sourceAssetId))
      .filter((a): a is Asset => a !== undefined);
  }

  /**
   * Get direct downstream assets (one level).
   */
  getDirectDownstreamAssets(assetId: string): Asset[] {
    const downstream = this.relationshipRepo.getDownstream(assetId);
    return downstream
      .map(rel => this.assetRepo.getById(rel.targetAssetId))
      .filter((a): a is Asset => a !== undefined);
  }

  /**
   * Get all transitive downstream assets (full depth).
   */
  getAllDownstreamAssets(assetId: string): Asset[] {
    const downstream = this.getTransitiveDownstream(assetId);
    const assetIds = new Set(downstream.map(r => r.targetAssetId));
    return Array.from(assetIds)
      .map(id => this.assetRepo.getById(id))
      .filter((a): a is Asset => a !== undefined);
  }

  /**
   * Get all transitive upstream assets (full depth).
   */
  getAllUpstreamAssets(assetId: string): Asset[] {
    const upstream = this.getTransitiveUpstream(assetId);
    const assetIds = new Set(upstream.map(r => r.sourceAssetId));
    return Array.from(assetIds)
      .map(id => this.assetRepo.getById(id))
      .filter((a): a is Asset => a !== undefined);
  }
}
