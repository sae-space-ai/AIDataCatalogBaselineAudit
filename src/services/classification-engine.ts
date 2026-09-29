// ============================================================
// SERVICES — Classification Engine
// Deterministic rules-based classification
// ============================================================

import type { ClassificationRepository, EvidenceRepository, AuditRepository } from '../domain/contracts';
import type { Asset, Classification, ClassificationType, ColumnMetadata } from '../types';
import { generateId } from '../lib/utils';

interface ClassificationRule {
  id: string;
  pattern: RegExp;
  classificationType: ClassificationType;
  confidence: number;
  reason: string;
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    id: 'rule-email-exact',
    pattern: /^email$/i,
    classificationType: 'PII_EMAIL',
    confidence: 0.98,
    reason: 'Column name matches "email" — high confidence PII email pattern.',
  },
  {
    id: 'rule-email-contains',
    pattern: /email/i,
    classificationType: 'PII_EMAIL',
    confidence: 0.85,
    reason: 'Column name contains "email" — likely PII email.',
  },
  {
    id: 'rule-name-pattern',
    pattern: /^(full_?name|first_?name|last_?name|nombre)$/i,
    classificationType: 'PII_NAME',
    confidence: 0.92,
    reason: 'Column name matches person name pattern — PII.',
  },
  {
    id: 'rule-name-contains',
    pattern: /name/i,
    classificationType: 'PII_NAME',
    confidence: 0.6,
    reason: 'Column name contains "name" — possible PII name.',
  },
  {
    id: 'rule-phone-exact',
    pattern: /^phone$|^tel(e phone)?$/i,
    classificationType: 'PII_PHONE',
    confidence: 0.95,
    reason: 'Column name matches phone pattern — PII phone number.',
  },
  {
    id: 'rule-phone-contains',
    pattern: /phone|mobile|cel/i,
    classificationType: 'PII_PHONE',
    confidence: 0.8,
    reason: 'Column name contains phone-related term — likely PII.',
  },
  {
    id: 'rule-identifier',
    pattern: /^.*_id$|^id$/i,
    classificationType: 'IDENTIFIER',
    confidence: 0.9,
    reason: 'Column name matches identifier pattern.',
  },
  {
    id: 'rule-timestamp',
    pattern: /created_at|updated_at|timestamp|date/i,
    classificationType: 'TIMESTAMP',
    confidence: 0.88,
    reason: 'Column name matches timestamp/date pattern.',
  },
  {
    id: 'rule-geographic',
    pattern: /region|country|city|state|zip|postal|address/i,
    classificationType: 'GEOGRAPHIC',
    confidence: 0.75,
    reason: 'Column name matches geographic pattern.',
  },
  {
    id: 'rule-financial',
    pattern: /salary|amount|price|balance|revenue/i,
    classificationType: 'FINANCIAL',
    confidence: 0.8,
    reason: 'Column name matches financial pattern.',
  },
];

export class ClassificationEngine {
  constructor(
    private classificationRepo: ClassificationRepository,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  classifyAsset(asset: Asset): Classification | null {
    // Only classify columns for now
    if (asset.type !== 'COLUMN') return null;

    const meta = asset.metadata as ColumnMetadata;
    if (meta.kind !== 'COLUMN') return null;

    const columnName = asset.name;

    for (const rule of CLASSIFICATION_RULES) {
      if (rule.pattern.test(columnName)) {
        const classification: Classification = {
          id: generateId(),
          assetId: asset.id,
          classificationType: rule.classificationType,
          confidence: rule.confidence,
          method: 'RULE',
          reason: rule.reason,
          ruleId: rule.id,
          reviewStatus: 'SUGGESTED',
          createdAt: new Date().toISOString(),
        };

        this.classificationRepo.save(classification);

        // Generate evidence
        this.evidenceRepo.save({
          id: generateId(),
          type: 'CLASSIFICATION_CREATED',
          subjectType: 'Asset',
          subjectId: asset.id,
          actor: 'system:classification-engine',
          timestamp: new Date().toISOString(),
          source: 'ClassificationEngine.classifyAsset',
          metadata: {
            classificationType: rule.classificationType,
            confidence: rule.confidence,
            method: 'RULE',
          },
        });

        return classification;
      }
    }

    // No rule matched — classify as NONE
    const noneClassification: Classification = {
      id: generateId(),
      assetId: asset.id,
      classificationType: 'NONE',
      confidence: 0.5,
      method: 'RULE',
      reason: 'No classification rule matched this column name.',
      ruleId: 'rule-none',
      reviewStatus: 'SUGGESTED',
      createdAt: new Date().toISOString(),
    };

    this.classificationRepo.save(noneClassification);
    return noneClassification;
  }

  classifyAll(assets: Asset[]): Classification[] {
    const results: Classification[] = [];
    for (const asset of assets) {
      const result = this.classifyAsset(asset);
      if (result) results.push(result);
    }

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:classification-engine',
      action: 'CLASSIFY',
      resourceType: 'Classification',
      resourceId: 'batch',
      timestamp: new Date().toISOString(),
      details: { assetsProcessed: assets.length, classificationsCreated: results.length },
    });

    return results;
  }

  reviewClassification(id: string, status: 'CONFIRMED' | 'REJECTED', reviewer: string): Classification | undefined {
    const updated = this.classificationRepo.update(id, {
      reviewStatus: status,
      reviewedBy: reviewer,
      reviewedAt: new Date().toISOString(),
    });

    if (updated) {
      this.evidenceRepo.save({
        id: generateId(),
        type: 'CLASSIFICATION_REVIEWED',
        subjectType: 'Classification',
        subjectId: id,
        actor: reviewer,
        timestamp: new Date().toISOString(),
        source: 'ClassificationEngine.reviewClassification',
        metadata: { newStatus: status },
      });

      this.auditRepo.save({
        id: generateId(),
        actor: reviewer,
        action: 'REVIEW',
        resourceType: 'Classification',
        resourceId: id,
        timestamp: new Date().toISOString(),
        details: { newStatus: status },
      });
    }

    return updated;
  }
}
