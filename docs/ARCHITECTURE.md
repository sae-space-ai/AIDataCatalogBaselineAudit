# Architecture

## Overview

AI Data Catalog & Governance OS — a platform for discovering, classifying, and governing data assets across an organization's data infrastructure.

**Current State**: Client-side SPA with in-memory persistence  
**Framework**: React 18 + TypeScript + Vite + Tailwind CSS v4  
**Deployment Target**: Vercel (SPA)  
**Persistence**: InMemoryRepository (ephemeral, demo only)

## Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (React)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Dashboard │ │ Catalog  │ │ Sources  │ │ Lineage  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Quality  │ │ Evidence │ │  Audit   │ │  Detail  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Application Layer (Context)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │         CatalogContext (Service Container)        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │  Scan   │ │Classify │ │ Quality │           │   │
│  │  │ Engine  │ │ Engine  │ │ Engine  │           │   │
│  │  └─────────┘ └─────────┘ └─────────┘           │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │  Trust  │ │ Search  │ │ Impact  │           │   │
│  │  │ Service │ │ Service │ │Analysis │           │   │
│  │  └─────────┘ └─────────┘ └─────────┘           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Domain Layer (Contracts)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Repository Contracts + Connector Contract         │   │
│  │ Asset | Source | Scan | Classification | ...      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Infrastructure Layer                        │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ InMemoryRepo     │  │  DemoConnector   │            │
│  │ (all repos)      │  │  (DEMO data)     │            │
│  └──────────────────┘  └──────────────────┘            │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ PostgresRepo     │  │ PostgresConnector│            │
│  │ (NOT IMPLEMENTED)│  │ (ADAPTER_READY)  │            │
│  └──────────────────┘  └──────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

## Domain Model

### Core Entity: Asset

```typescript
Asset {
  id: string (UUID)
  sourceId: string
  type: DATABASE | SCHEMA | TABLE | COLUMN | DATASET
  name: string
  qualifiedName: string (unique path)
  description?: string
  status: ACTIVE | INACTIVE | DEPRECATED | DISCOVERED
  sensitivity: PUBLIC | INTERNAL | CONFIDENTIAL | RESTRICTED | UNKNOWN
  certificationStatus: UNCERTIFIED | CERTIFIED | PENDING_REVIEW | EXPIRED
  metadata: AssetMetadata (discriminated union)
  createdAt: string (ISO)
  updatedAt: string (ISO)
}
```

### Supporting Entities

- **AssetVersion** — Historical snapshots of assets
- **AssetRelationship** — Graph edges (CONTAINS, DERIVED_FROM, DEPENDS_ON)
- **DataSource** — Connection configurations
- **ScanRun** — Execution history
- **Classification** — PII/sensitivity detection results
- **QualityResult** — Quality measurements
- **TrustScore** — Calculated trust metrics
- **EvidenceRecord** — Proof of operations
- **AuditEvent** — Activity log

### Entity Relationships

```
DataSource ──1:N──→ ScanRun
DataSource ──1:N──→ Asset
Asset ──1:N──→ AssetVersion
Asset ──M:N──→ Asset (via AssetRelationship)
Asset ──1:N──→ Classification
Asset ──1:N──→ QualityResult
Asset ──1:1──→ TrustScore
Asset ──1:N──→ EvidenceRecord
Asset ──1:N──→ AuditEvent
```

## Application Services

### ScanEngine
Orchestrates the full discovery pipeline:
1. Create ScanRun
2. Test connection
3. Discover assets via connector
4. Create/update assets
5. Create relationships
6. Run classification
7. Run quality checks
8. Calculate trust scores
9. Generate evidence + audit
10. Complete ScanRun

### ClassificationEngine
Deterministic rules-based classification:
- Pattern matching on column names
- Confidence scoring
- Review workflow (PENDING → CONFIRMED/REJECTED)
- Generates evidence on each classification

### QualityEngine
Data quality measurement:
- NULL_RATIO checks
- UNIQUENESS checks
- ROW_COUNT checks
- PASS/WARN/FAIL status
- Generates evidence on each check

### TrustScoreService
Weighted trust calculation:
- Metadata Completeness (25%)
- Quality Score (35%)
- Classification Confidence (25%)
- Ownership & Governance (15%)
- Configurable weights
- Explains score components

### SearchService
Keyword-based search:
- Text search on name/qualifiedName/description
- Structured filters (type, source, sensitivity)
- Mode: KEYWORD_STRUCTURED (no semantic search)

### ImpactAnalyzer
Dependency analysis:
- Upstream traversal
- Downstream traversal
- Potentially affected assets
- Based on AssetRelationship graph

## Repository Boundary

All data access goes through repository contracts:

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

Similar contracts for all entities. UI and services depend only on contracts, not implementations.

### Current Implementation: InMemoryRepository
- Client-side JavaScript Maps/Arrays
- Ephemeral (lost on reload)
- Suitable for demo/testing
- Will be replaced by persistent implementation

### Future Implementation: PostgresRepository (planned)
- Server-side persistence
- Durable across reloads
- Multi-user support
- Requires API layer

## Connector Boundary

```typescript
interface DataSourceConnector {
  testConnection(): Promise<ConnectionTestResult>
  discover(): Promise<DiscoveryResult>
  extractMetadata(qualifiedName: string): Promise<Record<string, unknown>>
}
```

### Current Implementation: DemoConnector
- In-memory demo data
- Explicitly labeled as DEMO
- Returns 1 database → 1 schema → 1 table → 6 columns
- All data marked with [DEMO] prefix

### Future Implementations (planned)
- PostgresConnector (ADAPTER_READY)
- MySQLConnector
- CSVConnector
- S3Connector
- RESTAPIConnector

## Evidence vs Audit

### EvidenceRecord
- **Purpose**: Proof of a relevant state or process outcome
- **Nature**: Supports governance decisions
- **Examples**: Scan completed, classification created, quality check passed
- **Fields**: type, subjectType, subjectId, actor, source, metadata

### AuditEvent
- **Purpose**: Record of an activity that occurred
- **Nature**: Chronological activity log
- **Examples**: User created source, system ran scan, reviewer confirmed classification
- **Fields**: action, resourceType, resourceId, actor, details

**Key Difference**: Evidence answers "what proof exists?", Audit answers "what happened?"

## Demo Mode

The application operates in DEMO mode:
- All data comes from DemoConnector
- InMemoryRepository stores everything client-side
- State lost on page reload
- No real database connections
- No real user authentication
- Actor identified as "demo-reviewer" or "user"

**Visual Indicators**:
- Purple "DEMO" badge in topbar
- DemoBanner on every page
- [DEMO] prefix in asset descriptions
- Source type shows "DEMO" badge

## Current Limitations

1. **No Persistence**: Data lost on reload
2. **No Authentication**: No user identity
3. **No Authorization**: No access control
4. **No Real Connectors**: Only demo data
5. **No Backend**: Client-side only
6. **No Jobs**: Synchronous execution
7. **No AI**: Rule-based classification only
8. **No Monitoring**: No observability

## Cloud Boundaries

### Persistence Boundary
See `docs/PERSISTENCE-BOUNDARY.md`

### API Boundary
See `docs/API-BOUNDARY.md`

### Job Boundary
See `docs/JOB-BOUNDARY.md`

### Security Boundary
See `docs/SECURITY-BOUNDARY.md`

## Future Integration Points

1. **Database**: Replace InMemoryRepository with PostgresRepository
2. **API**: Add REST API layer for server-side operations
3. **Authentication**: Add user authentication (email/password, OAuth)
4. **Authorization**: Add RBAC (admin, steward, analyst, viewer)
5. **Jobs**: Add async job processing for scans
6. **AI**: Add LLM-based classification
7. **Search**: Add semantic search with embeddings
8. **Monitoring**: Add observability (logs, metrics, traces)
9. **Connectors**: Add real database connectors
10. **Notifications**: Add alerts for policy violations

## File Structure

```
src/
  types/              → Domain type definitions
  domain/             → Repository & connector contracts
  services/           → Application services (engines)
  infrastructure/     → Repository & connector implementations
  app/                → Composition root (CatalogContext)
  components/         → Shared UI components
  pages/              → Route pages
  lib/                → Utility functions

docs/
  ARCHITECTURE.md     → This file
  PERSISTENCE-BOUNDARY.md
  API-BOUNDARY.md
  JOB-BOUNDARY.md
  SECURITY-BOUNDARY.md

tests/
  catalog.test.ts     → Test suite
```

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | ^18.2.0 |
| Build | Vite | ^6.3.5 |
| Language | TypeScript | ^5.7.0 |
| CSS | Tailwind CSS | ^4.1.7 |
| Router | react-router-dom | ^6.8.0 |
| Icons | lucide-react | ^0.294.0 |
| Testing | vitest | ^5.0.2 |
| Package Manager | npm | (lockfile v3) |

## Deployment

- **Target**: Vercel (SPA)
- **Build**: `npm run build` → `dist/`
- **Routing**: Client-side with vercel.json rewrites
- **Environment**: No environment variables required for VS01
