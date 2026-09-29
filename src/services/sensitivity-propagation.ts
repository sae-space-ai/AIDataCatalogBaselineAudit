// ============================================================
// SERVICES — Sensitivity Propagation Service
// ============================================================
// Minimal deterministic mapping from classification to sensitivity
// Preserves provenance and evidence

import type { AssetRepository, ClassificationRepository, EvidenceRepository, AuditRepository } from '../domain/contracts';
import type { Asset, Classification, SensitivityLevel } from '../types';
import { generateId } from '../lib/utils';

export class SensitivityPropagationService {
  constructor(
    private assetRepo: AssetRepository,
    private classificationRepo: ClassificationRepository,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  /**
   * Propagate sensitivity from classification to asset.
   * Only updates if classification confidence is high enough.
   */
  propagateFromClassification(assetId: string): void {
    const asset = this.assetRepo.getById(assetId);
    if (!asset) return;

    const classifications = this.classificationRepo.getByAssetId(assetId);
    if (classifications.length === 0) return;

    // Find highest confidence classification
    const highestConfidence = classifications.reduce((max, c) => 
      c.confidence > max.confidence ? c : max, classifications[0]);

    // Map classification to sensitivity
    const sensitivity = this.mapClassificationToSensitivity(highestConfidence);
    
    if (sensitivity && sensitivity !== asset.sensitivity) {
      // Update asset sensitivity
      this.assetRepo.update(assetId, {
        sensitivity,
        updatedAt: new Date().toISOString(),
      });

      // Generate evidence
      this.evidenceRepo.save({
        id: generateId(),
        type: 'ASSET_UPDATED',
        subjectType: 'Asset',
        subjectId: assetId,
        actor: 'system:sensitivity-propagation',
        timestamp: new Date().toISOString(),
        source: 'SensitivityPropagationService.propagateFromClassification',
        metadata: {
          previousSensitivity: asset.sensitivity,
          newSensitivity: sensitivity,
          derivedFromClassification: highestConfidence.classificationType,
          classificationConfidence: highestConfidence.confidence,
          classificationId: highestConfidence.id,
        },
      });

      // Generate audit
      this.auditRepo.save({
        id: generateId(),
        actor: 'system:sensitivity-propagation',
        action: 'UPDATE',
        resourceType: 'Asset',
        resourceId: assetId,
        timestamp: new Date().toISOString(),
        details: {
          field: 'sensitivity',
          previousValue: asset.sensitivity,
          newValue: sensitivity,
          derivedFrom: highestConfidence.classificationType,
        },
      });
    }
  }

  /**
   * Propagate sensitivity for all assets.
   */
  propagateAll(): void {
    const assets = this.assetRepo.getAll();
    for (const asset of assets) {
      this.propagateFromClassification(asset.id);
    }
  }

  /**
   * Map classification type to sensitivity level.
   * Deterministic mapping based on data protection principles.
   */
  private mapClassificationToSensitivity(classification: Classification): SensitivityLevel | null {
    // Only propagate if confidence is high enough
    if (classification.confidence < 0.7) {
      return null; // Uncertain - requires human review
    }

    // Deterministic mapping
    switch (classification.classificationType) {
      case 'PII_EMAIL':
      case 'PII_NAME':
      case 'PII_PHONE':
        return 'CONFIDENTIAL';
      
      case 'FINANCIAL':
        return 'RESTRICTED';
      
      case 'IDENTIFIER':
        return 'INTERNAL';
      
      case 'GEOGRAPHIC':
        return 'INTERNAL';
      
      case 'TIMESTAMP':
        return 'PUBLIC';
      
      case 'NONE':
        return 'PUBLIC';
      
      default:
        return null;
    }
  }
}
