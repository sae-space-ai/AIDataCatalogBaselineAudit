// ============================================================
// TESTS — Solution Blueprints
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { SolutionBlueprintEngine } from '../src/blueprints/engine';
import { BlueprintValidator } from '../src/blueprints/validator';
import { AgentRegistry } from '../src/agents/registry';
import { BASE_BLUEPRINT } from '../src/blueprints/base-blueprint';
import { PUBLIC_ADMINISTRATION_BLUEPRINT } from '../src/blueprints/public-administration';
import {
  SME_SELF_EMPLOYED_BLUEPRINT,
  TECHNOLOGY_GENAI_RAG_BLUEPRINT,
  FINANCE_RETAIL_BLUEPRINT,
  ENTERPRISE_DATA_BLUEPRINT,
  RESEARCH_MLOPS_BLUEPRINT,
} from '../src/blueprints/sector-blueprints';

describe('SolutionBlueprintEngine', () => {
  let engine: SolutionBlueprintEngine;
  let agentRegistry: AgentRegistry;

  beforeEach(() => {
    agentRegistry = new AgentRegistry();
    engine = new SolutionBlueprintEngine(agentRegistry);
  });

  it('should register a blueprint', () => {
    engine.register(BASE_BLUEPRINT);
    expect(engine.get('base')).toBeDefined();
  });

  it('should prevent duplicate registration', () => {
    engine.register(BASE_BLUEPRINT);
    expect(() => engine.register(BASE_BLUEPRINT)).toThrow();
  });

  it('should list all registered blueprints', () => {
    engine.register(BASE_BLUEPRINT);
    engine.register(PUBLIC_ADMINISTRATION_BLUEPRINT);
    const list = engine.list();
    expect(list.length).toBe(2);
  });

  it('should activate a valid blueprint', () => {
    engine.register(BASE_BLUEPRINT);
    engine.activate('base');
    expect(engine.getActiveBlueprint()?.id).toBe('base');
  });

  it('should deactivate blueprint', () => {
    engine.register(BASE_BLUEPRINT);
    engine.activate('base');
    engine.deactivate();
    expect(engine.getActiveBlueprint()).toBeUndefined();
  });

  it('should calculate readiness', () => {
    engine.register(BASE_BLUEPRINT);
    const readiness = engine.calculateReadiness('base');
    expect(readiness.blueprintId).toBe('base');
    expect(readiness.overallScore).toBeGreaterThanOrEqual(0);
    expect(readiness.overallScore).toBeLessThanOrEqual(100);
  });

  it('should analyze gaps', () => {
    engine.register(BASE_BLUEPRINT);
    const gaps = engine.analyzeGaps('base');
    expect(gaps.blueprintId).toBe('base');
    expect(Array.isArray(gaps.gaps)).toBe(true);
  });

  it('should resolve effective agents', () => {
    engine.register(BASE_BLUEPRINT);
    const agents = engine.resolveEffectiveAgents('base');
    expect(Array.isArray(agents)).toBe(true);
  });

  it('should export blueprint', () => {
    engine.register(BASE_BLUEPRINT);
    const exported = engine.exportBlueprint('base');
    expect(typeof exported).toBe('string');
    const parsed = JSON.parse(exported);
    expect(parsed.id).toBe('base');
  });

  it('should import valid blueprint', () => {
    const blueprint = { ...BASE_BLUEPRINT, id: 'imported' };
    const json = JSON.stringify(blueprint);
    const imported = engine.importBlueprint(json);
    expect(imported.id).toBe('imported');
  });

  it('should reject invalid import JSON', () => {
    expect(() => engine.importBlueprint('invalid json')).toThrow();
  });
});

describe('BlueprintValidator', () => {
  let validator: BlueprintValidator;
  let agentRegistry: AgentRegistry;

  beforeEach(() => {
    agentRegistry = new AgentRegistry();
    validator = new BlueprintValidator(agentRegistry);
  });

  it('should validate base blueprint', () => {
    const result = validator.validate(BASE_BLUEPRINT);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should detect missing required fields', () => {
    const invalid = { ...BASE_BLUEPRINT, id: '' };
    const result = validator.validate(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ID'))).toBe(true);
  });

  it('should validate trust weights sum to 1.0', () => {
    const invalid = {
      ...BASE_BLUEPRINT,
      trustProfile: {
        ...BASE_BLUEPRINT.trustProfile,
        weights: {
          metadataCompleteness: 0.5,
          qualityScore: 0.5,
          classificationConfidence: 0.5,
          lineageAvailability: 0.5,
          reviewStatus: 0.5,
        },
      },
    };
    const result = validator.validate(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('weights'))).toBe(true);
  });

  it('should check if blueprint can be activated', () => {
    const result = validator.canActivate(BASE_BLUEPRINT);
    expect(result).toBe(true);
  });
});

describe('Blueprint Registration', () => {
  let engine: SolutionBlueprintEngine;
  let agentRegistry: AgentRegistry;

  beforeEach(() => {
    agentRegistry = new AgentRegistry();
    engine = new SolutionBlueprintEngine(agentRegistry);
  });

  it('should register all sector blueprints', () => {
    engine.register(BASE_BLUEPRINT);
    engine.register(PUBLIC_ADMINISTRATION_BLUEPRINT);
    engine.register(SME_SELF_EMPLOYED_BLUEPRINT);
    engine.register(TECHNOLOGY_GENAI_RAG_BLUEPRINT);
    engine.register(FINANCE_RETAIL_BLUEPRINT);
    engine.register(ENTERPRISE_DATA_BLUEPRINT);
    engine.register(RESEARCH_MLOPS_BLUEPRINT);

    expect(engine.list().length).toBe(7);
  });

  it('should have unique IDs for all blueprints', () => {
    const blueprints = [
      BASE_BLUEPRINT,
      PUBLIC_ADMINISTRATION_BLUEPRINT,
      SME_SELF_EMPLOYED_BLUEPRINT,
      TECHNOLOGY_GENAI_RAG_BLUEPRINT,
      FINANCE_RETAIL_BLUEPRINT,
      ENTERPRISE_DATA_BLUEPRINT,
      RESEARCH_MLOPS_BLUEPRINT,
    ];

    const ids = blueprints.map(b => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have correct sector for each blueprint', () => {
    expect(PUBLIC_ADMINISTRATION_BLUEPRINT.sector).toBe('PUBLIC_ADMINISTRATION');
    expect(SME_SELF_EMPLOYED_BLUEPRINT.sector).toBe('SME');
    expect(TECHNOLOGY_GENAI_RAG_BLUEPRINT.sector).toBe('TECHNOLOGY');
    expect(FINANCE_RETAIL_BLUEPRINT.sector).toBe('FINANCE_RETAIL');
    expect(ENTERPRISE_DATA_BLUEPRINT.sector).toBe('ENTERPRISE');
    expect(RESEARCH_MLOPS_BLUEPRINT.sector).toBe('RESEARCH');
  });
});

describe('Blueprint Profiles', () => {
  it('should have valid trust weights in all blueprints', () => {
    const blueprints = [
      BASE_BLUEPRINT,
      PUBLIC_ADMINISTRATION_BLUEPRINT,
      SME_SELF_EMPLOYED_BLUEPRINT,
      TECHNOLOGY_GENAI_RAG_BLUEPRINT,
      FINANCE_RETAIL_BLUEPRINT,
      ENTERPRISE_DATA_BLUEPRINT,
      RESEARCH_MLOPS_BLUEPRINT,
    ];

    for (const blueprint of blueprints) {
      const weights = blueprint.trustProfile.weights;
      const sum = 
        weights.metadataCompleteness +
        weights.qualityScore +
        weights.classificationConfidence +
        weights.lineageAvailability +
        weights.reviewStatus;
      
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.01);
    }
  });

  it('should have quality thresholds between 0 and 1', () => {
    const blueprints = [
      BASE_BLUEPRINT,
      PUBLIC_ADMINISTRATION_BLUEPRINT,
      SME_SELF_EMPLOYED_BLUEPRINT,
    ];

    for (const blueprint of blueprints) {
      for (const [dimension, threshold] of Object.entries(blueprint.qualityProfile.thresholds)) {
        expect(threshold).toBeGreaterThanOrEqual(0);
        expect(threshold).toBeLessThanOrEqual(1);
      }
    }
  });
});
