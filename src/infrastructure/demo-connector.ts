// ============================================================
// INFRASTRUCTURE — Demo Connector
// EXPLICITLY LABELED AS DEMO DATA
// ============================================================

import type {
  ConnectionTestResult,
  DataSourceConnector,
} from '../domain/contracts';
import type {
  AssetMetadata,
  ColumnMetadata,
  DatabaseMetadata,
  DiscoveredAsset,
  RelationshipType,
  SchemaMetadata,
  TableMetadata,
} from '../types';

/**
 * DemoConnector — Provides a deterministic, in-memory dataset
 * for testing the full pipeline without external dependencies.
 * 
 * ALL DATA PRODUCED BY THIS CONNECTOR IS DEMO DATA.
 * It does NOT connect to any real database.
 */

const DEMO_DATABASE = 'demo_catalog_db';
const DEMO_SCHEMA = 'public';
const DEMO_TABLE = 'customers';

interface DemoColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  ordinalPosition: number;
  rowCount: number;
  nullCount: number;
  uniqueCount: number;
}

const DEMO_COLUMNS: DemoColumn[] = [
  {
    name: 'customer_id',
    dataType: 'integer',
    nullable: false,
    ordinalPosition: 1,
    rowCount: 1000,
    nullCount: 0,
    uniqueCount: 1000,
  },
  {
    name: 'email',
    dataType: 'varchar(255)',
    nullable: false,
    ordinalPosition: 2,
    rowCount: 1000,
    nullCount: 0,
    uniqueCount: 998,
  },
  {
    name: 'full_name',
    dataType: 'varchar(200)',
    nullable: true,
    ordinalPosition: 3,
    rowCount: 1000,
    nullCount: 12,
    uniqueCount: 985,
  },
  {
    name: 'phone',
    dataType: 'varchar(20)',
    nullable: true,
    ordinalPosition: 4,
    rowCount: 1000,
    nullCount: 45,
    uniqueCount: 950,
  },
  {
    name: 'region',
    dataType: 'varchar(50)',
    nullable: true,
    ordinalPosition: 5,
    rowCount: 1000,
    nullCount: 5,
    uniqueCount: 12,
  },
  {
    name: 'created_at',
    dataType: 'timestamp',
    nullable: false,
    ordinalPosition: 6,
    rowCount: 1000,
    nullCount: 0,
    uniqueCount: 1000,
  },
];

export class DemoConnector implements DataSourceConnector {
  private readonly datasetName: string;

  constructor(datasetName: string = 'demo_customers') {
    this.datasetName = datasetName;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    // Simulate a small latency
    await this.delay(150);
    return {
      success: true,
      message: `[DEMO] Connection to "${this.datasetName}" successful. This is a simulated connection.`,
      latencyMs: 150,
    };
  }

  async discover(): Promise<{
    assets: DiscoveredAsset[];
    relationships: Array<{
      sourceQualifiedName: string;
      targetQualifiedName: string;
      type: RelationshipType;
    }>;
  }> {
    await this.delay(300);

    const dbQualifiedName = DEMO_DATABASE;
    const schemaQualifiedName = `${DEMO_DATABASE}.${DEMO_SCHEMA}`;
    const tableQualifiedName = `${DEMO_DATABASE}.${DEMO_SCHEMA}.${DEMO_TABLE}`;

    const assets: DiscoveredAsset[] = [];

    // Database
    const dbMeta: DatabaseMetadata = {
      kind: 'DATABASE',
      engine: 'DEMO',
      version: '1.0.0-demo',
      host: 'localhost',
      port: 5432,
    };
    assets.push({
      type: 'DATABASE',
      name: DEMO_DATABASE,
      qualifiedName: dbQualifiedName,
      description: `[DEMO] Simulated database for testing the catalog pipeline.`,
      metadata: dbMeta,
    });

    // Schema
    const schemaMeta: SchemaMetadata = {
      kind: 'SCHEMA',
      databaseName: DEMO_DATABASE,
      tableCount: 1,
    };
    assets.push({
      type: 'SCHEMA',
      name: DEMO_SCHEMA,
      qualifiedName: schemaQualifiedName,
      description: `[DEMO] Simulated schema.`,
      metadata: schemaMeta,
      parentQualifiedName: dbQualifiedName,
    });

    // Table
    const tableMeta: TableMetadata = {
      kind: 'TABLE',
      schemaName: DEMO_SCHEMA,
      databaseName: DEMO_DATABASE,
      rowCount: 1000,
      columnCount: DEMO_COLUMNS.length,
    };
    assets.push({
      type: 'TABLE',
      name: DEMO_TABLE,
      qualifiedName: tableQualifiedName,
      description: `[DEMO] Simulated customers table with ${DEMO_COLUMNS.length} columns and 1000 rows.`,
      metadata: tableMeta,
      parentQualifiedName: schemaQualifiedName,
    });

    // Columns
    for (const col of DEMO_COLUMNS) {
      const colQualifiedName = `${tableQualifiedName}.${col.name}`;
      const colMeta: ColumnMetadata = {
        kind: 'COLUMN',
        tableName: DEMO_TABLE,
        schemaName: DEMO_SCHEMA,
        databaseName: DEMO_DATABASE,
        dataType: col.dataType,
        nullable: col.nullable,
        ordinalPosition: col.ordinalPosition,
      };
      assets.push({
        type: 'COLUMN',
        name: col.name,
        qualifiedName: colQualifiedName,
        description: `[DEMO] Column "${col.name}" (${col.dataType}).`,
        metadata: colMeta,
        parentQualifiedName: tableQualifiedName,
      });
    }

    // Relationships
    const relationships: Array<{
      sourceQualifiedName: string;
      targetQualifiedName: string;
      type: RelationshipType;
    }> = [];

    // DATABASE CONTAINS SCHEMA
    relationships.push({
      sourceQualifiedName: dbQualifiedName,
      targetQualifiedName: schemaQualifiedName,
      type: 'CONTAINS',
    });

    // SCHEMA CONTAINS TABLE
    relationships.push({
      sourceQualifiedName: schemaQualifiedName,
      targetQualifiedName: tableQualifiedName,
      type: 'CONTAINS',
    });

    // TABLE CONTAINS each COLUMN
    for (const col of DEMO_COLUMNS) {
      const colQualifiedName = `${tableQualifiedName}.${col.name}`;
      relationships.push({
        sourceQualifiedName: tableQualifiedName,
        targetQualifiedName: colQualifiedName,
        type: 'CONTAINS',
      });
    }

    return { assets, relationships };
  }

  async extractMetadata(qualifiedName: string): Promise<Record<string, unknown>> {
    await this.delay(50);

    // Return statistics for columns
    const col = DEMO_COLUMNS.find(c => qualifiedName.endsWith(`.${c.name}`));
    if (col) {
      return {
        rowCount: col.rowCount,
        nullCount: col.nullCount,
        uniqueCount: col.uniqueCount,
        nullRatio: col.rowCount > 0 ? col.nullCount / col.rowCount : 0,
        uniquenessRatio: col.rowCount > 0 ? col.uniqueCount / col.rowCount : 0,
        isDemo: true,
      };
    }

    return { isDemo: true };
  }

  /**
   * Expose demo column stats for quality engine
   */
  getColumnStats(qualifiedName: string): DemoColumn | undefined {
    return DEMO_COLUMNS.find(c => qualifiedName.endsWith(`.${c.name}`));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
