// ============================================================
// APP — Catalog Context (Global State)
// ============================================================

import React, { createContext, useContext, useCallback, useState, useMemo } from 'react';
import type {
  AssetRepository,
  AssetVersionRepository,
  RelationshipRepository,
  SourceRepository,
  ScanRepository,
  ClassificationRepository,
  QualityRepository,
  EvidenceRepository,
  AuditRepository,
  TrustScoreRepository,
  ConnectorRegistry,
  DataSourceConnector,
  ConnectionTestResult,
} from '../domain/contracts';
import {
  InMemoryAssetRepository,
  InMemoryAssetVersionRepository,
  InMemoryRelationshipRepository,
  InMemorySourceRepository,
  InMemoryScanRepository,
  InMemoryClassificationRepository,
  InMemoryQualityRepository,
  InMemoryEvidenceRepository,
  InMemoryAuditRepository,
  InMemoryTrustScoreRepository,
} from '../infrastructure/in-memory-repository';
import { DemoConnector } from '../infrastructure/demo-connector';
import { ClassificationEngine } from '../services/classification-engine';
import { QualityEngine } from '../services/quality-engine';
import { TrustScoreService } from '../services/trust-score';
import { SearchService } from '../services/search-service';
import { ScanEngine, ScanResult } from '../services/scan-engine';
import { ImpactAnalyzer } from '../services/impact-analyzer';
import { PolicyEngine } from '../services/policy-engine';
import type {
  Asset,
  AssetRelationship,
  AssetVersion,
  AuditEvent,
  Classification,
  DataSource,
  EvidenceRecord,
  QualityResult,
  ScanRun,
  SearchQuery,
  SearchResult,
  TrustScore,
} from '../types';
import { generateId } from '../lib/utils';

// Demo actor constant - clearly identifies non-authenticated operations
export const DEMO_REVIEW_ACTOR = 'demo-reviewer';

// ---- Service Container ----

interface ServiceContainer {
  assetRepo: AssetRepository;
  assetVersionRepo: AssetVersionRepository;
  relationshipRepo: RelationshipRepository;
  sourceRepo: SourceRepository;
  scanRepo: ScanRepository;
  classificationRepo: ClassificationRepository;
  qualityRepo: QualityRepository;
  evidenceRepo: EvidenceRepository;
  auditRepo: AuditRepository;
  trustScoreRepo: TrustScoreRepository;
  connectorRegistry: ConnectorRegistry;
  classificationEngine: ClassificationEngine;
  qualityEngine: QualityEngine;
  trustScoreService: TrustScoreService;
  searchService: SearchService;
  scanEngine: ScanEngine;
  impactAnalyzer: ImpactAnalyzer;
  policyEngine: PolicyEngine;
}

function createServiceContainer(): ServiceContainer {
  const assetRepo = new InMemoryAssetRepository();
  const assetVersionRepo = new InMemoryAssetVersionRepository();
  const relationshipRepo = new InMemoryRelationshipRepository();
  const sourceRepo = new InMemorySourceRepository();
  const scanRepo = new InMemoryScanRepository();
  const classificationRepo = new InMemoryClassificationRepository();
  const qualityRepo = new InMemoryQualityRepository();
  const evidenceRepo = new InMemoryEvidenceRepository();
  const auditRepo = new InMemoryAuditRepository();
  const trustScoreRepo = new InMemoryTrustScoreRepository();

  const demoConnector = new DemoConnector();

  const connectorRegistry: ConnectorRegistry = {
    getConnector(sourceType: string): DataSourceConnector | undefined {
      if (sourceType === 'DEMO') return demoConnector;
      // PostgresConnector would go here — ADAPTER_READY, not connected
      return undefined;
    },
  };

  const classificationEngine = new ClassificationEngine(
    classificationRepo,
    evidenceRepo,
    auditRepo
  );

  const qualityEngine = new QualityEngine(
    qualityRepo,
    evidenceRepo,
    auditRepo,
    demoConnector
  );

  const trustScoreService = new TrustScoreService(
    assetRepo,
    classificationRepo,
    qualityRepo,
    trustScoreRepo,
    evidenceRepo,
    relationshipRepo
  );

  const searchService = new SearchService(
    assetRepo,
    classificationRepo,
    qualityRepo,
    trustScoreRepo
  );

  const scanEngine = new ScanEngine(
    sourceRepo,
    scanRepo,
    assetRepo,
    assetVersionRepo,
    relationshipRepo,
    evidenceRepo,
    auditRepo,
    connectorRegistry,
    classificationEngine,
    qualityEngine,
    trustScoreService
  );

  const impactAnalyzer = new ImpactAnalyzer(relationshipRepo, assetRepo);

  const policyEngine = new PolicyEngine(
    assetRepo,
    classificationRepo,
    qualityRepo,
    relationshipRepo,
    evidenceRepo,
    auditRepo
  );

  return {
    assetRepo,
    assetVersionRepo,
    relationshipRepo,
    sourceRepo,
    scanRepo,
    classificationRepo,
    qualityRepo,
    evidenceRepo,
    auditRepo,
    trustScoreRepo,
    connectorRegistry,
    classificationEngine,
    qualityEngine,
    trustScoreService,
    searchService,
    scanEngine,
    impactAnalyzer,
    policyEngine,
  };
}

// ---- Context ----

interface CatalogContextValue {
  // Services (read-only access)
  services: ServiceContainer;

  // Data accessors (trigger re-render)
  assets: Asset[];
  sources: DataSource[];
  scanRuns: ScanRun[];
  relationships: AssetRelationship[];
  classifications: Classification[];
  qualityResults: QualityResult[];
  evidence: EvidenceRecord[];
  auditEvents: AuditEvent[];
  trustScores: TrustScore[];

  // Actions
  createDemoSource: (name: string, description?: string) => DataSource;
  testConnection: (sourceId: string) => Promise<ConnectionTestResult>;
  runScan: (sourceId: string) => Promise<ScanResult>;
  searchAssets: (query: SearchQuery) => SearchResult;
  getAssetById: (id: string) => Asset | undefined;
  getAssetVersions: (assetId: string) => AssetVersion[];
  getRelationshipsForAsset: (assetId: string) => AssetRelationship[];
  getClassificationsForAsset: (assetId: string) => Classification[];
  getQualityForAsset: (assetId: string) => QualityResult[];
  getTrustScore: (assetId: string) => TrustScore | undefined;
  getEvidenceForSubject: (subjectId: string) => EvidenceRecord[];
  reviewClassification: (id: string, status: 'CONFIRMED' | 'REJECTED') => void;
  analyzeImpact: (assetId: string) => import('../types').ImpactAnalysis;
  getPolicies: () => import('../types').Policy[];
  evaluatePolicies: () => import('../types').PolicyEvaluation[];
  refresh: () => void;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

// ---- Provider ----

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [services] = useState<ServiceContainer>(() => createServiceContainer());
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setVersion(v => v + 1);
  }, []);

  // Data accessors - MUST depend on version to trigger re-render after mutations
  const assets = useMemo(() => services.assetRepo.getAll(), [services, version]);
  const sources = useMemo(() => services.sourceRepo.getAll(), [services, version]);
  const scanRuns = useMemo(() => services.scanRepo.getAll(), [services, version]);
  const relationships = useMemo(() => services.relationshipRepo.getAll(), [services, version]);
  const classifications = useMemo(() => services.classificationRepo.getAll(), [services, version]);
  const qualityResults = useMemo(() => services.qualityRepo.getAll(), [services, version]);
  const evidence = useMemo(() => services.evidenceRepo.getAll(), [services, version]);
  const auditEvents = useMemo(() => services.auditRepo.getAll(), [services, version]);
  const trustScores = useMemo(() => services.trustScoreRepo.getAll(), [services, version]);

  // Actions
  const createDemoSource = useCallback((name: string, description?: string): DataSource => {
    const source: DataSource = {
      id: generateId(),
      name,
      type: 'DEMO',
      description: description ?? `[DEMO] In-memory demo source for testing the catalog pipeline.`,
      status: 'ACTIVE',
      configuration: { kind: 'DEMO', datasetName: name.toLowerCase().replace(/\s+/g, '_') },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    services.sourceRepo.save(source);

    services.evidenceRepo.save({
      id: generateId(),
      type: 'SOURCE_CREATED',
      subjectType: 'DataSource',
      subjectId: source.id,
      actor: DEMO_REVIEW_ACTOR,
      timestamp: new Date().toISOString(),
      source: 'CatalogContext.createDemoSource',
      metadata: { name, type: 'DEMO' },
    });

    services.auditRepo.save({
      id: generateId(),
      actor: DEMO_REVIEW_ACTOR,
      action: 'CREATE',
      resourceType: 'DataSource',
      resourceId: source.id,
      timestamp: new Date().toISOString(),
      details: { name, type: 'DEMO' },
    });

    refresh();
    return source;
  }, [services, refresh]);

  const testConnection = useCallback(async (sourceId: string): Promise<ConnectionTestResult> => {
    const source = services.sourceRepo.getById(sourceId);
    if (!source) throw new Error(`Source not found: ${sourceId}`);

    const connector = services.connectorRegistry.getConnector(source.type);
    if (!connector) throw new Error(`No connector for type: ${source.type}`);

    const result = await connector.testConnection();

    services.evidenceRepo.save({
      id: generateId(),
      type: 'CONNECTION_TESTED',
      subjectType: 'DataSource',
      subjectId: sourceId,
      actor: DEMO_REVIEW_ACTOR,
      timestamp: new Date().toISOString(),
      source: 'CatalogContext.testConnection',
      metadata: { success: result.success, latencyMs: result.latencyMs },
    });

    services.auditRepo.save({
      id: generateId(),
      actor: DEMO_REVIEW_ACTOR,
      action: 'CONNECT',
      resourceType: 'DataSource',
      resourceId: sourceId,
      timestamp: new Date().toISOString(),
      details: { success: result.success },
    });

    refresh();
    return result;
  }, [services, refresh]);

  const runScan = useCallback(async (sourceId: string): Promise<ScanResult> => {
    const result = await services.scanEngine.executeScan(sourceId);
    refresh();
    return result;
  }, [services, refresh]);

  const searchAssets = useCallback((query: SearchQuery): SearchResult => {
    return services.searchService.search(query);
  }, [services]);

  const getAssetById = useCallback((id: string): Asset | undefined => {
    return services.assetRepo.getById(id);
  }, [services]);

  const getAssetVersions = useCallback((assetId: string): AssetVersion[] => {
    return services.assetVersionRepo.getByAssetId(assetId);
  }, [services]);

  const getRelationshipsForAsset = useCallback((assetId: string): AssetRelationship[] => {
    return services.relationshipRepo.getByAssetId(assetId);
  }, [services]);

  const getClassificationsForAsset = useCallback((assetId: string): Classification[] => {
    return services.classificationRepo.getByAssetId(assetId);
  }, [services]);

  const getQualityForAsset = useCallback((assetId: string): QualityResult[] => {
    return services.qualityRepo.getByAssetId(assetId);
  }, [services]);

  const getTrustScore = useCallback((assetId: string): TrustScore | undefined => {
    return services.trustScoreRepo.getByAssetId(assetId);
  }, [services]);

  const getEvidenceForSubject = useCallback((subjectId: string): EvidenceRecord[] => {
    return services.evidenceRepo.getBySubjectId(subjectId);
  }, [services]);

  const reviewClassification = useCallback((id: string, status: 'CONFIRMED' | 'REJECTED') => {
    services.classificationEngine.reviewClassification(id, status, DEMO_REVIEW_ACTOR);
    refresh();
  }, [services, refresh]);

  const analyzeImpact = useCallback((assetId: string) => {
    return services.impactAnalyzer.analyze(assetId);
  }, [services]);

  const getPolicies = useCallback(() => {
    return services.policyEngine.getPolicies();
  }, [services]);

  const evaluatePolicies = useCallback(() => {
    const evaluations = services.policyEngine.evaluateAll();
    refresh();
    return evaluations;
  }, [services, refresh]);

  const value: CatalogContextValue = {
    services,
    assets,
    sources,
    scanRuns,
    relationships,
    classifications,
    qualityResults,
    evidence,
    auditEvents,
    trustScores,
    createDemoSource,
    testConnection,
    runScan,
    searchAssets,
    getAssetById,
    getAssetVersions,
    getRelationshipsForAsset,
    getClassificationsForAsset,
    getQualityForAsset,
    getTrustScore,
    getEvidenceForSubject,
    reviewClassification,
    analyzeImpact,
    getPolicies,
    evaluatePolicies,
    refresh,
  };

  return (
    <CatalogContext.Provider value={value}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
}
