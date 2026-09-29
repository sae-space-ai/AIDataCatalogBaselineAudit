// ============================================================
// SERVICES — Trust Score Service
// ============================================================

import type {
  AssetRepository,
  ClassificationRepository,
  QualityRepository,
  TrustScoreRepository,
  EvidenceRepository,
} from '../domain/contracts';
import type { Asset, TrustScore, TrustScoreComponent } from '../types';
import { generateId } from '../lib/utils';

interface TrustScoreWeights {
  metadataCompleteness: number;
  qualityScore: number;
  classificationConfidence: number;
  ownership: number;
}

const DEFAULT_WEIGHTS: TrustScoreWeights = {
  metadataCompleteness: 0.25,
  qualityScore: 0.35,
  classificationConfidence: 0.25,
  ownership: 0.15,
};

export class TrustScoreService {
  private weights: TrustScoreWeights;

  constructor(
    private assetRepo: AssetRepository,
    private classificationRepo: ClassificationRepository,
    private qualityRepo: QualityRepository,
    private trustScoreRepo: TrustScoreRepository,
    private evidenceRepo: EvidenceRepository,
    weights?: Partial<TrustScoreWeights>
  ) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  calculateForAsset(asset: Asset): TrustScore {
    const components: TrustScoreComponent[] = [];

    // 1. Metadata Completeness
    const metadataScore = this.calculateMetadataCompleteness(asset);
    components.push({
      factor: 'Metadata Completeness',
      weight: this.weights.metadataCompleteness,
      value: metadataScore,
      contribution: metadataScore * this.weights.metadataCompleteness,
    });

    // 2. Quality Score
    const qualityResults = this.qualityRepo.getByAssetId(asset.id);
    let qualityScore = 0;
    if (qualityResults.length > 0) {
      const statusScores: Record<string, number> = { PASS: 100, WARNING: 60, FAIL: 0 };
      const total = qualityResults.reduce((sum, r) => sum + (statusScores[r.status] ?? 0), 0);
      qualityScore = total / qualityResults.length;
    } else {
      qualityScore = asset.type === 'COLUMN' || asset.type === 'TABLE' ? 0 : 50;
    }
    components.push({
      factor: 'Quality Score',
      weight: this.weights.qualityScore,
      value: qualityScore,
      contribution: qualityScore * this.weights.qualityScore,
    });

    // 3. Classification Confidence
    const classifications = this.classificationRepo.getByAssetId(asset.id);
    let classificationScore = 0;
    if (classifications.length > 0) {
      const avgConfidence = classifications.reduce((sum, c) => sum + c.confidence, 0) / classifications.length;
      classificationScore = avgConfidence * 100;
    } else {
      classificationScore = asset.type === 'COLUMN' ? 0 : 50;
    }
    components.push({
      factor: 'Classification Confidence',
      weight: this.weights.classificationConfidence,
      value: classificationScore,
      contribution: classificationScore * this.weights.classificationConfidence,
    });

    // 4. Ownership
    const ownershipScore = asset.owner ? 100 : (asset.domain ? 50 : 0);
    components.push({
      factor: 'Ownership & Governance',
      weight: this.weights.ownership,
      value: ownershipScore,
      contribution: ownershipScore * this.weights.ownership,
    });

    // Total score
    const totalScore = Math.round(
      components.reduce((sum, c) => sum + c.contribution, 0)
    );

    const trustScore: TrustScore = {
      assetId: asset.id,
      score: totalScore,
      components,
      explanation: this.generateExplanation(totalScore, components),
      calculatedAt: new Date().toISOString(),
    };

    this.trustScoreRepo.save(trustScore);
    return trustScore;
  }

  calculateAll(): TrustScore[] {
    const assets = this.assetRepo.getAll();
    return assets.map(asset => this.calculateForAsset(asset));
  }

  private calculateMetadataCompleteness(asset: Asset): number {
    let score = 0;
    let total = 0;

    // Required fields
    const requiredFields: Array<{ key: keyof Asset; weight: number }> = [
      { key: 'name', weight: 20 },
      { key: 'qualifiedName', weight: 20 },
      { key: 'type', weight: 10 },
      { key: 'description', weight: 15 },
      { key: 'owner', weight: 15 },
      { key: 'domain', weight: 10 },
    ];

    for (const field of requiredFields) {
      total += field.weight;
      if (asset[field.key]) {
        score += field.weight;
      }
    }

    // Metadata object has content
    total += 10;
    if (asset.metadata && Object.keys(asset.metadata).length > 0) {
      score += 10;
    }

    return total > 0 ? (score / total) * 100 : 0;
  }

  private generateExplanation(score: number, components: TrustScoreComponent[]): string {
    if (score >= 80) {
      return 'High trust: This asset has strong metadata, good quality scores, and reliable classification.';
    } else if (score >= 60) {
      const weakFactors = components.filter(c => c.value < 50).map(c => c.factor);
      if (weakFactors.length > 0) {
        return `Moderate trust: Areas for improvement — ${weakFactors.join(', ')}.`;
      }
      return 'Moderate trust: This asset meets basic governance requirements.';
    } else if (score >= 30) {
      return 'Low trust: This asset needs attention. Missing metadata, quality issues, or unreviewed classifications.';
    } else {
      return 'Very low trust: This asset requires immediate governance attention.';
    }
  }

  getWeights(): TrustScoreWeights {
    return { ...this.weights };
  }
}
