// ============================================================
// GOVERNANCE — Context (Integration Layer)
// ============================================================

import React, { createContext, useContext, useState, useMemo } from 'react';
import { PolicyService } from './policy-service';
import { ControlService } from './control-service';
import { ComplianceAssessmentService } from './compliance-service';
import { CertificationService } from './certification-service';
import { PolicyConflictDetector } from './conflict-detector';
import { RiskService } from './risk-service';
import { RemediationService } from './remediation-service';
import { useCatalog } from '../app/CatalogContext';

interface GovernanceContextValue {
  policyService: PolicyService;
  controlService: ControlService;
  complianceService: ComplianceAssessmentService;
  certificationService: CertificationService;
  conflictDetector: PolicyConflictDetector;
  riskService: RiskService;
  remediationService: RemediationService;
}

const GovernanceContext = createContext<GovernanceContextValue | null>(null);

export function GovernanceProvider({ children }: { children: React.ReactNode }) {
  const { services } = useCatalog();

  const governanceServices = useMemo(() => {
    const policyService = new PolicyService(services.evidenceRepo, services.auditRepo);
    const controlService = new ControlService(services.evidenceRepo, services.auditRepo);
    const complianceService = new ComplianceAssessmentService(
      policyService,
      controlService,
      services.evidenceRepo,
      services.auditRepo
    );
    const certificationService = new CertificationService(
      services.evidenceRepo,
      services.auditRepo
    );
    const conflictDetector = new PolicyConflictDetector(policyService, services.auditRepo);
    const riskService = new RiskService(services.evidenceRepo, services.auditRepo);
    const remediationService = new RemediationService(services.evidenceRepo, services.auditRepo);

    return {
      policyService,
      controlService,
      complianceService,
      certificationService,
      conflictDetector,
      riskService,
      remediationService,
    };
  }, [services]);

  return (
    <GovernanceContext.Provider value={governanceServices}>
      {children}
    </GovernanceContext.Provider>
  );
}

export function useGovernance(): GovernanceContextValue {
  const context = useContext(GovernanceContext);
  if (!context) {
    throw new Error('useGovernance must be used within a GovernanceProvider');
  }
  return context;
}
