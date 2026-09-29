# Persistence Boundary

## Current State

**Repository Pattern**: Implemented via contracts in `src/domain/contracts.ts`  
**Current Implementation**: `InMemoryRepository` (client-side, ephemeral)  
**Production Persistence**: NOT IMPLEMENTED

## Entities Requiring Persistence

### Core Entities

| Entity | Append-Only | Versioned | Sensitive | Notes |
|--------|-------------|-----------|-----------|-------|
| Asset | No | Yes | No | Central entity, updated on scan |
| AssetVersion | Yes | N/A | No | Historical snapshots |
| AssetRelationship | No | No | No | Graph edges |
| DataSource | No | No | Partial | Config refs only, not secrets |
| ScanRun | Yes | No | No | Execution history |
| Classification | No | No | Yes | PII detection results |
| QualityResult | Yes | No | No | Quality measurements |
| TrustScore | No | No | No | Calculated scores |
| EvidenceRecord | Yes | No | Partial | Proof records |
| AuditEvent | Yes | No | Yes | Activity log |
| Policy | No | Yes | No | Governance rules |
| PolicyEvaluation | Yes | No | No | Rule evaluation results |

## Repository Contracts

All repositories implement the interface pattern:

```typescript
interface AssetRepository {
  getAll(): Asset[]
  getById(id: string): Asset | undefined
  getBySourceId(sourceId: string): Asset[]
  save(asset: Asset): void
  saveMany(assets: Asset[]): void
  update(id: string, updates: Partial<Asset>): Asset | undefined
  delete(id: string): boolean
  search(query: SearchQuery): SearchResult
}
```

Similar contracts exist for all entities (see `src/domain/contracts.ts`).

## Relationships

```
DataSource 1──* ScanRun
DataSource 1──* Asset
Asset 1──* AssetVersion
Asset *──* AssetRelationship
Asset 1──* Classification
Asset 1──* QualityResult
Asset 1──1 TrustScore
Asset 1──* EvidenceRecord
Asset 1──* AuditEvent
```

## Transactions Required

### Critical Transactions

1. **Scan Execution**
   - Create ScanRun (status: RUNNING)
   - Discover assets
   - Create/update Assets
   - Create relationships
   - Run classification
   - Run quality checks
   - Calculate trust scores
   - Generate evidence
   - Generate audit events
   - Update ScanRun (status: SUCCESS/FAILED)
   - **Must be atomic or compensatable**

2. **Classification Review**
   - Update Classification status
   - Generate EvidenceRecord
   - Generate AuditEvent
   - **Should be atomic**

3. **Policy Evaluation**
   - Evaluate rules against assets
   - Create PolicyEvaluation records
   - Generate evidence
   - **Should be atomic**

## Indexing Strategy (Future)

### High-Priority Indices

```sql
-- Asset lookups
CREATE INDEX idx_asset_source_id ON asset(source_id);
CREATE INDEX idx_asset_type ON asset(type);
CREATE INDEX idx_asset_qualified_name ON asset(qualified_name);
CREATE INDEX idx_asset_status ON asset(status);

-- Relationship traversal
CREATE INDEX idx_relationship_source ON asset_relationship(source_asset_id);
CREATE INDEX idx_relationship_target ON asset_relationship(target_asset_id);
CREATE INDEX idx_relationship_type ON asset_relationship(type);

-- Classification queries
CREATE INDEX idx_classification_asset ON classification(asset_id);
CREATE INDEX idx_classification_type ON classification(classification_type);
CREATE INDEX idx_classification_status ON classification(review_status);

-- Quality queries
CREATE INDEX idx_quality_asset ON quality_result(asset_id);
CREATE INDEX idx_quality_status ON quality_result(status);

-- Evidence/Audit (append-only, time-series)
CREATE INDEX idx_evidence_subject ON evidence_record(subject_id);
CREATE INDEX idx_evidence_timestamp ON evidence_record(timestamp DESC);
CREATE INDEX idx_audit_resource ON audit_event(resource_id);
CREATE INDEX idx_audit_timestamp ON audit_event(timestamp DESC);
```

## Sensitive Data Handling

### Classification Results
- Store PII detection results
- Must be access-controlled
- Audit all access

### Audit Events
- Contains actor information
- Must be tamper-evident
- Append-only

### DataSource Configuration
- Store credential REFERENCES only
- Never store actual credentials
- Use secret management service

## Append-Only Tables

These tables must never be updated, only inserted:

- `asset_version` — historical snapshots
- `scan_run` — execution history
- `quality_result` — measurement history
- `evidence_record` — proof records
- `audit_event` — activity log
- `policy_evaluation` — evaluation history

## Versioning Requirements

### Asset Versioning
- Every significant change creates a new version
- Version contains full snapshot
- Version includes: changedAt, changedBy, reason
- Allows reconstruction of historical state

### Policy Versioning
- Policies are versioned
- Evaluations reference specific policy version
- Allows re-evaluation with historical rules

## Database Options (Conceptual Comparison)

### Managed PostgreSQL
**Pros:**
- Full SQL support
- Mature ecosystem
- Strong consistency
- Complex queries (lineage traversal)

**Cons:**
- Requires instance management
- Scaling complexity
- Cost at scale

### Serverless PostgreSQL
**Pros:**
- Auto-scaling
- Pay-per-use
- No instance management
- Good for variable workloads

**Cons:**
- Cold start latency
- Connection pooling complexity
- Limited extensions

## Current Implementation Notes

The current `InMemoryRepository` implementation:
- Stores data in JavaScript Maps/Arrays
- Lost on page reload
- Lost on deployment
- Suitable for demo/testing only
- Must be replaced for production

## Migration Path

1. Implement repository contracts for target database
2. Migrate data from InMemory to persistent storage
3. Update CatalogContext to use persistent repositories
4. Verify all operations work correctly
5. Monitor performance
6. Optimize queries

## No Provider Selected

This document intentionally does not select a specific database provider. The repository pattern allows implementation with any SQL database that supports the required operations.
