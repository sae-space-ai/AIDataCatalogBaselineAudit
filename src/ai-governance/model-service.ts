// ============================================================
// AI GOVERNANCE — Model Governance Service
// ============================================================

import type { 
  ModelProfile, 
  ModelInputSpecification, 
  ModelOutputSpecification 
} from './types';
import type { EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

export class ModelGovernanceService {
  private profiles: Map<string, ModelProfile> = new Map();

  constructor(
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  // ---- Model Profile Management ----

  registerModelProfile(
    assetId: string,
    modelName: string,
    modelVersion: string,
    modelType: string,
    purpose: string,
    intendedUse: string,
    providerReference?: string,
    limitations?: string[]
  ): ModelProfile {
    const profile: ModelProfile = {
      assetId,
      modelName,
      modelVersion,
      modelType,
      providerReference,
      purpose,
      intendedUse,
      limitations,
      inputSpecification: { fields: [] },
      outputSpecification: {
        outputType: 'UNKNOWN',
        meaning: 'Not specified',
        humanReviewRequired: false,
      },
      trainingDatasetReferences: [],
      validationDatasetReferences: [],
      testDatasetReferences: [],
      governanceStatus: 'NOT_EVALUATED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(assetId, profile);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:model-governance',
      action: 'CREATE',
      resourceType: 'ModelProfile',
      resourceId: assetId,
      timestamp: new Date().toISOString(),
      details: { modelName, modelVersion, modelType },
    });

    return profile;
  }

  getModelProfile(assetId: string): ModelProfile | undefined {
    return this.profiles.get(assetId);
  }

  listModelProfiles(): ModelProfile[] {
    return Array.from(this.profiles.values());
  }

  updateModelProfile(assetId: string, updates: Partial<ModelProfile>): void {
    const profile = this.profiles.get(assetId);
    if (!profile) {
      throw new Error(`Model profile ${assetId} not found`);
    }

    const updated = { ...profile, ...updates, updatedAt: new Date().toISOString() };
    this.profiles.set(assetId, updated);

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:model-governance',
      action: 'UPDATE',
      resourceType: 'ModelProfile',
      resourceId: assetId,
      timestamp: new Date().toISOString(),
      details: { updates: Object.keys(updates) },
    });
  }

  // ---- Input/Output Specification ----

  setInputSpecification(assetId: string, specification: ModelInputSpecification): void {
    const profile = this.profiles.get(assetId);
    if (!profile) {
      throw new Error(`Model profile ${assetId} not found`);
    }

    profile.inputSpecification = specification;
    profile.updatedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:model-governance',
      action: 'UPDATE',
      resourceType: 'ModelProfile',
      resourceId: assetId,
      timestamp: new Date().toISOString(),
      details: { field: 'inputSpecification', fieldCount: specification.fields.length },
    });
  }

  setOutputSpecification(assetId: string, specification: ModelOutputSpecification): void {
    const profile = this.profiles.get(assetId);
    if (!profile) {
      throw new Error(`Model profile ${assetId} not found`);
    }

    profile.outputSpecification = specification;
    profile.updatedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:model-governance',
      action: 'UPDATE',
      resourceType: 'ModelProfile',
      resourceId: assetId,
      timestamp: new Date().toISOString(),
      details: { field: 'outputSpecification' },
    });
  }

  // ---- Dataset References ----

  addTrainingDatasetReference(assetId: string, trainingDatasetRecordId: string): void {
    const profile = this.profiles.get(assetId);
    if (!profile) {
      throw new Error(`Model profile ${assetId} not found`);
    }

    if (!profile.trainingDatasetReferences.includes(trainingDatasetRecordId)) {
      profile.trainingDatasetReferences.push(trainingDatasetRecordId);
      profile.updatedAt = new Date().toISOString();

      this.auditRepo.save({
        id: generateId(),
        actor: 'system:model-governance',
        action: 'UPDATE',
        resourceType: 'ModelProfile',
        resourceId: assetId,
        timestamp: new Date().toISOString(),
        details: { 
          field: 'trainingDatasetReferences', 
          action: 'ADD',
          trainingDatasetRecordId 
        },
      });
    }
  }

  removeTrainingDatasetReference(assetId: string, trainingDatasetRecordId: string): void {
    const profile = this.profiles.get(assetId);
    if (!profile) {
      throw new Error(`Model profile ${assetId} not found`);
    }

    profile.trainingDatasetReferences = profile.trainingDatasetReferences.filter(
      id => id !== trainingDatasetRecordId
    );
    profile.updatedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:model-governance',
      action: 'UPDATE',
      resourceType: 'ModelProfile',
      resourceId: assetId,
      timestamp: new Date().toISOString(),
      details: { 
        field: 'trainingDatasetReferences', 
        action: 'REMOVE',
        trainingDatasetRecordId 
      },
    });
  }

  addValidationDatasetReference(assetId: string, datasetRecordId: string): void {
    const profile = this.profiles.get(assetId);
    if (!profile) {
      throw new Error(`Model profile ${assetId} not found`);
    }

    if (!profile.validationDatasetReferences.includes(datasetRecordId)) {
      profile.validationDatasetReferences.push(datasetRecordId);
      profile.updatedAt = new Date().toISOString();
    }
  }

  addTestDatasetReference(assetId: string, datasetRecordId: string): void {
    const profile = this.profiles.get(assetId);
    if (!profile) {
      throw new Error(`Model profile ${assetId} not found`);
    }

    if (!profile.testDatasetReferences.includes(datasetRecordId)) {
      profile.testDatasetReferences.push(datasetRecordId);
      profile.updatedAt = new Date().toISOString();
    }
  }

  // ---- Model Input Governance ----

  evaluateModelInputGovernance(assetId: string): {
    status: 'PASS' | 'FAIL' | 'WARN' | 'NOT_EVALUATED' | 'REQUIRES_REVIEW';
    reasons: string[];
  } {
    const profile = this.profiles.get(assetId);
    if (!profile) {
      return { status: 'NOT_EVALUATED', reasons: ['Model profile not found'] };
    }

    const reasons: string[] = [];
    let hasWarnings = false;
    let hasFailures = false;

    // Check input specification completeness
    if (profile.inputSpecification.fields.length === 0) {
      reasons.push('Input specification is empty');
      hasWarnings = true;
    } else {
      // Check each field
      for (const field of profile.inputSpecification.fields) {
        if (!field.type) {
          reasons.push(`Field ${field.name} has no type specified`);
          hasFailures = true;
        }

        if (field.sensitivity === 'RESTRICTED' || field.sensitivity === 'CONFIDENTIAL') {
          reasons.push(`Field ${field.name} has sensitive classification: ${field.sensitivity}`);
          hasWarnings = true;
        }

        if (!field.source && !field.transformationReference) {
          reasons.push(`Field ${field.name} has no source or transformation reference`);
          hasWarnings = true;
        }
      }
    }

    // Check training dataset references
    if (profile.trainingDatasetReferences.length === 0) {
      reasons.push('No training datasets referenced');
      hasWarnings = true;
    }

    // Check governance status
    if (profile.governanceStatus === 'NOT_EVALUATED') {
      reasons.push('Model governance status is not evaluated');
      hasWarnings = true;
    }

    if (hasFailures) {
      return { status: 'FAIL', reasons };
    }

    if (hasWarnings) {
      return { status: 'WARN', reasons };
    }

    return { status: 'PASS', reasons: ['All input governance checks passed'] };
  }

  // ---- Governance Status ----

  updateGovernanceStatus(assetId: string, status: ModelProfile['governanceStatus']): void {
    const profile = this.profiles.get(assetId);
    if (!profile) {
      throw new Error(`Model profile ${assetId} not found`);
    }

    profile.governanceStatus = status;
    profile.updatedAt = new Date().toISOString();

    this.auditRepo.save({
      id: generateId(),
      actor: 'system:model-governance',
      action: 'UPDATE',
      resourceType: 'ModelProfile',
      resourceId: assetId,
      timestamp: new Date().toISOString(),
      details: { field: 'governanceStatus', value: status },
    });
  }
}
