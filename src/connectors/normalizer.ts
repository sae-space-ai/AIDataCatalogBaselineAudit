// ============================================================
// CONNECTORS — Metadata Normalizer
// ============================================================

import type { DiscoveredAsset, AssetMetadata } from '../types';
import type { DiscoveredObject, AssetDiscoveryType } from './types';

/**
 * MetadataNormalizer converts technology-specific metadata
 * to the canonical Asset model.
 * 
 * This ensures that PostgreSQL, MySQL, SQL Server, etc.
 * all end up represented using the same Asset structure,
 * with provider-specific differences preserved in MetadataEntry.
 */
export class MetadataNormalizer {
  /**
   * Normalize a discovered object to a canonical DiscoveredAsset.
   */
  normalize(obj: DiscoveredObject, sourceId: string): DiscoveredAsset {
    const metadata = this.mapMetadata(obj.type, obj.metadata);

    return {
      type: this.mapAssetType(obj.type),
      name: obj.name,
      qualifiedName: obj.qualifiedName,
      description: obj.description,
      metadata,
      parentQualifiedName: obj.parentQualifiedName,
    };
  }

  /**
   * Map discovery type to canonical AssetType.
   */
  private mapAssetType(type: AssetDiscoveryType): DiscoveredAsset['type'] {
    const mapping: Record<AssetDiscoveryType, DiscoveredAsset['type']> = {
      'DATABASE': 'DATABASE',
      'SCHEMA': 'SCHEMA',
      'TABLE': 'TABLE',
      'VIEW': 'TABLE', // Views are treated as TABLE for now
      'COLUMN': 'COLUMN',
      'FILE': 'DATASET',
      'DATASET': 'DATASET',
      'REPORT': 'DATASET',
      'STREAM': 'DATASET',
      'API_RESOURCE': 'DATASET',
    };
    return mapping[type] || 'DATASET';
  }

  /**
   * Map provider-specific metadata to canonical AssetMetadata.
   */
  private mapMetadata(type: AssetDiscoveryType, metadata: Record<string, unknown>): AssetMetadata {
    switch (type) {
      case 'DATABASE':
        return {
          kind: 'DATABASE',
          engine: metadata.engine as string | undefined,
          version: metadata.version as string | undefined,
          host: metadata.host as string | undefined,
          port: metadata.port as number | undefined,
        };

      case 'SCHEMA':
        return {
          kind: 'SCHEMA',
          databaseName: metadata.databaseName as string,
          tableCount: metadata.tableCount as number | undefined,
        };

      case 'TABLE':
      case 'VIEW':
        return {
          kind: 'TABLE',
          schemaName: metadata.schemaName as string,
          databaseName: metadata.databaseName as string,
          rowCount: metadata.rowCount as number | undefined,
          columnCount: metadata.columnCount as number | undefined,
        };

      case 'COLUMN':
        return {
          kind: 'COLUMN',
          tableName: metadata.tableName as string,
          schemaName: metadata.schemaName as string,
          databaseName: metadata.databaseName as string,
          dataType: metadata.dataType as string,
          nullable: metadata.nullable as boolean,
          ordinalPosition: metadata.ordinalPosition as number,
          defaultValue: metadata.defaultValue as string | undefined,
        };

      case 'FILE':
      case 'DATASET':
      case 'REPORT':
      case 'STREAM':
      case 'API_RESOURCE':
        return {
          kind: 'DATASET',
          format: metadata.format as string | undefined,
          recordCount: metadata.recordCount as number | undefined,
          sizeBytes: metadata.sizeBytes as number | undefined,
        };

      default:
        return {
          kind: 'DATASET',
        };
    }
  }

  /**
   * Extract additional metadata that doesn't fit the canonical model.
   * This preserves provider-specific information.
   */
  extractExtendedMetadata(obj: DiscoveredObject): Record<string, unknown> {
    const extended: Record<string, unknown> = {};

    // Copy all metadata that isn't part of the canonical model
    for (const [key, value] of Object.entries(obj.metadata)) {
      if (!this.isCanonicalField(key, obj.type)) {
        extended[key] = value;
      }
    }

    // Add statistics if present
    if (obj.statistics) {
      extended['statistics'] = obj.statistics;
    }

    return extended;
  }

  /**
   * Check if a metadata field is part of the canonical model.
   */
  private isCanonicalField(field: string, type: AssetDiscoveryType): boolean {
    const canonicalFields: Record<AssetDiscoveryType, string[]> = {
      'DATABASE': ['engine', 'version', 'host', 'port'],
      'SCHEMA': ['databaseName', 'tableCount'],
      'TABLE': ['schemaName', 'databaseName', 'rowCount', 'columnCount'],
      'VIEW': ['schemaName', 'databaseName', 'rowCount', 'columnCount'],
      'COLUMN': ['tableName', 'schemaName', 'databaseName', 'dataType', 'nullable', 'ordinalPosition', 'defaultValue'],
      'FILE': ['format', 'recordCount', 'sizeBytes'],
      'DATASET': ['format', 'recordCount', 'sizeBytes'],
      'REPORT': ['format', 'recordCount', 'sizeBytes'],
      'STREAM': ['format', 'recordCount', 'sizeBytes'],
      'API_RESOURCE': ['format', 'recordCount', 'sizeBytes'],
    };

    return canonicalFields[type]?.includes(field) || false;
  }
}
