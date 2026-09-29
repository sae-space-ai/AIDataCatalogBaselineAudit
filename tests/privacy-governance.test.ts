// ============================================================
// TESTS — Privacy Governance Service (ORDER 11E)
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { PrivacyGovernanceService } from '../src/services/privacy-governance-service';
import { HumanReviewService } from '../src/services/human-review-service';
import { ImpactAnalyzer } from '../src/services/impact-analyzer';
import {
  InMemoryAssetRepository,
  InMemoryClassificationRepository,
  InMemoryRelationshipRepository,
  InMemoryEvidenceRepository,
  InMemoryAuditRepository,
} from '../src/infrastructure/in-memory-repository';
import type { Asset } from '../src/types';

describe('PrivacyGovernanceService', () => {
  let privacyService: PrivacyGovernanceService;
  let humanReviewService: HumanReviewService;
  let impactAnalyzer: ImpactAnalyzer;
  let assetRepo: InMemoryAssetRepository;
  let classificationRepo: InMemoryClassificationRepository;
  let relationshipRepo: InMemoryRelationshipRepository;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    assetRepo = new InMemoryAssetRepository();
    classificationRepo = new InMemoryClassificationRepository();
    relationshipRepo = new InMemoryRelationshipRepository();
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    humanReviewService = new HumanReviewService(evidenceRepo, auditRepo);
    impactAnalyzer = new ImpactAnalyzer(relationshipRepo, assetRepo);

    privacyService = new PrivacyGovernanceService(
      assetRepo,
      classificationRepo,
      relationshipRepo,
      evidenceRepo,
      auditRepo,
      humanReviewService,
      impactAnalyzer
    );
  });

  describe('Transformation Governance', () => {
    it('should propose a privacy transformation with purpose', () => {
      const asset: Asset = {
        id: 'asset-1',
        sourceId: 'source-1',
        type: 'COLUMN',
        name: 'email',
        qualifiedName: 'db.schema.table.email',
        status: 'DISCOVERED',
        sensitivity: 'CONFIDENTIAL',
        certificationStatus: 'UNCERTIFIED',
        metadata: {
          kind: 'COLUMN',
          tableName: 'table',
          schemaName: 'schema',
          databaseName: 'db',
          dataType: 'varchar',
          nullable: true,
          ordinalPosition: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assetRepo.save(asset);

      const transformation = privacyService.proposeTransformation(
        'asset-1',
        'PSEUDONYMIZATION',
        'hash-sha256',
        'Data analysis for research purposes',
        'GOVERNANCE_ONLY'
      );

      expect(transformation).toBeDefined();
      expect(transformation.assetId).toBe('asset-1');
      expect(transformation.transformationType).toBe('PSEUDONYMIZATION');
      expect(transformation.purpose).toBe('Data analysis for research purposes');
      expect(transformation.status).toBe('PROPOSED');
    });

    it('should reject transformation without purpose', () => {
      const asset: Asset = {
        id: 'asset-1',
        sourceId: 'source-1',
        type: 'COLUMN',
        name: 'email',
        qualifiedName: 'db.schema.table.email',
        status: 'DISCOVERED',
        sensitivity: 'CONFIDENTIAL',
        certificationStatus: 'UNCERTIFIED',
        metadata: {
          kind: 'COLUMN',
          tableName: 'table',
          schemaName: 'schema',
          databaseName: 'db',
          dataType: 'varchar',
          nullable: true,
          ordinalPosition: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assetRepo.save(asset);

      expect(() => {
        privacyService.proposeTransformation(
          'asset-1',
          'PSEUDONYMIZATION',
          'hash-sha256',
          '',
          'GOVERNANCE_ONLY'
        );
      }).toThrow('Purpose is required for privacy transformation');
    });

    it('should create review task for sensitive classification', () => {
      const asset: Asset = {
        id: 'asset-1',
        sourceId: 'source-1',
        type: 'COLUMN',
        name: 'email',
        qualifiedName: 'db.schema.table.email',
        status: 'DISCOVERED',
        sensitivity: 'CONFIDENTIAL',
        certificationStatus: 'UNCERTIFIED',
        metadata: {
          kind: 'COLUMN',
          tableName: 'table',
          schemaName: 'schema',
          databaseName: 'db',
          dataType: 'varchar',
          nullable: true,
          ordinalPosition: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assetRepo.save(asset);

      // Add PII classification
      classificationRepo.save({
        id: 'class-1',
        assetId: 'asset-1',
        classificationType: 'PII_EMAIL',
        confidence: 0.95,
        method: 'RULE',
        reason: 'Email pattern detected',
        reviewStatus: 'CONFIRMED',
        createdAt: new Date().toISOString(),
      });

      const transformation = privacyService.proposeTransformation(
        'asset-1',
        'PSEUDONYMIZATION',
        'hash-sha256',
        'Data analysis',
        'GOVERNANCE_ONLY'
      );

      expect(transformation.status).toBe('REQUIRES_REVIEW');

      const reviewTasks = humanReviewService.listTasks();
      expect(reviewTasks.length).toBe(1);
      expect(reviewTasks[0].type).toBe('PRIVACY_TRANSFORMATION_REVIEW');
    });

    it('should approve transformation', () => {
      const asset: Asset = {
        id: 'asset-1',
        sourceId: 'source-1',
        type: 'COLUMN',
        name: 'email',
        qualifiedName: 'db.schema.table.email',
        status: 'DISCOVERED',
        sensitivity: 'CONFIDENTIAL',
        certificationStatus: 'UNCERTIFIED',
        metadata: {
          kind: 'COLUMN',
          tableName: 'table',
          schemaName: 'schema',
          databaseName: 'db',
          dataType: 'varchar',
          nullable: true,
          ordinalPosition: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assetRepo.save(asset);

      const transformation = privacyService.proposeTransformation(
        'asset-1',
        'MASKING',
        'partial-mask',
        'Display purposes',
        'GOVERNANCE_ONLY'
      );

      privacyService.approveTransformation(transformation.id, 'demo-reviewer');

      const updated = privacyService.getTransformation(transformation.id);
      expect(updated?.status).toBe('APPROVED');

      const auditEvents = auditRepo.getAll();
      expect(auditEvents.some(e => e.action === 'REVIEW' && e.details?.decision === 'APPROVED')).toBe(true);
    });

    it('should reject transformation', () => {
      const asset: Asset = {
        id: 'asset-1',
        sourceId: 'source-1',
        type: 'COLUMN',
        name: 'email',
        qualifiedName: 'db.schema.table.email',
        status: 'DISCOVERED',
        sensitivity: 'CONFIDENTIAL',
        certificationStatus: 'UNCERTIFIED',
        metadata: {
          kind: 'COLUMN',
          tableName: 'table',
          schemaName: 'schema',
          databaseName: 'db',
          dataType: 'varchar',
          nullable: true,
          ordinalPosition: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assetRepo.save(asset);

      const transformation = privacyService.proposeTransformation(
        'asset-1',
        'ANONYMIZATION',
        'k-anonymity',
        'Public release',
        'GOVERNANCE_ONLY'
      );

      privacyService.rejectTransformation(transformation.id, 'demo-reviewer', 'Insufficient evidence');

      const updated = privacyService.getTransformation(transformation.id);
      expect(updated?.status).toBe('REJECTED');
    });

    it('should record execution for WITH_EXECUTOR mode', () => {
      const asset: Asset = {
        id: 'asset-1',
        sourceId: 'source-1',
        type: 'COLUMN',
        name: 'email',
        qualifiedName: 'db.schema.table.email',
        status: 'DISCOVERED',
        sensitivity: 'CONFIDENTIAL',
        certificationStatus: 'UNCERTIFIED',
        metadata: {
          kind: 'COLUMN',
          tableName: 'table',
          schemaName: 'schema',
          databaseName: 'db',
          dataType: 'varchar',
          nullable: true,
          ordinalPosition: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assetRepo.save(asset);

      const transformation = privacyService.proposeTransformation(
        'asset-1',
        'ENCRYPTION',
        'AES-256',
        'Secure storage',
        'WITH_EXECUTOR'
      );

      privacyService.approveTransformation(transformation.id, 'demo-reviewer');
      privacyService.recordExecution(transformation.id, 'external-executor-1');

      const updated = privacyService.getTransformation(transformation.id);
      expect(updated?.status).toBe('EXECUTED');
      expect(updated?.executorReference).toBe('external-executor-1');
      expect(updated?.executedAt).toBeDefined();
    });

    it('should not record execution for GOVERNANCE_ONLY mode', () => {
      const asset: Asset = {
        id: 'asset-1',
        sourceId: 'source-1',
        type: 'COLUMN',
        name: 'email',
        qualifiedName: 'db.schema.table.email',
        status: 'DISCOVERED',
        sensitivity: 'CONFIDENTIAL',
        certificationStatus: 'UNCERTIFIED',
        metadata: {
          kind: 'COLUMN',
          tableName: 'table',
          schemaName: 'schema',
          databaseName: 'db',
          dataType: 'varchar',
          nullable: true,
          ordinalPosition: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assetRepo.save(asset);

      const transformation = privacyService.proposeTransformation(
        'asset-1',
        'MASKING',
        'partial-mask',
        'Display purposes',
        'GOVERNANCE_ONLY'
      );

      privacyService.approveTransformation(transformation.id, 'demo-reviewer');

      expect(() => {
        privacyService.recordExecution(transformation.id, 'external-executor-1');
      }).toThrow('Cannot record execution for GOVERNANCE_ONLY mode');
    });
  });

  describe('Re-identification Risk Assessment', () => {
    it('should assess re-identification risk', () => {
      const assessment = privacyService.assessReidentificationRisk(
        'asset-1',
        'Asset',
        'QUALITATIVE',
        ['Direct identifiers present', 'Small population size'],
        ['No additional data sources available'],
        'High - direct identifiers present',
        'Low - no known external datasets',
        'High - unique values present',
        'Medium - some quasi-identifiers',
        'Low - no sensitive attributes',
        'HIGH',
        'Significant re-identification risk due to direct identifiers',
        'privacy-officer',
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      );

      expect(assessment).toBeDefined();
      expect(assessment.subjectId).toBe('asset-1');
      expect(assessment.residualRisk).toBe('HIGH');
      expect(assessment.assessmentMethod).toBe('QUALITATIVE');
    });

    it('should create review task for high risk', () => {
      const assessment = privacyService.assessReidentificationRisk(
        'asset-1',
        'Asset',
        'QUALITATIVE',
        ['Direct identifiers present'],
        ['No additional data sources'],
        'High',
        'Low',
        'High',
        'Medium',
        'Low',
        'HIGH',
        'High risk',
        'privacy-officer'
      );

      const reviewTasks = humanReviewService.listTasks();
      expect(reviewTasks.length).toBe(1);
      expect(reviewTasks[0].type).toBe('PRIVACY_RISK_REVIEW');
      expect(reviewTasks[0].priority).toBe('HIGH');
    });

    it('should not create review task for low risk', () => {
      const assessment = privacyService.assessReidentificationRisk(
        'asset-1',
        'Asset',
        'QUALITATIVE',
        ['No direct identifiers'],
        ['Large population size'],
        'Low',
        'Low',
        'Low',
        'Low',
        'Low',
        'LOW',
        'Low risk',
        'privacy-officer'
      );

      const reviewTasks = humanReviewService.listTasks();
      expect(reviewTasks.length).toBe(0);
    });

    it('should distinguish NOT_ASSESSED from LOW risk', () => {
      const asset: Asset = {
        id: 'asset-1',
        sourceId: 'source-1',
        type: 'COLUMN',
        name: 'email',
        qualifiedName: 'db.schema.table.email',
        status: 'DISCOVERED',
        sensitivity: 'CONFIDENTIAL',
        certificationStatus: 'UNCERTIFIED',
        metadata: {
          kind: 'COLUMN',
          tableName: 'table',
          schemaName: 'schema',
          databaseName: 'db',
          dataType: 'varchar',
          nullable: true,
          ordinalPosition: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assetRepo.save(asset);

      // Before assessment
      const beforeAssessment = privacyService.getLatestRiskAssessment('asset-1', 'Asset');
      expect(beforeAssessment).toBeUndefined();

      // After assessment
      privacyService.assessReidentificationRisk(
        'asset-1',
        'Asset',
        'QUALITATIVE',
        ['No direct identifiers'],
        ['Large population'],
        'Low',
        'Low',
        'Low',
        'Low',
        'Low',
        'LOW',
        'Low risk',
        'privacy-officer'
      );

      const afterAssessment = privacyService.getLatestRiskAssessment('asset-1', 'Asset');
      expect(afterAssessment).toBeDefined();
      expect(afterAssessment?.residualRisk).toBe('LOW');
    });
  });

  describe('Change Invalidation', () => {
    it('should invalidate transformation on schema change', () => {
      const asset: Asset = {
        id: 'asset-1',
        sourceId: 'source-1',
        type: 'COLUMN',
        name: 'email',
        qualifiedName: 'db.schema.table.email',
        status: 'DISCOVERED',
        sensitivity: 'CONFIDENTIAL',
        certificationStatus: 'UNCERTIFIED',
        metadata: {
          kind: 'COLUMN',
          tableName: 'table',
          schemaName: 'schema',
          databaseName: 'db',
          dataType: 'varchar',
          nullable: true,
          ordinalPosition: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assetRepo.save(asset);

      const transformation = privacyService.proposeTransformation(
        'asset-1',
        'MASKING',
        'partial-mask',
        'Display purposes',
        'GOVERNANCE_ONLY'
      );

      privacyService.approveTransformation(transformation.id, 'demo-reviewer');

      // Simulate schema change
      privacyService.invalidateDueToChange('asset-1', 'SCHEMA_CHANGE', 'Column data type changed');

      const updated = privacyService.getTransformation(transformation.id);
      expect(updated?.status).toBe('INVALIDATED');

      const evidence = evidenceRepo.getAll();
      expect(evidence.some(e => e.type === 'PRIVACY_TRANSFORMATION_REVIEWED' && e.metadata?.decision === 'INVALIDATED')).toBe(true);
    });

    it('should invalidate risk assessment on classification change', () => {
      const assessment = privacyService.assessReidentificationRisk(
        'asset-1',
        'Asset',
        'QUALITATIVE',
        ['No direct identifiers'],
        ['Large population'],
        'Low',
        'Low',
        'Low',
        'Low',
        'Low',
        'LOW',
        'Low risk',
        'privacy-officer'
      );

      // Simulate classification change
      privacyService.invalidateDueToChange('asset-1', 'CLASSIFICATION_CHANGE', 'New PII detected');

      const evidence = evidenceRepo.getAll();
      expect(evidence.some(e => e.type === 'PRIVACY_ASSESSMENT_INVALIDATED')).toBe(true);
    });

    it('should invalidate downstream transformations', () => {
      // Create upstream asset
      const upstreamAsset: Asset = {
        id: 'asset-1',
        sourceId: 'source-1',
        type: 'TABLE',
        name: 'customers',
        qualifiedName: 'db.schema.customers',
        status: 'DISCOVERED',
        sensitivity: 'CONFIDENTIAL',
        certificationStatus: 'UNCERTIFIED',
        metadata: {
          kind: 'TABLE',
          schemaName: 'schema',
          databaseName: 'db',
          rowCount: 1000,
          columnCount: 5,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assetRepo.save(upstreamAsset);

      // Create downstream asset
      const downstreamAsset: Asset = {
        id: 'asset-2',
        sourceId: 'source-1',
        type: 'TABLE',
        name: 'customers_anonymized',
        qualifiedName: 'db.schema.customers_anonymized',
        status: 'DISCOVERED',
        sensitivity: 'INTERNAL',
        certificationStatus: 'UNCERTIFIED',
        metadata: {
          kind: 'TABLE',
          schemaName: 'schema',
          databaseName: 'db',
          rowCount: 1000,
          columnCount: 5,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assetRepo.save(downstreamAsset);

      // Create relationship
      relationshipRepo.save({
        id: 'rel-1',
        sourceAssetId: 'asset-1',
        targetAssetId: 'asset-2',
        type: 'DERIVED_FROM',
        createdAt: new Date().toISOString(),
      });

      // Create transformation for downstream
      const transformation = privacyService.proposeTransformation(
        'asset-2',
        'AGGREGATION',
        'group-by',
        'Reporting',
        'GOVERNANCE_ONLY'
      );

      privacyService.approveTransformation(transformation.id, 'demo-reviewer');

      // Invalidate upstream
      privacyService.invalidateDueToChange('asset-1', 'SCHEMA_CHANGE', 'Structure changed');

      // Check downstream is also invalidated
      const updated = privacyService.getTransformation(transformation.id);
      expect(updated?.status).toBe('INVALIDATED');
    });
  });

  describe('Non-invasive Governance', () => {
    it('should not store raw personal data in evidence', () => {
      const asset: Asset = {
        id: 'asset-1',
        sourceId: 'source-1',
        type: 'COLUMN',
        name: 'email',
        qualifiedName: 'db.schema.table.email',
        status: 'DISCOVERED',
        sensitivity: 'CONFIDENTIAL',
        certificationStatus: 'UNCERTIFIED',
        metadata: {
          kind: 'COLUMN',
          tableName: 'table',
          schemaName: 'schema',
          databaseName: 'db',
          dataType: 'varchar',
          nullable: true,
          ordinalPosition: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assetRepo.save(asset);

      privacyService.proposeTransformation(
        'asset-1',
        'MASKING',
        'partial-mask',
        'Display purposes',
        'GOVERNANCE_ONLY'
      );

      const evidence = evidenceRepo.getAll();
      const evidenceString = JSON.stringify(evidence);
      
      // Should not contain actual email addresses or personal data
      expect(evidenceString).not.toContain('john.doe@example.com');
      expect(evidenceString).not.toContain('jane.smith@example.com');
      
      // Should contain metadata references only
      expect(evidenceString).toContain('asset-1');
      expect(evidenceString).toContain('MASKING');
    });

    it('should preserve historical assessments after invalidation', () => {
      const assessment1 = privacyService.assessReidentificationRisk(
        'asset-1',
        'Asset',
        'QUALITATIVE',
        ['No direct identifiers'],
        ['Large population'],
        'Low',
        'Low',
        'Low',
        'Low',
        'Low',
        'LOW',
        'Initial assessment',
        'privacy-officer'
      );

      privacyService.invalidateRiskAssessment(assessment1.id, 'Schema changed');

      const assessment2 = privacyService.assessReidentificationRisk(
        'asset-1',
        'Asset',
        'QUALITATIVE',
        ['Direct identifiers added'],
        ['Small population'],
        'High',
        'Medium',
        'High',
        'High',
        'Medium',
        'HIGH',
        'Updated assessment',
        'privacy-officer'
      );

      // Both assessments should still exist
      const allAssessments = privacyService.listRiskAssessments();
      expect(allAssessments.length).toBe(2);

      // Latest should be the second one
      const latest = privacyService.getLatestRiskAssessment('asset-1', 'Asset');
      expect(latest?.id).toBe(assessment2.id);
      expect(latest?.residualRisk).toBe('HIGH');
    });
  });

  describe('Terminology Distinction', () => {
    it('should treat PSEUDONYMIZATION differently from ANONYMIZATION', () => {
      const asset: Asset = {
        id: 'asset-1',
        sourceId: 'source-1',
        type: 'COLUMN',
        name: 'email',
        qualifiedName: 'db.schema.table.email',
        status: 'DISCOVERED',
        sensitivity: 'CONFIDENTIAL',
        certificationStatus: 'UNCERTIFIED',
        metadata: {
          kind: 'COLUMN',
          tableName: 'table',
          schemaName: 'schema',
          databaseName: 'db',
          dataType: 'varchar',
          nullable: true,
          ordinalPosition: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assetRepo.save(asset);

      const pseudonymization = privacyService.proposeTransformation(
        'asset-1',
        'PSEUDONYMIZATION',
        'token-replacement',
        'Testing',
        'GOVERNANCE_ONLY'
      );

      const anonymization = privacyService.proposeTransformation(
        'asset-1',
        'ANONYMIZATION',
        'k-anonymity',
        'Public release',
        'GOVERNANCE_ONLY'
      );

      // Both should require review
      expect(pseudonymization.status).toBe('REQUIRES_REVIEW');
      expect(anonymization.status).toBe('REQUIRES_REVIEW');

      // But they are different transformation types
      expect(pseudonymization.transformationType).toBe('PSEUDONYMIZATION');
      expect(anonymization.transformationType).toBe('ANONYMIZATION');
    });

    it('should treat ENCRYPTION differently from ANONYMIZATION', () => {
      const asset: Asset = {
        id: 'asset-1',
        sourceId: 'source-1',
        type: 'COLUMN',
        name: 'ssn',
        qualifiedName: 'db.schema.table.ssn',
        status: 'DISCOVERED',
        sensitivity: 'RESTRICTED',
        certificationStatus: 'UNCERTIFIED',
        metadata: {
          kind: 'COLUMN',
          tableName: 'table',
          schemaName: 'schema',
          databaseName: 'db',
          dataType: 'varchar',
          nullable: true,
          ordinalPosition: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      assetRepo.save(asset);

      const encryption = privacyService.proposeTransformation(
        'asset-1',
        'ENCRYPTION',
        'AES-256',
        'Secure storage',
        'WITH_EXECUTOR'
      );

      // Encryption does not automatically require review (not PII transformation)
      expect(encryption.transformationType).toBe('ENCRYPTION');
      expect(encryption.executionMode).toBe('WITH_EXECUTOR');
    });
  });
});
