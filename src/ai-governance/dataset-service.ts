// ============================================================
// AI GOVERNANCE — Dataset Governance Service
// ============================================================

import type { DatasetProfile, DatasetGovernanceSnapshot, DatasetRole } from './types';
import type { AssetRepository, EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class DatasetGovernanceService {
  private profiles: Map<string, DatasetProfile> = new Map();
  private snapshots: Map<string, DatasetGovernanceSnapshot> = new Map();

  constructor(
    private assetRepo: AssetRepository,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  // ---- Dataset Profile Management ----

  registerDatasetProfile(profile: DatasetProfile): void {
    this.profiles.set(profile.assetId, profile);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:dataset-governance',
      action: 'CREATE',
      resourceType: 'DatasetProfile',
      resourceId: profile.assetId,
      timestamp: new Date().toISOString(),
      details: { role: profile.datasetRole, purpose: profile.datasetPurpose },
    });
  }

  getDatasetProfile(assetId: string): DatasetProfile | undefined {
    return this.profiles.get(assetId);
  }

  listDatasetProfiles(role?: DatasetRole): DatasetProfile[] {
    const all = Array.from(this.profiles.values());
    if (role) {
      return all.filter(p => p.datasetRole === role);
    }
    return all;
  }

  updateDatasetProfile(assetId: string, updates: Partial<DatasetProfile>): void {
    const profile = this.profiles.get(assetId);
    if (!profile) {
      throw new Error(`Dataset profile ${assetId} not found`);
    }

    const updated = { ...profile, ...updates, updatedAt: new Date().toISOString() };
    this.profiles.set(assetId, updated);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:dataset-governance',
      action: 'UPDATE',
      resourceType: 'DatasetProfile',
      resourceId: assetId,
      timestamp: new Date().toISOString(),
      details: { updates: Object.keys(updates) },
    });
  }

  // ---- Dataset Governance Snapshot ----

  createGovernanceSnapshot(
    datasetAssetId: string,
    assetVersionId: string,
    schemaFingerprint: string,
    classificationSnapshot: DatasetGovernanceSnapshot['classificationSnapshot'],
    qualitySnapshot: DatasetGovernanceSnapshot['qualitySnapshot'],
    lineageSnapshot: DatasetGovernanceSnapshot['lineageSnapshot'],
    policyAssessmentIds: string[] = [],
    evidenceIds: string[] = []
  ): DatasetGovernanceSnapshot {
    const snapshot: DatasetGovernanceSnapshot = {
      datasetAssetId,
      assetVersionId,
      schemaFingerprint,
      classificationSnapshot,
      qualitySnapshot,
      lineageSnapshot,
      policyAssessmentIds,
      evidenceIds,
      createdAt: new Date().toISOString(),
    };

    this.snapshots.set(`${datasetAssetId}:${assetVersionId}`, snapshot);

    // Generate evidence
    this.evidenceRepo.save({
      id: generateId(),
      type: 'ASSET_DISCOVERED',
      subjectType: 'DatasetGovernanceSnapshot',
      subjectId: `${datasetAssetId}:${assetVersionId}`,
      actor: 'system:dataset-governance',
      timestamp: new Date().toISOString(),
      source: 'DatasetGovernanceService.createGovernanceSnapshot',
      metadata: { datasetAssetId, assetVersionId },
    });

    return snapshot;
  }

  getGovernanceSnapshot(datasetAssetId: string, assetVersionId: string): DatasetGovernanceSnapshot | undefined {
    return this.snapshots.get(`${datasetAssetId}:${assetVersionId}`);
  }

  listGovernanceSnapshots(datasetAssetId: string): DatasetGovernanceSnapshot[] {
    return Array.from(this.snapshots.values()).filter(s => s.datasetAssetId === datasetAssetId);
  }
}
