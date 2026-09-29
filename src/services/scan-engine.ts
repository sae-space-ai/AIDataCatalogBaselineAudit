// ============================================================
// SERVICES — Scan Engine (Pipeline Orchestrator)
// SOURCE → CONNECTION → SCAN → DISCOVERY → ASSET → METADATA →
// CLASSIFICATION → QUALITY → EVIDENCE → AUDIT
// ============================================================

import type {
  AssetRepository,
  AssetVersionRepository,
  AuditRepository,
  ConnectorRegistry,
  EvidenceRepository,
  RelationshipRepository,
  ScanRepository,
  SourceRepository,
} from '../domain/contracts';
import type { ClassificationEngine } from './classification-engine';
import type { QualityEngine } from './quality-engine';
import type { TrustScoreService } from './trust-score';
import type {
  Asset,
  AssetRelationship,
  AssetType,
  DataSource,
  DiscoveredAsset,
  RelationshipType,
  ScanRun,
} from '../types';
import { generateId } from '../lib/utils';

export interface ScanResult {
  scanRun: ScanRun;
  assetsCreated: number;
  relationshipsCreated: number;
  classificationsCreated: number;
  qualityChecksCreated: number;
  errors: string[];
}

export class ScanEngine {
  constructor(
    private sourceRepo: SourceRepository,
    private scanRepo: ScanRepository,
    private assetRepo: AssetRepository,
    private assetVersionRepo: AssetVersionRepository,
    private relationshipRepo: RelationshipRepository,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository,
    private connectorRegistry: ConnectorRegistry,
    private classificationEngine: ClassificationEngine,
    private qualityEngine: QualityEngine,
    private trustScoreService: TrustScoreService
  ) {}

  async executeScan(sourceId: string): Promise<ScanResult> {
    const source = this.sourceRepo.getById(sourceId);
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    const errors: string[] = [];

    // 1. Create ScanRun
    const scanRun: ScanRun = {
      id: generateId(),
      sourceId,
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
      assetsDiscovered: 0,
      assetsUpdated: 0,
    };
    this.scanRepo.save(scanRun);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:scan-engine',
      action: 'SCAN',
      resourceType: 'ScanRun',
      resourceId: scanRun.id,
      timestamp: new Date().toISOString(),
      details: { sourceId, sourceName: source.name },
    });

    try {
      // 2. Get connector
      const connector = this.connectorRegistry.getConnector(source.type);
      if (!connector) {
        throw new Error(`No connector available for source type: ${source.type}`);
      }

      // 3. Test connection
      const connectionResult = await connector.testConnection();
      if (!connectionResult.success) {
        throw new Error(`Connection test failed: ${connectionResult.message}`);
      }

      this.evidenceRepo.save({
        id: generateId(),
        type: 'CONNECTION_TESTED',
        subjectType: 'DataSource',
        subjectId: sourceId,
        actor: 'system:scan-engine',
        timestamp: new Date().toISOString(),
        source: 'ScanEngine.executeScan',
        metadata: { success: true, latencyMs: connectionResult.latencyMs },
      });

      // 4. Discover assets
      const discoveryResult = await connector.discover();

      // 5. Create/update assets
      const createdAssets: Asset[] = [];
      const qualifiedNameToId = new Map<string, string>();

      for (const discovered of discoveryResult.assets) {
        // Check if asset already exists by qualified name
        const existing = this.assetRepo.getAll().find(
          a => a.qualifiedName === discovered.qualifiedName && a.sourceId === sourceId
        );

        if (existing) {
          // Update existing asset
          this.assetRepo.update(existing.id, {
            metadata: discovered.metadata,
            description: discovered.description,
            updatedAt: new Date().toISOString(),
          });
          qualifiedNameToId.set(discovered.qualifiedName, existing.id);

          // Create version
          const updatedAsset = this.assetRepo.getById(existing.id)!;
          this.assetVersionRepo.save({
            id: generateId(),
            assetId: existing.id,
            version: this.getNextVersion(existing.id),
            snapshot: updatedAsset,
            changedAt: new Date().toISOString(),
            changedBy: 'system:scan-engine',
            reason: 'Scan update',
          });
        } else {
          // Create new asset
          const asset: Asset = {
            id: generateId(),
            sourceId,
            type: discovered.type,
            name: discovered.name,
            qualifiedName: discovered.qualifiedName,
            description: discovered.description,
            status: 'DISCOVERED',
            sensitivity: 'UNKNOWN',
            certificationStatus: 'UNCERTIFIED',
            metadata: discovered.metadata,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          this.assetRepo.save(asset);
          createdAssets.push(asset);
          qualifiedNameToId.set(discovered.qualifiedName, asset.id);

          // Create initial version
          this.assetVersionRepo.save({
            id: generateId(),
            assetId: asset.id,
            version: 1,
            snapshot: asset,
            changedAt: new Date().toISOString(),
            changedBy: 'system:scan-engine',
            reason: 'Initial discovery',
          });

          // Evidence
          this.evidenceRepo.save({
            id: generateId(),
            type: 'ASSET_DISCOVERED',
            subjectType: 'Asset',
            subjectId: asset.id,
            actor: 'system:scan-engine',
            timestamp: new Date().toISOString(),
            source: 'ScanEngine.executeScan',
            metadata: { type: asset.type, name: asset.name, qualifiedName: asset.qualifiedName },
          });
        }
      }

      // 6. Create relationships
      const relationships: AssetRelationship[] = [];
      for (const rel of discoveryResult.relationships) {
        const sourceAssetId = qualifiedNameToId.get(rel.sourceQualifiedName);
        const targetAssetId = qualifiedNameToId.get(rel.targetQualifiedName);

        if (sourceAssetId && targetAssetId) {
          // Check if relationship already exists
          const existingRels = this.relationshipRepo.getAll();
          const exists = existingRels.some(
            r => r.sourceAssetId === sourceAssetId &&
                 r.targetAssetId === targetAssetId &&
                 r.type === rel.type
          );

          if (!exists) {
            const relationship: AssetRelationship = {
              id: generateId(),
              sourceAssetId,
              targetAssetId,
              type: rel.type,
              createdAt: new Date().toISOString(),
            };
            relationships.push(relationship);
          }
        }
      }

      if (relationships.length > 0) {
        this.relationshipRepo.saveMany(relationships);
      }

      // 7. Classification
      const allSourceAssets = this.assetRepo.getBySourceId(sourceId);
      const classifications = this.classificationEngine.classifyAll(allSourceAssets);

      // 8. Quality checks
      const qualityResults = this.qualityEngine.checkAll(allSourceAssets);

      // 9. Trust scores
      this.trustScoreService.calculateAll();

      // 10. Update scan run
      const completedScan = this.scanRepo.update(scanRun.id, {
        status: 'SUCCESS',
        finishedAt: new Date().toISOString(),
        assetsDiscovered: createdAssets.length,
        assetsUpdated: discoveryResult.assets.length - createdAssets.length,
      });

      // Update source lastScanAt
      this.sourceRepo.update(sourceId, {
        lastScanAt: new Date().toISOString(),
        status: 'ACTIVE',
      });

      // Evidence
      this.evidenceRepo.save({
        id: generateId(),
        type: 'SCAN_COMPLETED',
        subjectType: 'ScanRun',
        subjectId: scanRun.id,
        actor: 'system:scan-engine',
        timestamp: new Date().toISOString(),
        source: 'ScanEngine.executeScan',
        metadata: {
          assetsCreated: createdAssets.length,
          relationshipsCreated: relationships.length,
          classificationsCreated: classifications.length,
          qualityChecksCreated: qualityResults.length,
        },
      });

      this.auditRepo.save({
        id: generateId(),
        actor: 'system:scan-engine',
        action: 'SCAN',
        resourceType: 'DataSource',
        resourceId: sourceId,
        timestamp: new Date().toISOString(),
        details: { scanId: scanRun.id, status: 'SUCCESS' },
      });

      return {
        scanRun: completedScan!,
        assetsCreated: createdAssets.length,
        relationshipsCreated: relationships.length,
        classificationsCreated: classifications.length,
        qualityChecksCreated: qualityResults.length,
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);

      this.scanRepo.update(scanRun.id, {
        status: 'FAILED',
        finishedAt: new Date().toISOString(),
        error: errorMessage,
      });

      this.evidenceRepo.save({
        id: generateId(),
        type: 'SCAN_FAILED',
        subjectType: 'ScanRun',
        subjectId: scanRun.id,
        actor: 'system:scan-engine',
        timestamp: new Date().toISOString(),
        source: 'ScanEngine.executeScan',
        metadata: { error: errorMessage },
      });

      this.auditRepo.save({
        id: generateId(),
        actor: 'system:scan-engine',
        action: 'SCAN',
        resourceType: 'DataSource',
        resourceId: sourceId,
        timestamp: new Date().toISOString(),
        details: { scanId: scanRun.id, status: 'FAILED', error: errorMessage },
      });

      return {
        scanRun: this.scanRepo.getById(scanRun.id)!,
        assetsCreated: 0,
        relationshipsCreated: 0,
        classificationsCreated: 0,
        qualityChecksCreated: 0,
        errors,
      };
    }
  }

  private getNextVersion(assetId: string): number {
    const versions = this.assetVersionRepo.getByAssetId(assetId);
    if (versions.length === 0) return 1;
    return Math.max(...versions.map(v => v.version)) + 1;
  }
}
