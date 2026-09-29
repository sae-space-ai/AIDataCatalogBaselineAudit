// ============================================================
// AI GOVERNANCE — Training Data Service
// ============================================================

import type { 
  TrainingDatasetRecord, 
  TrainingDataApprovalStatus 
} from './types';
import type { EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class TrainingDataService {
  private records: Map<string, TrainingDatasetRecord> = new Map();

  constructor(
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  // ---- Training Dataset Registration ----

  registerTrainingDataset(
    datasetAssetId: string,
    datasetVersionId: string,
    purpose: string,
    intendedUse: string,
    allowedUses: string[] = [],
    restrictedUses: string[] = [],
    sourceReferences: string[] = []
  ): TrainingDatasetRecord {
    const record: TrainingDatasetRecord = {
      id: generateId(),
      datasetAssetId,
      datasetVersionId,
      purpose,
      intendedUse,
      allowedUses,
      restrictedUses,
      sourceReferences,
      lineageStatus: 'NOT_EVALUATED',
      classificationStatus: 'NOT_EVALUATED',
      qualityStatus: 'NOT_EVALUATED',
      approvalStatus: 'NOT_EVALUATED',
      evidenceIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.records.set(record.id, record);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:training-data',
      action: 'CREATE',
      resourceType: 'TrainingDatasetRecord',
      resourceId: record.id,
      timestamp: new Date().toISOString(),
      details: { datasetAssetId, purpose, intendedUse },
    });

    return record;
  }

  getTrainingDataset(id: string): TrainingDatasetRecord | undefined {
    return this.records.get(id);
  }

  getTrainingDatasetByAsset(datasetAssetId: string): TrainingDatasetRecord | undefined {
    return Array.from(this.records.values()).find(r => r.datasetAssetId === datasetAssetId);
  }

  listTrainingDatasets(approvalStatus?: TrainingDataApprovalStatus): TrainingDatasetRecord[] {
    const all = Array.from(this.records.values());
    if (approvalStatus) {
      return all.filter(r => r.approvalStatus === approvalStatus);
    }
    return all;
  }

  // ---- Status Updates ----

  updateLineageStatus(id: string, status: TrainingDatasetRecord['lineageStatus']): void {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Training dataset ${id} not found`);
    }

    record.lineageStatus = status;
    record.updatedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:training-data',
      action: 'UPDATE',
      resourceType: 'TrainingDatasetRecord',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { field: 'lineageStatus', value: status },
    });
  }

  updateClassificationStatus(id: string, status: TrainingDatasetRecord['classificationStatus']): void {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Training dataset ${id} not found`);
    }

    record.classificationStatus = status;
    record.updatedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:training-data',
      action: 'UPDATE',
      resourceType: 'TrainingDatasetRecord',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { field: 'classificationStatus', value: status },
    });
  }

  updateQualityStatus(id: string, status: TrainingDatasetRecord['qualityStatus']): void {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Training dataset ${id} not found`);
    }

    record.qualityStatus = status;
    record.updatedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:training-data',
      action: 'UPDATE',
      resourceType: 'TrainingDatasetRecord',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { field: 'qualityStatus', value: status },
    });
  }

  // ---- Approval Workflow ----

  requestApproval(id: string, humanReviewTaskId?: string): void {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Training dataset ${id} not found`);
    }

    record.approvalStatus = 'PENDING_REVIEW';
    record.humanReviewTaskId = humanReviewTaskId;
    record.updatedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:training-data',
      action: 'UPDATE',
      resourceType: 'TrainingDatasetRecord',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { approvalStatus: 'PENDING_REVIEW', humanReviewTaskId },
    });
  }

  approveTrainingDataset(id: string, approvedBy: string, withConditions: boolean = false): void {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Training dataset ${id} not found`);
    }

    record.approvalStatus = withConditions ? 'APPROVED_WITH_CONDITIONS' : 'APPROVED';
    record.updatedAt = new Date().toISOString();

    // Generate evidence
    const evidenceId = generateId();
    this.evidenceRepo.save({
      id: evidenceId,
      type: 'CLASSIFICATION_REVIEWED',
      subjectType: 'TrainingDatasetRecord',
      subjectId: id,
      actor: approvedBy,
      timestamp: new Date().toISOString(),
      source: 'TrainingDataService.approveTrainingDataset',
      metadata: { approvalStatus: record.approvalStatus },
    });
    record.evidenceIds.push(evidenceId);

    this.auditRepo.save({
      id: generateId(),
      actor: approvedBy,
      action: 'REVIEW',
      resourceType: 'TrainingDatasetRecord',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { approvalStatus: record.approvalStatus },
    });
  }

  rejectTrainingDataset(id: string, rejectedBy: string, reason: string): void {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Training dataset ${id} not found`);
    }

    record.approvalStatus = 'REJECTED';
    record.updatedAt = new Date().toISOString();

    // Generate evidence
    const evidenceId = generateId();
    this.evidenceRepo.save({
      id: evidenceId,
      type: 'CLASSIFICATION_REVIEWED',
      subjectType: 'TrainingDatasetRecord',
      subjectId: id,
      actor: rejectedBy,
      timestamp: new Date().toISOString(),
      source: 'TrainingDataService.rejectTrainingDataset',
      metadata: { approvalStatus: 'REJECTED', reason },
    });
    record.evidenceIds.push(evidenceId);

    this.auditRepo.save({
      id: generateId(),
      actor: rejectedBy,
      action: 'REVIEW',
      resourceType: 'TrainingDatasetRecord',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { approvalStatus: 'REJECTED', reason },
    });
  }

  suspendTrainingDataset(id: string, suspendedBy: string, reason: string): void {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Training dataset ${id} not found`);
    }

    record.approvalStatus = 'SUSPENDED';
    record.updatedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: suspendedBy,
      action: 'UPDATE',
      resourceType: 'TrainingDatasetRecord',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { approvalStatus: 'SUSPENDED', reason },
    });
  }

  markAsStale(id: string): void {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Training dataset ${id} not found`);
    }

    record.approvalStatus = 'STALE';
    record.updatedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:training-data',
      action: 'UPDATE',
      resourceType: 'TrainingDatasetRecord',
      resourceId: id,
      timestamp: new Date().toISOString(),
      details: { approvalStatus: 'STALE' },
    });
  }

  // ---- Traceability ----

  getTraceability(id: string): {
    dataset: TrainingDatasetRecord;
    lineage: string;
    classification: string;
    quality: string;
    approval: string;
  } | undefined {
    const record = this.records.get(id);
    if (!record) return undefined;

    return {
      dataset: record,
      lineage: `Lineage status: ${record.lineageStatus}`,
      classification: `Classification status: ${record.classificationStatus}`,
      quality: `Quality status: ${record.qualityStatus}`,
      approval: `Approval status: ${record.approvalStatus}`,
    };
  }
}
