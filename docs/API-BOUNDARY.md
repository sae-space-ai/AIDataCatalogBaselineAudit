# API Boundary

## Current State

**API Layer**: NOT IMPLEMENTED  
**Current Mode**: Client-side only (InMemoryRepository)  
**Future**: REST API via cloud provider

## Planned API Endpoints

### Assets

```
GET    /api/assets              — List assets with search/filter
GET    /api/assets/:id          — Get asset detail
GET    /api/assets/:id/versions — Get version history
GET    /api/assets/:id/lineage  — Get upstream/downstream
```

### Sources

```
GET    /api/sources             — List data sources
POST   /api/sources             — Create data source
GET    /api/sources/:id         — Get source detail
PATCH  /api/sources/:id         — Update source
DELETE /api/sources/:id         — Delete source
POST   /api/sources/:id/test    — Test connection
POST   /api/sources/:id/scan    — Execute scan
GET    /api/sources/:id/scans   — Get scan history
```

### Classification

```
GET    /api/classifications              — List all classifications
GET    /api/classifications/:id          — Get classification detail
PATCH  /api/classifications/:id/review   — Review classification
```

### Quality

```
GET    /api/quality              — List quality results
GET    /api/quality/:assetId     — Get quality for asset
```

### Lineage

```
GET    /api/lineage/:assetId     — Get lineage graph for asset
GET    /api/lineage/:assetId/upstream   — Get upstream dependencies
GET    /api/lineage/:assetId/downstream — Get downstream dependencies
```

### Evidence

```
GET    /api/evidence             — List evidence records
GET    /api/evidence/:id         — Get evidence detail
GET    /api/evidence/subject/:subjectId — Get evidence for subject
```

### Audit

```
GET    /api/audit                — List audit events
GET    /api/audit/:id            — Get audit event detail
```

### Search

```
GET    /api/search               — Search assets
Query params: q, type, source, sensitivity, quality, page, pageSize
```

### Trust

```
GET    /api/trust/:assetId       — Get trust score for asset
GET    /api/trust                — Get all trust scores
```

### Policies

```
GET    /api/policies             — List policies
POST   /api/policies             — Create policy
GET    /api/policies/:id         — Get policy detail
PATCH  /api/policies/:id         — Update policy
POST   /api/policies/:id/evaluate — Evaluate policy against assets
```

## Request/Response Contracts

### Asset Response

```typescript
{
  id: string;
  type: AssetType;
  name: string;
  qualifiedName: string;
  description?: string;
  sourceId: string;
  status: AssetStatus;
  sensitivity: SensitivityLevel;
  certificationStatus: CertificationStatus;
  metadata: AssetMetadata;
  createdAt: string;
  updatedAt: string;
  trustScore?: number;
  classificationSummary?: {
    type: ClassificationType;
    confidence: number;
    status: ReviewStatus;
  };
  qualitySummary?: {
    passRate: number;
    issues: number;
  };
}
```

### Search Response

```typescript
{
  assets: Asset[];
  total: number;
  page: number;
  pageSize: number;
  filters: {
    type?: AssetType;
    sourceId?: string;
    sensitivity?: SensitivityLevel;
    qualityStatus?: QualityStatus;
  };
}
```

### Scan Response

```typescript
{
  scanRun: ScanRun;
  assetsCreated: number;
  assetsUpdated: number;
  relationshipsCreated: number;
  classificationsCreated: number;
  qualityChecksCreated: number;
  errors: string[];
}
```

## Authentication (Future)

All endpoints will require authentication:
- Bearer token (JWT)
- API key for service accounts
- Role-based access control

## Rate Limiting (Future)

- Scan operations: limited to prevent overload
- Search: throttled for performance
- Write operations: rate limited per user

## Error Responses

```typescript
{
  error: {
    code: string;
    message: string;
    details?: unknown;
  }
}
```

Standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error

## Current Implementation Notes

The current application operates entirely client-side:
- No API calls
- Direct repository access via CatalogContext
- InMemoryRepository for all operations
- State lost on reload

## Migration Path

1. Implement API layer (serverless functions or backend service)
2. Create API repository implementations
3. Update CatalogContext to use API repositories
4. Add authentication middleware
5. Add rate limiting
6. Monitor performance and errors

## No Provider Selected

This document intentionally does not select a specific API framework or hosting provider. The repository pattern allows the API layer to be implemented with any technology that supports the defined contracts.
