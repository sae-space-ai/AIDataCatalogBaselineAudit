// ============================================================
// TESTS — Connector Framework
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectorRegistry } from '../src/connectors/registry';
import { ConnectorFramework } from '../src/connectors/framework';
import { ConnectorSecurityValidator } from '../src/connectors/security-validator';
import { MetadataNormalizer } from '../src/connectors/normalizer';
import {
  MySQLConnector,
  SqlServerConnector,
  OracleConnector,
  FileConnector,
  ObjectStorageConnector,
  RestApiConnector,
  SnowflakeConnector,
  BigQueryConnector,
  RedshiftConnector,
  ALL_CONNECTOR_DEFINITIONS,
} from '../src/connectors/adapters';
import type { ConnectorDefinition, ScanScope, ScanPolicy } from '../src/connectors/types';

// ---- Connector Registry Tests ----

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry;

  beforeEach(() => {
    registry = new ConnectorRegistry();
  });

  it('should register a connector', () => {
    const definition: ConnectorDefinition = {
      id: 'test',
      name: 'Test Connector',
      category: 'RELATIONAL_DATABASE',
      version: '1.0.0',
      implementationLevel: 'IMPLEMENTED',
      capabilities: ['TEST_CONNECTION'],
      configurationSchema: { fields: [] },
      secretRequirements: [],
      supportedOperations: ['READ'],
      readOnlySupport: true,
      limitations: [],
      documentation: {
        status: 'Test',
        capabilities: [],
        requirements: [],
        limitations: [],
        secretRequirements: [],
        readOnlyBehavior: 'Read-only',
        verificationStatus: 'TEST',
      },
    };

    registry.register(definition);
    expect(registry.get('test')).toBeDefined();
  });

  it('should prevent duplicate registration', () => {
    const definition: ConnectorDefinition = {
      id: 'test',
      name: 'Test',
      category: 'RELATIONAL_DATABASE',
      version: '1.0.0',
      implementationLevel: 'IMPLEMENTED',
      capabilities: [],
      configurationSchema: { fields: [] },
      secretRequirements: [],
      supportedOperations: [],
      readOnlySupport: true,
      limitations: [],
      documentation: {
        status: '',
        capabilities: [],
        requirements: [],
        limitations: [],
        secretRequirements: [],
        readOnlyBehavior: '',
        verificationStatus: '',
      },
    };

    registry.register(definition);
    expect(() => registry.register(definition)).toThrow();
  });

  it('should list all connectors', () => {
    const def1: ConnectorDefinition = {
      id: 'test1',
      name: 'Test 1',
      category: 'RELATIONAL_DATABASE',
      version: '1.0.0',
      implementationLevel: 'IMPLEMENTED',
      capabilities: [],
      configurationSchema: { fields: [] },
      secretRequirements: [],
      supportedOperations: [],
      readOnlySupport: true,
      limitations: [],
      documentation: {
        status: '',
        capabilities: [],
        requirements: [],
        limitations: [],
        secretRequirements: [],
        readOnlyBehavior: '',
        verificationStatus: '',
      },
    };

    const def2: ConnectorDefinition = {
      ...def1,
      id: 'test2',
      name: 'Test 2',
    };

    registry.register(def1);
    registry.register(def2);

    expect(registry.list().length).toBe(2);
  });

  it('should filter by category', () => {
    const def1: ConnectorDefinition = {
      id: 'test1',
      name: 'Test 1',
      category: 'RELATIONAL_DATABASE',
      version: '1.0.0',
      implementationLevel: 'IMPLEMENTED',
      capabilities: [],
      configurationSchema: { fields: [] },
      secretRequirements: [],
      supportedOperations: [],
      readOnlySupport: true,
      limitations: [],
      documentation: {
        status: '',
        capabilities: [],
        requirements: [],
        limitations: [],
        secretRequirements: [],
        readOnlyBehavior: '',
        verificationStatus: '',
      },
    };

    const def2: ConnectorDefinition = {
      ...def1,
      id: 'test2',
      name: 'Test 2',
      category: 'FILE',
    };

    registry.register(def1);
    registry.register(def2);

    expect(registry.listByCategory('RELATIONAL_DATABASE').length).toBe(1);
    expect(registry.listByCategory('FILE').length).toBe(1);
  });

  it('should validate connector', () => {
    const validDef: ConnectorDefinition = {
      id: 'test',
      name: 'Test',
      category: 'RELATIONAL_DATABASE',
      version: '1.0.0',
      implementationLevel: 'IMPLEMENTED',
      capabilities: ['TEST_CONNECTION'],
      configurationSchema: { fields: [] },
      secretRequirements: [],
      supportedOperations: [],
      readOnlySupport: true,
      limitations: [],
      documentation: {
        status: '',
        capabilities: [],
        requirements: [],
        limitations: [],
        secretRequirements: [],
        readOnlyBehavior: '',
        verificationStatus: '',
      },
    };

    registry.register(validDef);
    const result = registry.validate('test');
    expect(result.valid).toBe(true);
  });
});

// ---- Connector Framework Tests ----

describe('ConnectorFramework', () => {
  let registry: ConnectorRegistry;
  let framework: ConnectorFramework;

  beforeEach(() => {
    registry = new ConnectorRegistry();
    framework = new ConnectorFramework(registry);
  });

  it('should create scan plan', () => {
    const definition: ConnectorDefinition = {
      id: 'test',
      name: 'Test',
      category: 'RELATIONAL_DATABASE',
      version: '1.0.0',
      implementationLevel: 'IMPLEMENTED',
      capabilities: ['TEST_CONNECTION', 'DISCOVER_TABLES'],
      configurationSchema: { fields: [] },
      secretRequirements: [],
      supportedOperations: [],
      readOnlySupport: true,
      limitations: [],
      documentation: {
        status: '',
        capabilities: [],
        requirements: [],
        limitations: [],
        secretRequirements: [],
        readOnlyBehavior: '',
        verificationStatus: '',
      },
    };

    registry.register(definition);

    const scope: ScanScope = {
      metadataDepth: 'STANDARD',
      statisticsEnabled: false,
      relationshipDiscoveryEnabled: false,
    };

    const policy: ScanPolicy = {
      mode: 'FULL',
      timeout: 30000,
      maxAssets: 1000,
      statisticsPolicy: {
        timeout: 5000,
        maximumRowsSampled: 1000,
        allowFullCount: false,
        allowSampling: true,
        allowedStatistics: ['rowCount'],
      },
      failurePolicy: {
        maxRetries: 3,
        retryDelay: 1000,
        continueOnPartialFailure: true,
        escalateAfterRetries: false,
      },
      incremental: false,
      changeDetection: false,
    };

    const plan = framework.createScanPlan('test', scope, policy);
    expect(plan.canProceed).toBe(true);
    expect(plan.capabilitiesRequired).toContain('TEST_CONNECTION');
  });

  it('should evaluate source health', () => {
    const definition: ConnectorDefinition = {
      id: 'test',
      name: 'Test',
      category: 'RELATIONAL_DATABASE',
      version: '1.0.0',
      implementationLevel: 'IMPLEMENTED',
      capabilities: [],
      configurationSchema: { fields: [] },
      secretRequirements: [],
      supportedOperations: [],
      readOnlySupport: true,
      limitations: [],
      documentation: {
        status: '',
        capabilities: [],
        requirements: [],
        limitations: [],
        secretRequirements: [],
        readOnlyBehavior: '',
        verificationStatus: '',
      },
    };

    registry.register(definition);

    const health = framework.evaluateSourceHealth('test', undefined, undefined);
    expect(health.status).toBe('NOT_TESTED');
  });
});

// ---- Security Validator Tests ----

describe('ConnectorSecurityValidator', () => {
  let validator: ConnectorSecurityValidator;

  beforeEach(() => {
    validator = new ConnectorSecurityValidator();
  });

  it('should validate configuration', () => {
    const definition: ConnectorDefinition = {
      id: 'test',
      name: 'Test',
      category: 'RELATIONAL_DATABASE',
      version: '1.0.0',
      implementationLevel: 'IMPLEMENTED',
      capabilities: [],
      configurationSchema: {
        fields: [
          { name: 'host', type: 'string', label: 'Host', description: '', required: true, sensitive: false },
        ],
      },
      secretRequirements: [],
      supportedOperations: [],
      readOnlySupport: true,
      limitations: [],
      documentation: {
        status: '',
        capabilities: [],
        requirements: [],
        limitations: [],
        secretRequirements: [],
        readOnlyBehavior: '',
        verificationStatus: '',
      },
    };

    const result = validator.validateConfiguration(definition, { host: 'localhost' });
    expect(result.valid).toBe(true);
  });

  it('should detect missing required fields', () => {
    const definition: ConnectorDefinition = {
      id: 'test',
      name: 'Test',
      category: 'RELATIONAL_DATABASE',
      version: '1.0.0',
      implementationLevel: 'IMPLEMENTED',
      capabilities: [],
      configurationSchema: {
        fields: [
          { name: 'host', type: 'string', label: 'Host', description: '', required: true, sensitive: false },
        ],
      },
      secretRequirements: [],
      supportedOperations: [],
      readOnlySupport: true,
      limitations: [],
      documentation: {
        status: '',
        capabilities: [],
        requirements: [],
        limitations: [],
        secretRequirements: [],
        readOnlyBehavior: '',
        verificationStatus: '',
      },
    };

    const result = validator.validateConfiguration(definition, {});
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Required field missing'))).toBe(true);
  });

  it('should detect dangerous URLs', () => {
    const definition: ConnectorDefinition = {
      id: 'test',
      name: 'Test',
      category: 'REST_API',
      version: '1.0.0',
      implementationLevel: 'IMPLEMENTED',
      capabilities: [],
      configurationSchema: {
        fields: [
          { name: 'baseUrl', type: 'string', label: 'URL', description: '', required: true, sensitive: false },
        ],
      },
      secretRequirements: [],
      supportedOperations: [],
      readOnlySupport: true,
      limitations: [],
      documentation: {
        status: '',
        capabilities: [],
        requirements: [],
        limitations: [],
        secretRequirements: [],
        readOnlyBehavior: '',
        verificationStatus: '',
      },
    };

    const result = validator.validateConfiguration(definition, { baseUrl: 'http://169.254.169.254/latest/meta-data/' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('dangerous destination'))).toBe(true);
  });

  it('should redact sensitive configuration', () => {
    const definition: ConnectorDefinition = {
      id: 'test',
      name: 'Test',
      category: 'RELATIONAL_DATABASE',
      version: '1.0.0',
      implementationLevel: 'IMPLEMENTED',
      capabilities: [],
      configurationSchema: {
        fields: [
          { name: 'password', type: 'string', label: 'Password', description: '', required: true, sensitive: true },
        ],
      },
      secretRequirements: [],
      supportedOperations: [],
      readOnlySupport: true,
      limitations: [],
      documentation: {
        status: '',
        capabilities: [],
        requirements: [],
        limitations: [],
        secretRequirements: [],
        readOnlyBehavior: '',
        verificationStatus: '',
      },
    };

    const redacted = validator.redactConfiguration(definition, { password: 'secret123' });
    expect(redacted.password).toBe('[REDACTED]');
  });
});

// ---- Metadata Normalizer Tests ----

describe('MetadataNormalizer', () => {
  let normalizer: MetadataNormalizer;

  beforeEach(() => {
    normalizer = new MetadataNormalizer();
  });

  it('should normalize table metadata', () => {
    const obj = {
      type: 'TABLE' as const,
      nativeIdentifier: 'table1',
      name: 'table1',
      qualifiedName: 'db.schema.table1',
      metadata: {
        schemaName: 'schema',
        databaseName: 'db',
        rowCount: 100,
        columnCount: 5,
      },
    };

    const normalized = normalizer.normalize(obj, 'source1');
    expect(normalized.type).toBe('TABLE');
    expect(normalized.metadata.kind).toBe('TABLE');
  });

  it('should normalize column metadata', () => {
    const obj = {
      type: 'COLUMN' as const,
      nativeIdentifier: 'col1',
      name: 'col1',
      qualifiedName: 'db.schema.table.col1',
      metadata: {
        tableName: 'table',
        schemaName: 'schema',
        databaseName: 'db',
        dataType: 'varchar',
        nullable: true,
        ordinalPosition: 1,
      },
    };

    const normalized = normalizer.normalize(obj, 'source1');
    expect(normalized.type).toBe('COLUMN');
    expect(normalized.metadata.kind).toBe('COLUMN');
  });
});

// ---- Connector Adapters Tests ----

describe('Connector Adapters', () => {
  it('should have all connector definitions', () => {
    expect(ALL_CONNECTOR_DEFINITIONS.length).toBeGreaterThan(0);
  });

  it('should have unique IDs', () => {
    const ids = ALL_CONNECTOR_DEFINITIONS.map(d => d.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('MySQL connector should be ADAPTER_READY', () => {
    expect(MySQLConnector.definition.implementationLevel).toBe('ADAPTER_READY');
  });

  it('SQL Server connector should be ADAPTER_READY', () => {
    expect(SqlServerConnector.definition.implementationLevel).toBe('ADAPTER_READY');
  });

  it('Oracle connector should be ADAPTER_READY', () => {
    expect(OracleConnector.definition.implementationLevel).toBe('ADAPTER_READY');
  });

  it('File connector should be ADAPTER_READY', () => {
    expect(FileConnector.definition.implementationLevel).toBe('ADAPTER_READY');
  });

  it('Object Storage connector should be MODEL_ONLY', () => {
    expect(ObjectStorageConnector.definition.implementationLevel).toBe('MODEL_ONLY');
  });

  it('REST API connector should be MODEL_ONLY', () => {
    expect(RestApiConnector.definition.implementationLevel).toBe('MODEL_ONLY');
  });

  it('Snowflake connector should be MODEL_ONLY', () => {
    expect(SnowflakeConnector.definition.implementationLevel).toBe('MODEL_ONLY');
  });

  it('BigQuery connector should be MODEL_ONLY', () => {
    expect(BigQueryConnector.definition.implementationLevel).toBe('MODEL_ONLY');
  });

  it('Redshift connector should be MODEL_ONLY', () => {
    expect(RedshiftConnector.definition.implementationLevel).toBe('MODEL_ONLY');
  });
});
