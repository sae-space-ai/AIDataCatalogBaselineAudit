// ============================================================
// BLUEPRINTS — Context
// ============================================================

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { SolutionBlueprint, BlueprintReadiness, BlueprintGapAnalysis } from './types';
import { SolutionBlueprintEngine } from './engine';
import { BlueprintValidator } from './validator';
import { AgentRegistry } from '../agents/registry';
import { BASE_BLUEPRINT } from './base-blueprint';
import { PUBLIC_ADMINISTRATION_BLUEPRINT } from './public-administration';
import {
  SME_SELF_EMPLOYED_BLUEPRINT,
  TECHNOLOGY_GENAI_RAG_BLUEPRINT,
  FINANCE_RETAIL_BLUEPRINT,
  ENTERPRISE_DATA_BLUEPRINT,
  RESEARCH_MLOPS_BLUEPRINT,
} from './sector-blueprints';

interface BlueprintContextValue {
  engine: SolutionBlueprintEngine;
  validator: BlueprintValidator;
  activeBlueprint: SolutionBlueprint | null;
  availableBlueprints: SolutionBlueprint[];
  readiness: BlueprintReadiness | null;
  gaps: BlueprintGapAnalysis | null;
  activateBlueprint: (id: string) => void;
  deactivateBlueprint: () => void;
  isDemoBlueprint: boolean;
}

const BlueprintContext = createContext<BlueprintContextValue | null>(null);

export function BlueprintProvider({ children, agentRegistry }: { children: React.ReactNode; agentRegistry: AgentRegistry }) {
  const [engine] = useState(() => {
    const eng = new SolutionBlueprintEngine(agentRegistry);
    
    // Register all blueprints
    eng.register(BASE_BLUEPRINT);
    eng.register(PUBLIC_ADMINISTRATION_BLUEPRINT);
    eng.register(SME_SELF_EMPLOYED_BLUEPRINT);
    eng.register(TECHNOLOGY_GENAI_RAG_BLUEPRINT);
    eng.register(FINANCE_RETAIL_BLUEPRINT);
    eng.register(ENTERPRISE_DATA_BLUEPRINT);
    eng.register(RESEARCH_MLOPS_BLUEPRINT);
    
    return eng;
  });

  const [validator] = useState(() => new BlueprintValidator(agentRegistry));
  const [activeBlueprintId, setActiveBlueprintId] = useState<string | null>(null);

  const activeBlueprint = useMemo(() => {
    if (!activeBlueprintId) return null;
    return engine.get(activeBlueprintId) || null;
  }, [activeBlueprintId, engine]);

  const availableBlueprints = useMemo(() => engine.list(), [engine]);

  const readiness = useMemo(() => {
    if (!activeBlueprint) return null;
    return engine.calculateReadiness(activeBlueprint.id);
  }, [activeBlueprint, engine]);

  const gaps = useMemo(() => {
    if (!activeBlueprint) return null;
    return engine.analyzeGaps(activeBlueprint.id);
  }, [activeBlueprint, engine]);

  const activateBlueprint = (id: string) => {
    const blueprint = engine.get(id);
    if (!blueprint) {
      throw new Error(`Blueprint ${id} not found`);
    }

    const validation = validator.validate(blueprint);
    if (!validation.valid) {
      throw new Error(`Blueprint ${id} is invalid: ${validation.errors.join(', ')}`);
    }

    engine.activate(id);
    setActiveBlueprintId(id);
  };

  const deactivateBlueprint = () => {
    engine.deactivate();
    setActiveBlueprintId(null);
  };

  const isDemoBlueprint = activeBlueprint?.id === 'base' || activeBlueprint === null;

  const value: BlueprintContextValue = {
    engine,
    validator,
    activeBlueprint,
    availableBlueprints,
    readiness,
    gaps,
    activateBlueprint,
    deactivateBlueprint,
    isDemoBlueprint,
  };

  return (
    <BlueprintContext.Provider value={value}>
      {children}
    </BlueprintContext.Provider>
  );
}

export function useBlueprints(): BlueprintContextValue {
  const context = useContext(BlueprintContext);
  if (!context) {
    throw new Error('useBlueprints must be used within a BlueprintProvider');
  }
  return context;
}
