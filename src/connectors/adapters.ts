// ============================================================
// CONNECTORS — Additional Connector Adapters
// ============================================================

import type { DataSourceConnector, ConnectionTestResult } from '../domain/contracts';
import type { DiscoveryResult } from '../types';
import type { ConnectorDefinition, ConnectorImplementationLevel } from './types';

// ---- MySQL Connector ----

export class MySQLConnector implements DataSourceConnector {
  static readonly definition: ConnectorDefinition = {
    id: 'mysql',
    name: 'MySQL',
    category: 'RELATIONAL_DATABASE',
    version: '1.0.0',
    implementationLevel: 'ADAPTER_READY',
    capabilities: [
      'TEST_CONNECTION',
      'DISCOVER_SCHEMAS',
      'DISCOVER_TABLES',
      'DISCOVER_COLUMNS',
      'DISCOVER_RELATIONSHIPS',
      'EXTRACT_METADATA',
    ],
    configurationSchema: {
      fields: [
        { name: 'host', type: 'string', label: 'Host', description: 'MySQL server host', required: true, sensitive: false },
        { name: 'port', type: 'number', label: 'Port', description: 'MySQL server port', required: true, defaultValue: 3306, sensitive: false },
        { name: 'database', type: 'string', label: 'Database', description: 'Database name', required: true, sensitive: false },
      ],
    },
    secretRequirements: [
      { name: 'username', description: 'MySQL username' },
      { name: 'password', description: 'MySQL password' },
    ],
    supportedOperations: ['READ'],
    readOnlySupport: true,
    limitations: ['Requires MySQL driver installation', 'Not tested with real database'],
    documentation: {
      status: 'Adapter ready, not verified',
      capabilities: ['Connection test', 'Schema discovery', 'Table discovery', 'Column discovery'],
      requirements: ['MySQL driver', 'Network access'],
      limitations: ['No real connection tested'],
      secretRequirements: ['Username', 'Password'],
      readOnlyBehavior: 'Read-only by design',
      verificationStatus: 'ADAPTER_READY',
    },
  };

  async testConnection(): Promise<ConnectionTestResult> {
    return {
      success: false,
      message: '[MySQL] Connection not available. Driver not installed.',
    };
  }

  async discover(): Promise<DiscoveryResult> {
    throw new Error('MySQL discovery not implemented. Driver required.');
  }

  async extractMetadata(_qualifiedName: string): Promise<Record<string, unknown>> {
    throw new Error('MySQL metadata extraction not implemented.');
  }
}

// ---- SQL Server Connector ----

export class SqlServerConnector implements DataSourceConnector {
  static readonly definition: ConnectorDefinition = {
    id: 'sqlserver',
    name: 'SQL Server',
    category: 'RELATIONAL_DATABASE',
    version: '1.0.0',
    implementationLevel: 'ADAPTER_READY',
    capabilities: [
      'TEST_CONNECTION',
      'DISCOVER_SCHEMAS',
      'DISCOVER_TABLES',
      'DISCOVER_COLUMNS',
      'EXTRACT_METADATA',
    ],
    configurationSchema: {
      fields: [
        { name: 'host', type: 'string', label: 'Host', description: 'SQL Server host', required: true, sensitive: false },
        { name: 'port', type: 'number', label: 'Port', description: 'SQL Server port', required: true, defaultValue: 1433, sensitive: false },
        { name: 'database', type: 'string', label: 'Database', description: 'Database name', required: true, sensitive: false },
      ],
    },
    secretRequirements: [
      { name: 'username', description: 'SQL Server username' },
      { name: 'password', description: 'SQL Server password' },
    ],
    supportedOperations: ['READ'],
    readOnlySupport: true,
    limitations: ['Requires SQL Server driver', 'Not tested with real database'],
    documentation: {
      status: 'Adapter ready, not verified',
      capabilities: ['Connection test', 'Schema discovery', 'Table discovery'],
      requirements: ['SQL Server driver', 'Network access'],
      limitations: ['No real connection tested'],
      secretRequirements: ['Username', 'Password'],
      readOnlyBehavior: 'Read-only by design',
      verificationStatus: 'ADAPTER_READY',
    },
  };

  async testConnection(): Promise<ConnectionTestResult> {
    return {
      success: false,
      message: '[SQL Server] Connection not available. Driver not installed.',
    };
  }

  async discover(): Promise<DiscoveryResult> {
    throw new Error('SQL Server discovery not implemented. Driver required.');
  }

  async extractMetadata(_qualifiedName: string): Promise<Record<string, unknown>> {
    throw new Error('SQL Server metadata extraction not implemented.');
  }
}

// ---- Oracle Connector ----

export class OracleConnector implements DataSourceConnector {
  static readonly definition: ConnectorDefinition = {
    id: 'oracle',
    name: 'Oracle',
    category: 'RELATIONAL_DATABASE',
    version: '1.0.0',
    implementationLevel: 'ADAPTER_READY',
    capabilities: [
      'TEST_CONNECTION',
      'DISCOVER_SCHEMAS',
      'DISCOVER_TABLES',
      'DISCOVER_COLUMNS',
    ],
    configurationSchema: {
      fields: [
        { name: 'host', type: 'string', label: 'Host', description: 'Oracle host', required: true, sensitive: false },
        { name: 'port', type: 'number', label: 'Port', description: 'Oracle port', required: true, defaultValue: 1521, sensitive: false },
        { name: 'service', type: 'string', label: 'Service', description: 'Oracle service name', required: true, sensitive: false },
      ],
    },
    secretRequirements: [
      { name: 'username', description: 'Oracle username' },
      { name: 'password', description: 'Oracle password' },
    ],
    supportedOperations: ['READ'],
    readOnlySupport: true,
    limitations: ['Requires Oracle Client', 'Not tested with real database'],
    documentation: {
      status: 'Adapter ready, not verified',
      capabilities: ['Connection test', 'Schema discovery'],
      requirements: ['Oracle Client', 'Network access'],
      limitations: ['No real connection tested'],
      secretRequirements: ['Username', 'Password'],
      readOnlyBehavior: 'Read-only by design',
      verificationStatus: 'ADAPTER_READY',
    },
  };

  async testConnection(): Promise<ConnectionTestResult> {
    return {
      success: false,
      message: '[Oracle] Connection not available. Oracle Client not installed.',
    };
  }

  async discover(): Promise<DiscoveryResult> {
    throw new Error('Oracle discovery not implemented. Oracle Client required.');
  }

  async extractMetadata(_qualifiedName: string): Promise<Record<string, unknown>> {
    throw new Error('Oracle metadata extraction not implemented.');
  }
}

// ---- File Connector ----

export class FileConnector implements DataSourceConnector {
  static readonly definition: ConnectorDefinition = {
    id: 'file',
    name: 'File',
    category: 'FILE',
    version: '1.0.0',
    implementationLevel: 'ADAPTER_READY',
    capabilities: [
      'TEST_CONNECTION',
      'DISCOVER_TABLES',
      'DISCOVER_COLUMNS',
      'EXTRACT_METADATA',
      'EXTRACT_STATISTICS',
    ],
    configurationSchema: {
      fields: [
        { name: 'path', type: 'string', label: 'File Path', description: 'Path to file', required: true, sensitive: false },
        { name: 'format', type: 'select', label: 'Format', description: 'File format', required: true, options: ['csv', 'json', 'jsonl', 'parquet'], sensitive: false },
      ],
    },
    secretRequirements: [],
    supportedOperations: ['READ'],
    readOnlySupport: true,
    limitations: ['File size limits apply', 'No streaming support yet'],
    documentation: {
      status: 'Adapter ready, not verified',
      capabilities: ['File metadata', 'Column inference', 'Basic statistics'],
      requirements: ['File system access'],
      limitations: ['Size limits', 'No streaming'],
      secretRequirements: [],
      readOnlyBehavior: 'Read-only by design',
      verificationStatus: 'ADAPTER_READY',
    },
  };

  async testConnection(): Promise<ConnectionTestResult> {
    return {
      success: false,
      message: '[File] File access not available in browser environment.',
    };
  }

  async discover(): Promise<DiscoveryResult> {
    throw new Error('File discovery not implemented. Server-side execution required.');
  }

  async extractMetadata(_qualifiedName: string): Promise<Record<string, unknown>> {
    throw new Error('File metadata extraction not implemented.');
  }
}

// ---- Object Storage Connector ----

export class ObjectStorageConnector implements DataSourceConnector {
  static readonly definition: ConnectorDefinition = {
    id: 'object-storage',
    name: 'Object Storage',
    category: 'OBJECT_STORAGE',
    version: '1.0.0',
    implementationLevel: 'MODEL_ONLY',
    capabilities: [
      'TEST_CONNECTION',
      'DISCOVER_TABLES',
      'EXTRACT_METADATA',
    ],
    configurationSchema: {
      fields: [
        { name: 'provider', type: 'select', label: 'Provider', description: 'Storage provider', required: true, options: ['s3', 'azure-blob', 'gcs'], sensitive: false },
        { name: 'bucket', type: 'string', label: 'Bucket', description: 'Bucket name', required: true, sensitive: false },
      ],
    },
    secretRequirements: [
      { name: 'accessKey', description: 'Access key ID' },
      { name: 'secretKey', description: 'Secret access key' },
    ],
    supportedOperations: ['READ'],
    readOnlySupport: true,
    limitations: ['Provider not selected', 'No implementation'],
    documentation: {
      status: 'Model only, no implementation',
      capabilities: ['Object listing', 'Metadata extraction'],
      requirements: ['Cloud provider SDK'],
      limitations: ['No provider selected'],
      secretRequirements: ['Access key', 'Secret key'],
      readOnlyBehavior: 'Read-only by design',
      verificationStatus: 'MODEL_ONLY',
    },
  };

  async testConnection(): Promise<ConnectionTestResult> {
    return {
      success: false,
      message: '[Object Storage] Not implemented. Provider not selected.',
    };
  }

  async discover(): Promise<DiscoveryResult> {
    throw new Error('Object Storage discovery not implemented.');
  }

  async extractMetadata(_qualifiedName: string): Promise<Record<string, unknown>> {
    throw new Error('Object Storage metadata extraction not implemented.');
  }
}

// ---- REST API Connector ----

export class RestApiConnector implements DataSourceConnector {
  static readonly definition: ConnectorDefinition = {
    id: 'rest-api',
    name: 'REST API',
    category: 'REST_API',
    version: '1.0.0',
    implementationLevel: 'MODEL_ONLY',
    capabilities: [
      'TEST_CONNECTION',
      'EXTRACT_METADATA',
    ],
    configurationSchema: {
      fields: [
        { name: 'baseUrl', type: 'string', label: 'Base URL', description: 'API base URL', required: true, sensitive: false },
        { name: 'authType', type: 'select', label: 'Authentication', description: 'Auth type', required: true, options: ['none', 'bearer', 'basic', 'api-key'], sensitive: false },
      ],
    },
    secretRequirements: [
      { name: 'token', description: 'API token or credentials' },
    ],
    supportedOperations: ['READ'],
    readOnlySupport: true,
    limitations: ['No implementation', 'Rate limiting not implemented'],
    documentation: {
      status: 'Model only, no implementation',
      capabilities: ['API metadata', 'Resource discovery'],
      requirements: ['HTTP client'],
      limitations: ['No implementation'],
      secretRequirements: ['API token'],
      readOnlyBehavior: 'Read-only by design',
      verificationStatus: 'MODEL_ONLY',
    },
  };

  async testConnection(): Promise<ConnectionTestResult> {
    return {
      success: false,
      message: '[REST API] Not implemented.',
    };
  }

  async discover(): Promise<DiscoveryResult> {
    throw new Error('REST API discovery not implemented.');
  }

  async extractMetadata(_qualifiedName: string): Promise<Record<string, unknown>> {
    throw new Error('REST API metadata extraction not implemented.');
  }
}

// ---- Data Warehouse Connectors (Snowflake, BigQuery, Redshift) ----

export class SnowflakeConnector implements DataSourceConnector {
  static readonly definition: ConnectorDefinition = {
    id: 'snowflake',
    name: 'Snowflake',
    category: 'DATA_WAREHOUSE',
    version: '1.0.0',
    implementationLevel: 'MODEL_ONLY',
    capabilities: ['TEST_CONNECTION'],
    configurationSchema: { fields: [] },
    secretRequirements: [],
    supportedOperations: ['READ'],
    readOnlySupport: true,
    limitations: ['No implementation'],
    documentation: {
      status: 'Model only',
      capabilities: [],
      requirements: ['Snowflake driver'],
      limitations: ['Not implemented'],
      secretRequirements: [],
      readOnlyBehavior: 'Read-only',
      verificationStatus: 'MODEL_ONLY',
    },
  };

  async testConnection(): Promise<ConnectionTestResult> {
    return { success: false, message: '[Snowflake] Not implemented.' };
  }
  async discover(): Promise<DiscoveryResult> {
    throw new Error('Not implemented');
  }
  async extractMetadata(_q: string): Promise<Record<string, unknown>> {
    throw new Error('Not implemented');
  }
}

export class BigQueryConnector implements DataSourceConnector {
  static readonly definition: ConnectorDefinition = {
    id: 'bigquery',
    name: 'BigQuery',
    category: 'DATA_WAREHOUSE',
    version: '1.0.0',
    implementationLevel: 'MODEL_ONLY',
    capabilities: ['TEST_CONNECTION'],
    configurationSchema: { fields: [] },
    secretRequirements: [],
    supportedOperations: ['READ'],
    readOnlySupport: true,
    limitations: ['No implementation'],
    documentation: {
      status: 'Model only',
      capabilities: [],
      requirements: ['BigQuery client'],
      limitations: ['Not implemented'],
      secretRequirements: [],
      readOnlyBehavior: 'Read-only',
      verificationStatus: 'MODEL_ONLY',
    },
  };

  async testConnection(): Promise<ConnectionTestResult> {
    return { success: false, message: '[BigQuery] Not implemented.' };
  }
  async discover(): Promise<DiscoveryResult> {
    throw new Error('Not implemented');
  }
  async extractMetadata(_q: string): Promise<Record<string, unknown>> {
    throw new Error('Not implemented');
  }
}

export class RedshiftConnector implements DataSourceConnector {
  static readonly definition: ConnectorDefinition = {
    id: 'redshift',
    name: 'Redshift',
    category: 'DATA_WAREHOUSE',
    version: '1.0.0',
    implementationLevel: 'MODEL_ONLY',
    capabilities: ['TEST_CONNECTION'],
    configurationSchema: { fields: [] },
    secretRequirements: [],
    supportedOperations: ['READ'],
    readOnlySupport: true,
    limitations: ['No implementation'],
    documentation: {
      status: 'Model only',
      capabilities: [],
      requirements: ['Redshift driver'],
      limitations: ['Not implemented'],
      secretRequirements: [],
      readOnlyBehavior: 'Read-only',
      verificationStatus: 'MODEL_ONLY',
    },
  };

  async testConnection(): Promise<ConnectionTestResult> {
    return { success: false, message: '[Redshift] Not implemented.' };
  }
  async discover(): Promise<DiscoveryResult> {
    throw new Error('Not implemented');
  }
  async extractMetadata(_q: string): Promise<Record<string, unknown>> {
    throw new Error('Not implemented');
  }
}

// ---- Connector Definitions Export ----

export const ALL_CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  MySQLConnector.definition,
  SqlServerConnector.definition,
  OracleConnector.definition,
  FileConnector.definition,
  ObjectStorageConnector.definition,
  RestApiConnector.definition,
  SnowflakeConnector.definition,
  BigQueryConnector.definition,
  RedshiftConnector.definition,
];
