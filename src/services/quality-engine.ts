// ============================================================
// SERVICES — Quality Engine
// ============================================================

import type { QualityRepository, EvidenceRepository, AuditRepository } from '../domain/contracts';
import type { DemoConnector } from '../infrastructure/demo-connector';
import type { Asset, ColumnMetadata, QualityResult, QualityRuleType, QualityStatus, TableMetadata } from '../types';
import { generateId } from '../lib/utils';

interface QualityCheckDefinition {
  ruleType: QualityRuleType;
  threshold: number;
  description: string;
}

const COLUMN_QUALITY_RULES: QualityCheckDefinition[] = [
  {
    ruleType: 'NULL_RATIO',
    threshold: 0.05, // 5% max null ratio for PASS
    description: 'Null ratio should be below 5% for critical columns.',
  },
  {
    ruleType: 'UNIQUENESS',
    threshold: 0.95, // 95% uniqueness for identifiers
    description: 'Identifier columns should have >95% unique values.',
  },
];

const TABLE_QUALITY_RULES: QualityCheckDefinition[] = [
  {
    ruleType: 'ROW_COUNT',
    threshold: 1, // At least 1 row
    description: 'Table should not be empty.',
  },
];

export class QualityEngine {
  constructor(
    private qualityRepo: QualityRepository,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository,
    private demoConnector?: DemoConnector
  ) {}

  checkAsset(asset: Asset): QualityResult[] {
    const results: QualityResult[] = [];

    if (asset.type === 'COLUMN') {
      const meta = asset.metadata as ColumnMetadata;
      if (meta.kind !== 'COLUMN') return results;

      // Get stats from demo connector if available
      const stats = this.demoConnector?.getColumnStats(asset.qualifiedName);
      if (!stats) return results;

      // NULL_RATIO check
      const nullRatio = stats.rowCount > 0 ? stats.nullCount / stats.rowCount : 0;
      const nullRule = COLUMN_QUALITY_RULES.find(r => r.ruleType === 'NULL_RATIO')!;
      let nullStatus: QualityStatus = 'PASS';
      if (nullRatio > nullRule.threshold * 2) nullStatus = 'FAIL';
      else if (nullRatio > nullRule.threshold) nullStatus = 'WARN';

      const nullResult: QualityResult = {
        id: generateId(),
        assetId: asset.id,
        ruleType: 'NULL_RATIO',
        measuredValue: Math.round(nullRatio * 10000) / 10000,
        threshold: nullRule.threshold,
        status: nullStatus,
        timestamp: new Date().toISOString(),
        details: `Null count: ${stats.nullCount}/${stats.rowCount}`,
      };
      results.push(nullResult);
      this.qualityRepo.save(nullResult);

      // UNIQUENESS check (only for potential identifiers)
      if (meta.dataType === 'integer' || asset.name.endsWith('_id')) {
        const uniqueness = stats.rowCount > 0 ? stats.uniqueCount / stats.rowCount : 0;
        const uniqueRule = COLUMN_QUALITY_RULES.find(r => r.ruleType === 'UNIQUENESS')!;
        let uniqueStatus: QualityStatus = 'PASS';
        if (uniqueness < uniqueRule.threshold * 0.8) uniqueStatus = 'FAIL';
        else if (uniqueness < uniqueRule.threshold) uniqueStatus = 'WARN';

        const uniqueResult: QualityResult = {
          id: generateId(),
          assetId: asset.id,
          ruleType: 'UNIQUENESS',
          measuredValue: Math.round(uniqueness * 10000) / 10000,
          threshold: uniqueRule.threshold,
          status: uniqueStatus,
          timestamp: new Date().toISOString(),
          details: `Unique count: ${stats.uniqueCount}/${stats.rowCount}`,
        };
        results.push(uniqueResult);
        this.qualityRepo.save(uniqueResult);
      }
    } else if (asset.type === 'TABLE') {
      const meta = asset.metadata as TableMetadata;
      if (meta.kind !== 'TABLE') return results;

      const rowCount = meta.rowCount ?? 0;
      const rowRule = TABLE_QUALITY_RULES.find(r => r.ruleType === 'ROW_COUNT')!;
      const rowStatus: QualityStatus = rowCount >= rowRule.threshold ? 'PASS' : 'FAIL';

      const rowResult: QualityResult = {
        id: generateId(),
        assetId: asset.id,
        ruleType: 'ROW_COUNT',
        measuredValue: rowCount,
        threshold: rowRule.threshold,
        status: rowStatus,
        timestamp: new Date().toISOString(),
        details: `Row count: ${rowCount}`,
      };
      results.push(rowResult);
      this.qualityRepo.save(rowResult);
    }

    // Generate evidence for each result
    for (const result of results) {
      this.evidenceRepo.save({
        id: generateId(),
        type: 'QUALITY_CHECK_COMPLETED',
        subjectType: 'Asset',
        subjectId: asset.id,
        actor: 'system:quality-engine',
        timestamp: new Date().toISOString(),
        source: 'QualityEngine.checkAsset',
        metadata: {
          ruleType: result.ruleType,
          measuredValue: result.measuredValue,
          threshold: result.threshold,
          status: result.status,
        },
      });
    }

    return results;
  }

  checkAll(assets: Asset[]): QualityResult[] {
    const results: QualityResult[] = [];
    for (const asset of assets) {
      const assetResults = this.checkAsset(asset);
      results.push(...assetResults);
    }

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:quality-engine',
      action: 'CREATE',
      resourceType: 'QualityResult',
      resourceId: 'batch',
      timestamp: new Date().toISOString(),
      details: { assetsProcessed: assets.length, checksCreated: results.length },
    });

    return results;
  }

  getQualityScore(assetId: string): number {
    const results = this.qualityRepo.getByAssetId(assetId);
    if (results.length === 0) return 0;

    const statusScores: Record<QualityStatus, number> = {
      PASS: 1.0,
      WARN: 0.6,
      WARNING: 0.6, // Deprecated, same as WARN
      FAIL: 0.0,
      NOT_EVALUATED: 0.0,
    };

    const totalScore = results.reduce((sum, r) => sum + statusScores[r.status], 0);
    return Math.round((totalScore / results.length) * 100);
  }
}
