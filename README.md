# AI Data Catalog Baseline Audit

AI Data Catalog & Governance baseline implemented as a Vite + React + TypeScript application.

## Current Status

### Implemented Capabilities

- **Core catalog** — Asset entity model with versioning, relationships, and metadata
- **In-memory repository** — Client-side persistence (ephemeral, demo only)
- **Demo connector** — Simulated data source with explicit DEMO labeling
- **Asset discovery** — Pipeline from source → scan → discovery → asset creation
- **Metadata catalog** — Technical metadata per asset type (database, schema, table, column, dataset)
- **Deterministic classification** — Rule-based PII/sensitivity detection with confidence scoring
- **Data quality checks** — NULL_RATIO, UNIQUENESS, ROW_COUNT with PASS/WARN/FAIL/NOT_EVALUATED
- **Trust scoring** — Weighted formula (quality, classification, metadata, lineage, review)
- **Lineage** — Asset relationship graph with upstream/downstream traversal
- **Impact analysis** — Transitive dependency analysis with cycle protection
- **Evidence** — Proof records for scan, classification, quality, and review operations
- **Audit trail** — Append-only activity log with actor/action/resource tracking
- **Local/demo policy engine** — PII review, quality threshold, lineage completeness rules
- **Keyword/structured catalog search** — Text search with type/sensitivity/classification/review filters

### Architecture

```
src/
  types/              → Domain type definitions
  domain/             → Repository & connector contracts
  services/           → Application services (engines)
  infrastructure/     → Repository & connector implementations
  app/                → Composition root (CatalogContext)
  components/         → Shared UI components
  pages/              → Route pages (8 routes)
  lib/                → Utility functions
```

### Routes

- `/dashboard` — Real-time metrics from repositories
- `/catalog` — Searchable, filterable asset table
- `/catalog/:id` — 8-tab asset detail view
- `/sources` — Source management + scan execution
- `/lineage` — Relationship tree + table
- `/quality` — Quality results with pass rate
- `/evidence` — Chronological evidence records
- `/audit` — Activity trail with filters

## Current Limitations

- **Demo/in-memory persistence only** — Data lost on page reload
- **No production database** — InMemoryRepository is provisional
- **No authentication** — Actor identified as `demo-reviewer`
- **No production backend** — Client-side SPA only
- **No external AI/LLM** — Classification is rule-based only
- **No semantic/vector search** — Keyword search only
- **No verified cloud runtime yet** — Build passes, runtime not verified
- **Tests may remain NOT_EXECUTED** if the current environment cannot run them

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

## Getting Started

```bash
npm install
npm run dev      # Development server
npm run build    # Production build
npm run typecheck # TypeScript check
npm test         # Run tests (vitest)
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System architecture and domain model
- [Persistence Boundary](docs/PERSISTENCE-BOUNDARY.md) — Future database design
- [API Boundary](docs/API-BOUNDARY.md) — Future API contracts
- [Job Boundary](docs/JOB-BOUNDARY.md) — Future async job design
- [Security Boundary](docs/SECURITY-BOUNDARY.md) — Future security design

## Deployment

Configured for Vercel SPA deployment:
- Build: `npm run build`
- Output: `dist/`
- SPA routing: `vercel.json` rewrites

## License

This is a baseline audit project.
