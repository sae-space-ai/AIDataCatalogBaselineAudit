// ============================================================
// TESTS — Governance Services
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyService } from '../src/governance/policy-service';
import { ControlService } from '../src/governance/control-service';
import { ComplianceAssessmentService } from '../src/governance/compliance-service';
import { CertificationService } from '../src/governance/certification-service';
import { PolicyConflictDetector } from '../src/governance/conflict-detector';
import { RiskService } from '../src/governance/risk-service';
import { RemediationService } from '../src/governance/remediation-service';
import {
  InMemoryEvidenceRepository,
  InMemoryAuditRepository,
} from '../src/infrastructure/in-memory-repository';
import type { PolicyDefinition, ControlDefinition, CertificationDefinition } from '../src/governance/types';

// ---- Policy Service Tests ----

describe('PolicyService', () => {
  let policyService: PolicyService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    policyService = new PolicyService(evidenceRepo, auditRepo);
  });

  it('should register a policy', () => {
    const policy: PolicyDefinition = {
      id: 'policy-1',
      name: 'Test Policy',
      description: 'Test',
      version: '1.0.0',
      category: 'DATA_QUALITY',
      scope: [],
      status: 'ACTIVE',
      severity: 'MEDIUM',
      conditions: [],
      controls: [],
      evidenceRequirements: [],
      humanOversight: false,
      effectiveFrom: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    policyService.registerPolicy(policy);
    expect(policyService.getPolicy('policy-1')).toBeDefined();
  });

  it('should prevent duplicate policy versions', () => {
    const policy: PolicyDefinition = {
      id: 'policy-1',
      name: 'Test Policy',
      description: 'Test',
      version: '1.0.0',
      category: 'DATA_QUALITY',
      scope: [],
      status: 'ACTIVE',
      severity: 'MEDIUM',
      conditions: [],
      controls: [],
      evidenceRequirements: [],
      humanOversight: false,
      effectiveFrom: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    policyService.registerPolicy(policy);
    expect(() => policyService.registerPolicy(policy)).toThrow();
  });

  it('should evaluate policy with passing conditions', () => {
    const policy: PolicyDefinition = {
      id: 'policy-1',
      name: 'Quality Policy',
      description: 'Test',
      version: '1.0.0',
      category: 'DATA_QUALITY',
      scope: [],
      status: 'ACTIVE',
      severity: 'MEDIUM',
      conditions: [
        { field: 'qualityScore', operator: 'GREATER_THAN', value: 70 },
      ],
      controls: [],
      evidenceRequirements: [],
      humanOversight: false,
      effectiveFrom: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    policyService.registerPolicy(policy);

    const evaluation = policyService.evaluatePolicy(
      'policy-1',
      'Asset',
      'asset-1',
      { qualityScore: 85 },
      false
    );

    expect(evaluation.status).toBe('PASS');
    expect(evaluation.applicability).toBe('APPLICABLE');
  });

  it('should evaluate policy with failing conditions', () => {
    const policy: PolicyDefinition = {
      id: 'policy-1',
      name: 'Quality Policy',
      description: 'Test',
      version: '1.0.0',
      category: 'DATA_QUALITY',
      scope: [],
      status: 'ACTIVE',
      severity: 'MEDIUM',
      conditions: [
        { field: 'qualityScore', operator: 'GREATER_THAN', value: 70 },
      ],
      controls: [],
      evidenceRequirements: [],
      humanOversight: false,
      effectiveFrom: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    policyService.registerPolicy(policy);

    const evaluation = policyService.evaluatePolicy(
      'policy-1',
      'Asset',
      'asset-1',
      { qualityScore: 50 },
      false
    );

    expect(evaluation.status).toBe('FAIL');
  });

  it('should not evaluate DRAFT policies', () => {
    const policy: PolicyDefinition = {
      id: 'policy-1',
      name: 'Draft Policy',
      description: 'Test',
      version: '1.0.0',
      category: 'DATA_QUALITY',
      scope: [],
      status: 'DRAFT',
      severity: 'MEDIUM',
      conditions: [],
      controls: [],
      evidenceRequirements: [],
      humanOversight: false,
      effectiveFrom: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    policyService.registerPolicy(policy);

    const evaluation = policyService.evaluatePolicy(
      'policy-1',
      'Asset',
      'asset-1',
      {},
      false
    );

    expect(evaluation.status).toBe('NOT_APPLICABLE');
  });

  it('should allow simulation of DRAFT policies', () => {
    const policy: PolicyDefinition = {
      id: 'policy-1',
      name: 'Draft Policy',
      description: 'Test',
      version: '1.0.0',
      category: 'DATA_QUALITY',
      scope: [],
      status: 'DRAFT',
      severity: 'MEDIUM',
      conditions: [],
      controls: [],
      evidenceRequirements: [],
      humanOversight: false,
      effectiveFrom: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    policyService.registerPolicy(policy);

    const evaluation = policyService.evaluatePolicy(
      'policy-1',
      'Asset',
      'asset-1',
      {},
      true // Simulation mode
    );

    expect(evaluation.simulationMode).toBe(true);
  });
});

// ---- Control Service Tests ----

describe('ControlService', () => {
  let controlService: ControlService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    controlService = new ControlService(evidenceRepo, auditRepo);
  });

  it('should register a control', () => {
    const control: ControlDefinition = {
      id: 'control-1',
      name: 'Test Control',
      description: 'Test',
      version: '1.0.0',
      category: 'Quality',
      controlType: 'DETECTIVE',
      executionMode: 'AUTOMATED',
      severity: 'MEDIUM',
      implementationLevel: 'IMPLEMENTED',
      evidenceRequirements: [],
      humanOversightRequired: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    controlService.registerControl(control);
    expect(controlService.getControl('control-1')).toBeDefined();
  });

  it('should execute automated control', () => {
    const control: ControlDefinition = {
      id: 'control-1',
      name: 'Test Control',
      description: 'Test',
      version: '1.0.0',
      category: 'Quality',
      controlType: 'DETECTIVE',
      executionMode: 'AUTOMATED',
      severity: 'MEDIUM',
      implementationLevel: 'IMPLEMENTED',
      evidenceRequirements: [],
      humanOversightRequired: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    controlService.registerControl(control);

    const execution = controlService.executeControl(
      'control-1',
      'Asset',
      'asset-1',
      {},
      'corr-1'
    );

    expect(execution.status).toBe('PASS');
    expect(execution.completedAt).toBeDefined();
  });

  it('should require review for manual controls', () => {
    const control: ControlDefinition = {
      id: 'control-1',
      name: 'Manual Control',
      description: 'Test',
      version: '1.0.0',
      category: 'Quality',
      controlType: 'GOVERNANCE',
      executionMode: 'MANUAL',
      severity: 'MEDIUM',
      implementationLevel: 'IMPLEMENTED',
      evidenceRequirements: [],
      humanOversightRequired: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    controlService.registerControl(control);

    const execution = controlService.executeControl(
      'control-1',
      'Asset',
      'asset-1',
      {},
      'corr-1'
    );

    expect(execution.status).toBe('REQUIRES_REVIEW');
  });
});

// ---- Risk Service Tests ----

describe('RiskService', () => {
  let riskService: RiskService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    riskService = new RiskService(evidenceRepo, auditRepo);
  });

  it('should assess risk for sensitive data', () => {
    const risk = riskService.assessRisk('Asset', 'asset-1', {
      classification: 'PII_EMAIL',
      sensitivity: 'RESTRICTED',
    });

    expect(risk.likelihood).toBe('HIGH');
    expect(risk.severity).toBeDefined();
  });

  it('should assess low risk for public data', () => {
    const risk = riskService.assessRisk('Asset', 'asset-1', {
      sensitivity: 'PUBLIC',
      trustScore: 90,
    });

    expect(risk.likelihood).toBe('LOW');
  });
});

// ---- Certification Service Tests ----

describe('CertificationService', () => {
  let certificationService: CertificationService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    certificationService = new CertificationService(evidenceRepo, auditRepo);
  });

  it('should register certification definition', () => {
    const definition: CertificationDefinition = {
      id: 'cert-1',
      name: 'Quality Certification',
      description: 'Test',
      requirements: [
        {
          type: 'QUALITY',
          threshold: 80,
          description: 'Quality score must be >= 80',
          mandatory: true,
        },
      ],
      validForDays: 365,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    certificationService.registerDefinition(definition);
    expect(certificationService.getDefinition('cert-1')).toBeDefined();
  });

  it('should assess certification with all requirements met', () => {
    const definition: CertificationDefinition = {
      id: 'cert-1',
      name: 'Quality Certification',
      description: 'Test',
      requirements: [
        {
          type: 'QUALITY',
          threshold: 80,
          description: 'Quality score must be >= 80',
          mandatory: true,
        },
      ],
      validForDays: 365,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    certificationService.registerDefinition(definition);

    const assessment = certificationService.assessCertification(
      'cert-1',
      'Asset',
      'asset-1',
      { qualityScore: 90 }
    );

    expect(assessment.state).toBe('CERTIFIED');
    expect(assessment.expiresAt).toBeDefined();
  });

  it('should not certify if mandatory requirement not met', () => {
    const definition: CertificationDefinition = {
      id: 'cert-1',
      name: 'Quality Certification',
      description: 'Test',
      requirements: [
        {
          type: 'QUALITY',
          threshold: 80,
          description: 'Quality score must be >= 80',
          mandatory: true,
        },
      ],
      validForDays: 365,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    certificationService.registerDefinition(definition);

    const assessment = certificationService.assessCertification(
      'cert-1',
      'Asset',
      'asset-1',
      { qualityScore: 50 }
    );

    expect(assessment.state).not.toBe('CERTIFIED');
  });
});

// ---- Remediation Service Tests ----

describe('RemediationService', () => {
  let remediationService: RemediationService;
  let evidenceRepo: InMemoryEvidenceRepository;
  let auditRepo: InMemoryAuditRepository;

  beforeEach(() => {
    evidenceRepo = new InMemoryEvidenceRepository();
    auditRepo = new InMemoryAuditRepository();
    remediationService = new RemediationService(evidenceRepo, auditRepo);
  });

  it('should create remediation action', () => {
    const action = remediationService.createAction(
      'policy',
      'policy-1',
      'Asset',
      'asset-1',
      'Quality below threshold',
      'Improve data quality'
    );

    expect(action.status).toBe('OPEN');
    expect(action.id).toBeDefined();
  });

  it('should resolve remediation action', () => {
    const action = remediationService.createAction(
      'policy',
      'policy-1',
      'Asset',
      'asset-1',
      'Quality below threshold',
      'Improve data quality'
    );

    remediationService.resolveAction(action.id, 'user-1');

    const updated = remediationService.getAction(action.id);
    expect(updated?.status).toBe('RESOLVED');
    expect(updated?.resolvedAt).toBeDefined();
  });
});
