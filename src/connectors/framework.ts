// ============================================================
// CONNECTORS — Connector Framework
// ============================================================

import type {
  ConnectorDefinition,
  ConnectionTestResult,
  DiscoverySession,
  ScanScope,
  ScanPolicy,
  ScanPlan,
  SourceHealth,
  ConnectorCapability,
} from './types';
import type { DiscoveredAsset } from '../types';
import { ConnectorRegistry } from './registry';
import type { DataSourceConnector } from '../domain/contracts';

export interface ConnectorFactory {
  create(configuration: Record<string, unknown>): DataSourceConnector;
}

export class ConnectorFramework {
  private factories: Map<string, ConnectorFactory> = new Map();

  constructor(private registry: ConnectorRegistry) {}

  registerFactory(connectorId: string, factory: ConnectorFactory): void {
    if (!this.registry.get(connectorId)) {
      throw new Error(`Cannot register factory: connector ${connectorId} not registered`);
    }
    this.factories.set(connectorId, factory);
  }

  resolve(connectorId: string): DataSourceConnector | undefined {
    const factory = this.factories.get(connectorId);
    if (!factory) return undefined;
    // Factory needs configuration - this is a simplified version
    return undefined;
  }

  resolveWithConfig(connectorId: string, configuration: Record<string, unknown>): DataSourceConnector | undefined {
    const factory = this.factories.get(connectorId);
    if (!factory) return undefined;
    return factory.create(configuration);
  }

  async testConnection(
    connectorId: string,
    configuration: Record<string, unknown>
  ): Promise<ConnectionTestResult> {
    const definition = this.registry.get(connectorId);
    if (!definition) {
      return {
        success: false,
        connectorId,
        timestamp: new Date().toISOString(),
        capabilitiesDetected: [],
        warnings: ['Connector not found'],
        errorCode: 'CONNECTOR_NOT_FOUND',
        errorMessageSafe: `Connector ${connectorId} is not registered`,
      };
    }

    const connector = this.resolveWithConfig(connectorId, configuration);
    if (!connector) {
      return {
        success: false,
        connectorId,
        timestamp: new Date().toISOString(),
        capabilitiesDetected: [],
        warnings: ['Factory not available'],
        errorCode: 'FACTORY_NOT_AVAILABLE',
        errorMessageSafe: 'Connector factory is not registered',
      };
    }

    const startTime = Date.now();
    try {
      const result = await connector.testConnection();
      const latency = Date.now() - startTime;

      return {
        success: result.success,
        connectorId,
        timestamp: new Date().toISOString(),
        latency,
        capabilitiesDetected: definition.capabilities,
        serverInformationSafe: {},
        warnings: result.success ? [] : [result.message],
        errorCode: result.success ? undefined : 'CONNECTION_FAILED',
        errorMessageSafe: result.success ? undefined : result.message,
      };
    } catch (error) {
      return {
        success: false,
        connectorId,
        timestamp: new Date().toISOString(),
        latency: Date.now() - startTime,
        capabilitiesDetected: [],
        warnings: ['Connection test threw exception'],
        errorCode: 'CONNECTION_ERROR',
        errorMessageSafe: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async discover(
    connectorId: string,
    configuration: Record<string, unknown>,
    scope: ScanScope
  ): Promise<DiscoverySession> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const correlationId = `corr-${Date.now()}`;

    const session: DiscoverySession = {
      id: sessionId,
      sourceId: 'unknown',
      connectorId,
      status: 'PENDING',
      startedAt: new Date().toISOString(),
      discoveredAssets: 0,
      discoveredRelationships: 0,
      metadataExtracted: 0,
      warnings: [],
      errors: [],
      correlationId,
    };

    const connector = this.resolveWithConfig(connectorId, configuration);
    if (!connector) {
      session.status = 'FAILED';
      session.completedAt = new Date().toISOString();
      session.errors.push({
        code: 'FACTORY_NOT_AVAILABLE',
        message: 'Connector factory is not registered',
        recoverable: false,
      });
      return session;
    }

    session.status = 'RUNNING';

    try {
      const result = await connector.discover();
      
      // Filter by scope
      const filteredAssets = this.applyScope(result.assets, scope);
      
      session.discoveredAssets = filteredAssets.length;
      session.discoveredRelationships = result.relationships.length;
      session.metadataExtracted = filteredAssets.length;
      session.status = 'SUCCESS';
      session.completedAt = new Date().toISOString();
    } catch (error) {
      session.status = 'FAILED';
      session.completedAt = new Date().toISOString();
      session.errors.push({
        code: 'DISCOVERY_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: true,
      });
    }

    return session;
  }

  private applyScope(assets: DiscoveredAsset[], scope: ScanScope): DiscoveredAsset[] {
    let filtered = assets;

    if (scope.assetTypes && scope.assetTypes.length > 0) {
      filtered = filtered.filter(a => scope.assetTypes!.includes(a.type));
    }

    if (scope.includeSchemas && scope.includeSchemas.length > 0) {
      filtered = filtered.filter(a => 
        scope.includeSchemas!.some(s => a.qualifiedName.includes(s))
      );
    }

    if (scope.excludeSchemas && scope.excludeSchemas.length > 0) {
      filtered = filtered.filter(a => 
        !scope.excludeSchemas!.some(s => a.qualifiedName.includes(s))
      );
    }

    return filtered;
  }

  createScanPlan(
    connectorId: string,
    scope: ScanScope,
    policy: ScanPolicy
  ): ScanPlan {
    const definition = this.registry.get(connectorId);
    if (!definition) {
      return {
        id: `plan-${Date.now()}`,
        sourceId: 'unknown',
        connectorId,
        mode: policy.mode,
        scope,
        policy,
        estimatedAssets: 0,
        estimatedDuration: 0,
        capabilitiesRequired: [],
        capabilitiesAvailable: [],
        capabilitiesMissing: [],
        warnings: ['Connector not found'],
        canProceed: false,
      };
    }

    const capabilitiesRequired = this.determineRequiredCapabilities(scope, policy);
    const capabilitiesAvailable = definition.capabilities.filter(c => 
      capabilitiesRequired.includes(c)
    );
    const capabilitiesMissing = capabilitiesRequired.filter(c => 
      !definition.capabilities.includes(c)
    );

    const warnings: string[] = [];
    if (capabilitiesMissing.length > 0) {
      warnings.push(`Missing capabilities: ${capabilitiesMissing.join(', ')}`);
    }

    if (definition.implementationLevel !== 'IMPLEMENTED') {
      warnings.push(`Connector implementation level: ${definition.implementationLevel}`);
    }

    const canProceed = capabilitiesMissing.length === 0 && 
                       definition.implementationLevel === 'IMPLEMENTED';

    return {
      id: `plan-${Date.now()}`,
      sourceId: 'unknown',
      connectorId,
      mode: policy.mode,
      scope,
      policy,
      estimatedAssets: 0,
      estimatedDuration: policy.timeout,
      capabilitiesRequired,
      capabilitiesAvailable,
      capabilitiesMissing,
      warnings,
      canProceed,
    };
  }

  private determineRequiredCapabilities(scope: ScanScope, policy: ScanPolicy): ConnectorCapability[] {
    const capabilities: ConnectorCapability[] = ['TEST_CONNECTION'];

    if (scope.assetTypes?.includes('SCHEMA') || !scope.assetTypes) {
      capabilities.push('DISCOVER_SCHEMAS');
    }

    if (scope.assetTypes?.includes('TABLE') || !scope.assetTypes) {
      capabilities.push('DISCOVER_TABLES');
    }

    if (scope.assetTypes?.includes('COLUMN') || !scope.assetTypes) {
      capabilities.push('DISCOVER_COLUMNS');
    }

    if (scope.relationshipDiscoveryEnabled) {
      capabilities.push('DISCOVER_RELATIONSHIPS');
    }

    if (scope.metadataDepth !== 'BASIC') {
      capabilities.push('EXTRACT_METADATA');
    }

    if (scope.statisticsEnabled) {
      capabilities.push('EXTRACT_STATISTICS');
    }

    if (policy.changeDetection) {
      capabilities.push('CHANGE_DETECTION');
    }

    if (policy.incremental) {
      capabilities.push('INCREMENTAL_SCAN');
    }

    return capabilities;
  }

  evaluateSourceHealth(
    connectorId: string,
    lastTestResult?: ConnectionTestResult,
    lastScanAt?: string
  ): SourceHealth {
    const status = this.determineHealthStatus(lastTestResult, lastScanAt);

    return {
      sourceId: 'unknown',
      status,
      lastTestedAt: lastTestResult?.timestamp,
      details: status === 'HEALTHY' ? 'Source is healthy' : `Source status: ${status}`,
    };
  }

  private determineHealthStatus(
    lastTestResult?: ConnectionTestResult,
    lastScanAt?: string
  ): SourceHealth['status'] {
    if (!lastTestResult) {
      return 'NOT_TESTED';
    }

    if (!lastTestResult.success) {
      if (lastTestResult.errorCode === 'AUTHENTICATION_FAILED') {
        return 'AUTHENTICATION_REQUIRED';
      }
      if (lastTestResult.errorCode === 'CONFIGURATION_ERROR') {
        return 'CONFIGURATION_ERROR';
      }
      return 'UNREACHABLE';
    }

    if (lastTestResult.warnings.length > 0) {
      return 'DEGRADED';
    }

    return 'HEALTHY';
  }
}
