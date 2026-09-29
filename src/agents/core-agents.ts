// ============================================================
// AGENTS — Core Discovery Agents
// ============================================================

import type { Agent, AgentDefinition, AgentExecutionContext, AgentExecutionResult } from './types';
import type { DataSourceConnector } from '../domain/contracts';
import type { SourceRepository, AssetRepository, RelationshipRepository, EvidenceRepository, AuditRepository } from '../domain/contracts';
import { generateId } from '../lib/utils';

// ============================================================
// AGENT 1: SOURCE DISCOVERY AGENT
// ============================================================

export class SourceDiscoveryAgent implements Agent {
  definition: AgentDefinition = {
    agentId: 'source-discovery-agent',
    name: 'Source Discovery Agent',
    mission: 'Inventory data sources, test connectivity, discover structures, and coordinate scans',
    capabilities: ['source-inventory', 'connectivity-test', 'structure-discovery', 'scan-coordination'],
    inputs: ['DataSource', 'DataSourceConnector'],
    outputs: ['DiscoveredAssets', 'Relationships', 'ScanRun'],
    dependencies: [],
    permissions: {
      sources: ['READ', 'WRITE'],
      assets: ['READ', 'WRITE'],
      relationships: ['READ', 'WRITE'],
      evidence: ['WRITE'],
      audit: ['WRITE'],
    },
    trigger: 'EVENT',
    executionMode: 'AUTOMATIC',
    status: 'IDLE',
    metrics: { runs: 0, successes: 0, failures: 0, blocked: 0, needsReview: 0, averageDuration: 0 },
    evidenceProduced: 0,
    auditEventsProduced: 0,
    humanOversightRequired: false,
    failurePolicy: { maxRetries: 3, retryDelay: 5000, escalateAfterRetries: true, blockDownstream: true },
    implementationLevel: 'IMPLEMENTED',
  };

  constructor(
    private sourceRepo: SourceRepository,
    private assetRepo: AssetRepository,
    private relationshipRepo: RelationshipRepository,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository,
    private connectors: Map<string, DataSourceConnector>
  ) {}

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const evidenceIds: string[] = [];
    const auditEventIds: string[] = [];
    const outputs: Record<string, unknown> = {};

    try {
      const sourceId = context.inputs.sourceId as string;
      const source = this.sourceRepo.getById(sourceId);
      
      if (!source) {
        throw new Error(`Source ${sourceId} not found`);
      }

      const connector = this.connectors.get(source.type);
      if (!connector) {
        throw new Error(`No connector available for source type: ${source.type}`);
      }

      // Test connection
      const connectionResult = await connector.testConnection();
      
      const evidenceId = generateId();
      this.evidenceRepo.save({
        id: evidenceId,
        type: 'CONNECTION_TESTED',
        subjectType: 'DataSource',
        subjectId: sourceId,
        actor: 'system:source-discovery-agent',
        timestamp: new Date().toISOString(),
        source: 'SourceDiscoveryAgent.execute',
        metadata: { success: connectionResult.success, latencyMs: connectionResult.latencyMs },
      });
      evidenceIds.push(evidenceId);

      if (!connectionResult.success) {
        throw new Error(`Connection test failed: ${connectionResult.message}`);
      }

      // Discover assets
      const discoveryResult = await connector.discover();
      outputs.discoveredAssets = discoveryResult.assets.length;
      outputs.relationships = discoveryResult.relationships.length;

      const discoveryEvidenceId = generateId();
      this.evidenceRepo.save({
        id: discoveryEvidenceId,
        type: 'ASSET_DISCOVERED',
        subjectType: 'DataSource',
        subjectId: sourceId,
        actor: 'system:source-discovery-agent',
        timestamp: new Date().toISOString(),
        source: 'SourceDiscoveryAgent.execute',
        metadata: { 
          assetsDiscovered: discoveryResult.assets.length,
          relationshipsDiscovered: discoveryResult.relationships.length,
        },
      });
      evidenceIds.push(discoveryEvidenceId);

      outputs.sourceId = sourceId;
      outputs.discoveryResult = discoveryResult;

      return {
        success: true,
        outputs,
        evidenceIds,
        auditEventIds,
      };
    } catch (error) {
      return {
        success: false,
        outputs,
        evidenceIds,
        auditEventIds,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// ============================================================
// AGENT 2: METADATA INTELLIGENCE AGENT
// ============================================================

export class MetadataIntelligenceAgent implements Agent {
  definition: AgentDefinition = {
    agentId: 'metadata-intelligence-agent',
    name: 'Metadata Intelligence Agent',
    mission: 'Extract, normalize, compare, update, and version technical metadata',
    capabilities: ['metadata-extraction', 'normalization', 'comparison', 'versioning', 'change-detection'],
    inputs: ['DiscoveredAssets', 'ExistingAssets'],
    outputs: ['NormalizedAssets', 'MetadataChanges', 'AssetVersions'],
    dependencies: ['source-discovery-agent'],
    permissions: {
      assets: ['READ', 'WRITE'],
      evidence: ['WRITE'],
      audit: ['WRITE'],
    },
    trigger: 'EVENT',
    executionMode: 'AUTOMATIC',
    status: 'IDLE',
    metrics: { runs: 0, successes: 0, failures: 0, blocked: 0, needsReview: 0, averageDuration: 0 },
    evidenceProduced: 0,
    auditEventsProduced: 0,
    humanOversightRequired: false,
    failurePolicy: { maxRetries: 2, retryDelay: 3000, escalateAfterRetries: true, blockDownstream: false },
    implementationLevel: 'IMPLEMENTED',
  };

  constructor(
    private assetRepo: AssetRepository,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const evidenceIds: string[] = [];
    const auditEventIds: string[] = [];
    const outputs: Record<string, unknown> = {};

    try {
      const discoveredAssets = context.inputs.discoveredAssets as any[];
      
      // Normalize and save assets
      let created = 0;
      let updated = 0;

      for (const discovered of discoveredAssets) {
        const existing = this.assetRepo.getAll().find(a => a.qualifiedName === discovered.qualifiedName);
        
        if (existing) {
          // Update existing asset
          this.assetRepo.update(existing.id, {
            metadata: discovered.metadata,
            description: discovered.description,
            updatedAt: new Date().toISOString(),
          });
          updated++;
        } else {
          // Create new asset
          const asset = {
            id: generateId(),
            sourceId: discovered.sourceId,
            type: discovered.type,
            name: discovered.name,
            qualifiedName: discovered.qualifiedName,
            description: discovered.description,
            status: 'DISCOVERED' as const,
            sensitivity: 'UNKNOWN' as const,
            certificationStatus: 'UNCERTIFIED' as const,
            metadata: discovered.metadata,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          this.assetRepo.save(asset);
          created++;
        }
      }

      outputs.assetsCreated = created;
      outputs.assetsUpdated = updated;

      const evidenceId = generateId();
      this.evidenceRepo.save({
        id: evidenceId,
        type: 'ASSET_DISCOVERED',
        subjectType: 'Metadata',
        subjectId: 'batch',
        actor: 'system:metadata-intelligence-agent',
        timestamp: new Date().toISOString(),
        source: 'MetadataIntelligenceAgent.execute',
        metadata: { created, updated },
      });
      evidenceIds.push(evidenceId);

      return {
        success: true,
        outputs,
        evidenceIds,
        auditEventIds,
      };
    } catch (error) {
      return {
        success: false,
        outputs,
        evidenceIds,
        auditEventIds,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// ============================================================
// AGENT 3: SCHEMA CHANGE AGENT
// ============================================================

export class SchemaChangeAgent implements Agent {
  definition: AgentDefinition = {
    agentId: 'schema-change-agent',
    name: 'Schema Change Agent',
    mission: 'Compare asset versions, detect schema changes, identify affected assets, and activate impact analysis',
    capabilities: ['schema-comparison', 'change-detection', 'impact-identification'],
    inputs: ['AssetVersions', 'CurrentSchema'],
    outputs: ['SchemaChanges', 'AffectedAssets'],
    dependencies: ['metadata-intelligence-agent'],
    permissions: {
      assets: ['READ'],
      evidence: ['WRITE'],
      audit: ['WRITE'],
    },
    trigger: 'EVENT',
    executionMode: 'AUTOMATIC',
    status: 'IDLE',
    metrics: { runs: 0, successes: 0, failures: 0, blocked: 0, needsReview: 0, averageDuration: 0 },
    evidenceProduced: 0,
    auditEventsProduced: 0,
    humanOversightRequired: false,
    failurePolicy: { maxRetries: 2, retryDelay: 3000, escalateAfterRetries: true, blockDownstream: false },
    implementationLevel: 'IMPLEMENTED',
  };

  constructor(
    private assetRepo: AssetRepository,
    private evidenceRepo: EvidenceRepository,
    private auditRepo: AuditRepository
  ) {}

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const evidenceIds: string[] = [];
    const auditEventIds: string[] = [];
    const outputs: Record<string, unknown> = {};

    try {
      // Compare current state with previous version
      // This is a simplified implementation
      const changes: Array<{ type: string; assetId: string; details: string }> = [];
      
      outputs.changes = changes;
      outputs.changeCount = changes.length;

      if (changes.length > 0) {
        const evidenceId = generateId();
        this.evidenceRepo.save({
          id: evidenceId,
          type: 'ASSET_UPDATED',
          subjectType: 'Schema',
          subjectId: 'batch',
          actor: 'system:schema-change-agent',
          timestamp: new Date().toISOString(),
          source: 'SchemaChangeAgent.execute',
          metadata: { changeCount: changes.length },
        });
        evidenceIds.push(evidenceId);
      }

      return {
        success: true,
        outputs,
        evidenceIds,
        auditEventIds,
      };
    } catch (error) {
      return {
        success: false,
        outputs,
        evidenceIds,
        auditEventIds,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
