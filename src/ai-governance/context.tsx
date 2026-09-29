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
import { useCatalog } from '../app/CatalogContext';

interface AIGovernanceContextValue {
  datasetService: DatasetGovernanceService;
  trainingDataService: TrainingDataService;
  modelService: ModelGovernanceService;
  ragService: RAGGovernanceService;
  sensitiveDataService: SensitiveDataPreventionService;
  driftService: DataDriftService;
  aiGovernanceService: AIGovernanceService;
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

    return {
      datasetService,
      trainingDataService,
      modelService,
      ragService,
      sensitiveDataService,
      driftService,
      aiGovernanceService,
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
