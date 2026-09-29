// ============================================================
// AI GOVERNANCE — Context Provider
// ============================================================

import React, { createContext, useContext, useMemo } from 'react';
import { DatasetGovernanceService } from './dataset-service';
import { TrainingDataService } from './training-data-service';
import { ModelGovernanceService } from './model-service';
import { RAGGovernanceService } from './rag-service';
import { SensitiveDataPreventionService } from './sensitive-data-service';
import { DataDriftService } from './drift-service';
import { AIGovernanceService } from './ai-governance-service';
import { AIResourceRegistry } from './ai-resource-registry';
import { 
  AIDependencyGraph, 
  PurposeLimitationService, 
  DriftImpactService,
  GovernanceInvalidationService,
  AIReproducibilityService 
} from './integration-services';
import { useCatalog } from '../app/CatalogContext';

interface AIGovernanceContextValue {
  datasetService: DatasetGovernanceService;
  trainingDataService: TrainingDataService;
  modelService: ModelGovernanceService;
  ragService: RAGGovernanceService;
  sensitiveDataService: SensitiveDataPreventionService;
  driftService: DataDriftService;
  aiGovernanceService: AIGovernanceService;
  aiResourceRegistry: AIResourceRegistry;
  aiDependencyGraph: AIDependencyGraph;
  purposeLimitationService: PurposeLimitationService;
  driftImpactService: DriftImpactService;
  governanceInvalidationService: GovernanceInvalidationService;
  aiReproducibilityService: AIReproducibilityService;
}

const AIGovernanceContext = createContext<AIGovernanceContextValue | null>(null);

export function AIGovernanceProvider({ children }: { children: React.ReactNode }) {
  const { services } = useCatalog();

  const contextValue = useMemo(() => {
    // Initialize services
    const datasetService = new DatasetGovernanceService(
      services.assetRepo,
      services.evidenceRepo,
      services.auditRepo
    );

    const trainingDataService = new TrainingDataService(
      services.evidenceRepo,
      services.auditRepo
    );

    const modelService = new ModelGovernanceService(
      services.evidenceRepo,
      services.auditRepo
    );

    const ragService = new RAGGovernanceService(
      services.evidenceRepo,
      services.auditRepo
    );

    const sensitiveDataService = new SensitiveDataPreventionService(
      services.classificationRepo,
      services.evidenceRepo,
      services.auditRepo
    );

    const driftService = new DataDriftService(
      services.evidenceRepo,
      services.auditRepo
    );

    const aiGovernanceService = new AIGovernanceService(
      datasetService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      services.evidenceRepo,
      services.auditRepo
    );

    // Initialize integration services
    const aiResourceRegistry = new AIResourceRegistry(
      services.assetRepo,
      services.relationshipRepo,
      datasetService,
      modelService,
      ragService,
      aiGovernanceService
    );

    const aiDependencyGraph = new AIDependencyGraph(
      services.relationshipRepo,
      aiGovernanceService
    );

    const purposeLimitationService = new PurposeLimitationService();

    const driftImpactService = new DriftImpactService(
      driftService,
      services.impactAnalyzer
    );

    // Note: CertificationService integration will be added when available
    // For now, GovernanceInvalidationService works without it
    const governanceInvalidationService = new GovernanceInvalidationService(
      trainingDataService,
      ragService,
      aiGovernanceService,
      null as any, // certificationService - will be integrated later
      services.evidenceRepo,
      services.auditRepo
    );

    const aiReproducibilityService = new AIReproducibilityService(
      services.evidenceRepo,
      services.auditRepo
    );

    return {
      datasetService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      aiGovernanceService,
      aiResourceRegistry,
      aiDependencyGraph,
      purposeLimitationService,
      driftImpactService,
      governanceInvalidationService,
      aiReproducibilityService,
    };
  }, [services]);

  return (
    <AIGovernanceContext.Provider value={contextValue}>
      {children}
    </AIGovernanceContext.Provider>
  );
}

export function useAIGovernance() {
  const context = useContext(AIGovernanceContext);
  if (!context) {
    throw new Error('useAIGovernance must be used within AIGovernanceProvider');
  }
  return context;
}
