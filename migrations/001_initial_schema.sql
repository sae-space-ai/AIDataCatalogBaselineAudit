-- ============================================================
-- CATALOG DATABASE SCHEMA — Migration 001
-- ============================================================
--
-- This migration defines the schema for the AI Data Catalog database.
-- It is NOT executed automatically — it must be applied manually
-- to a PostgreSQL instance when REAL mode is activated.
--
-- IMPORTANT: This is the CATALOG DATABASE, which stores:
-- - Assets discovered from data sources
-- - Classifications, quality results, trust scores
-- - Evidence records and audit events
-- - Scan runs and relationships
--
-- This is NOT the DATA SOURCE DATABASE (the external databases
-- that the catalog inspects).
--
-- Provider: Standard PostgreSQL (portable, no vendor-specific features)
--

-- ============================================================
-- DATA SOURCES
-- ============================================================

CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('POSTGRESQL', 'DEMO', 'MYSQL', 'CSV', 'S3', 'REST_API')),
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'ERROR', 'NOT_CONNECTED')),
  configuration JSONB NOT NULL,
  -- NOTE: configuration contains credentialRef, NOT actual credentials
  -- Actual credentials are stored in a separate secret manager
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_scan_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(type);
CREATE INDEX IF NOT EXISTS idx_data_sources_status ON data_sources(status);

-- ============================================================
-- ASSETS (Core Entity)
-- ============================================================

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('DATABASE', 'SCHEMA', 'TABLE', 'COLUMN', 'DATASET', 'FILE', 'DOCUMENT', 'API', 'PIPELINE', 'DASHBOARD', 'FEATURE', 'VECTOR_STORE', 'MODEL', 'LLM', 'PROMPT', 'AGENT', 'KNOWLEDGE_BASE', 'ENDPOINT')),
  name TEXT NOT NULL,
  qualified_name TEXT NOT NULL,
  description TEXT,
  domain TEXT,
  owner TEXT,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'DEPRECATED', 'DISCOVERED')),
  sensitivity TEXT NOT NULL CHECK (sensitivity IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'UNKNOWN')),
  certification_status TEXT NOT NULL CHECK (certification_status IN ('UNCERTIFIED', 'CERTIFIED', 'PENDING_REVIEW', 'EXPIRED')),
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(qualified_name, source_id)
);

CREATE INDEX IF NOT EXISTS idx_assets_source_id ON assets(source_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_qualified_name ON assets(qualified_name);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_sensitivity ON assets(sensitivity);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_assets_search ON assets USING GIN (
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(qualified_name, '') || ' ' || coalesce(description, ''))
);

-- ============================================================
-- ASSET VERSIONS (Historical Snapshots)
-- ============================================================

CREATE TABLE IF NOT EXISTS asset_versions (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  
  UNIQUE(asset_id, version)
);

CREATE INDEX IF NOT EXISTS idx_asset_versions_asset_id ON asset_versions(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_versions_changed_at ON asset_versions(changed_at DESC);

-- ============================================================
-- ASSET RELATIONSHIPS (Lineage Graph)
-- ============================================================

CREATE TABLE IF NOT EXISTS asset_relationships (
  id UUID PRIMARY KEY,
  source_asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  target_asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('CONTAINS', 'DERIVED_FROM', 'DEPENDS_ON', 'READS_FROM', 'WRITES_TO', 'TRANSFORMS')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(source_asset_id, target_asset_id, type)
);

CREATE INDEX IF NOT EXISTS idx_asset_relationships_source ON asset_relationships(source_asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_relationships_target ON asset_relationships(target_asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_relationships_type ON asset_relationships(type);

-- ============================================================
-- SCAN RUNS
-- ============================================================

CREATE TABLE IF NOT EXISTS scan_runs (
  id UUID PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  assets_discovered INTEGER NOT NULL DEFAULT 0,
  assets_updated INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_scan_runs_source_id ON scan_runs(source_id);
CREATE INDEX IF NOT EXISTS idx_scan_runs_status ON scan_runs(status);
CREATE INDEX IF NOT EXISTS idx_scan_runs_started_at ON scan_runs(started_at DESC);

-- ============================================================
-- CLASSIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS classifications (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  classification_type TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  method TEXT NOT NULL CHECK (method IN ('RULE', 'ML_MODEL', 'PATTERN_MATCH', 'HUMAN')),
  reason TEXT NOT NULL,
  rule_id TEXT,
  review_status TEXT NOT NULL CHECK (review_status IN ('SUGGESTED', 'CONFIRMED', 'REJECTED', 'NEEDS_REVIEW', 'PENDING')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classifications_asset_id ON classifications(asset_id);
CREATE INDEX IF NOT EXISTS idx_classifications_type ON classifications(classification_type);
CREATE INDEX IF NOT EXISTS idx_classifications_review_status ON classifications(review_status);

-- ============================================================
-- QUALITY RESULTS
-- ============================================================

CREATE TABLE IF NOT EXISTS quality_results (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  measured_value DOUBLE PRECISION NOT NULL,
  threshold DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PASS', 'WARN', 'WARNING', 'FAIL', 'NOT_EVALUATED')),
  details TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_results_asset_id ON quality_results(asset_id);
CREATE INDEX IF NOT EXISTS idx_quality_results_status ON quality_results(status);
CREATE INDEX IF NOT EXISTS idx_quality_results_timestamp ON quality_results(timestamp DESC);

-- ============================================================
-- TRUST SCORES
-- ============================================================

CREATE TABLE IF NOT EXISTS trust_scores (
  asset_id UUID PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  components JSONB NOT NULL,
  explanation TEXT NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_scores_score ON trust_scores(score);

-- ============================================================
-- EVIDENCE RECORDS
-- ============================================================

CREATE TABLE IF NOT EXISTS evidence_records (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id UUID NOT NULL,
  actor TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_evidence_records_subject ON evidence_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_evidence_records_type ON evidence_records(type);
CREATE INDEX IF NOT EXISTS idx_evidence_records_timestamp ON evidence_records(timestamp DESC);

-- ============================================================
-- AUDIT EVENTS (Append-Only)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'SCAN', 'CLASSIFY', 'REVIEW', 'CONNECT')),
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp DESC);

-- ============================================================
-- POLICY EVALUATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS policy_evaluations (
  id UUID PRIMARY KEY,
  policy_id TEXT NOT NULL,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('PASS', 'WARN', 'FAIL', 'NOT_EVALUATED')),
  violations JSONB NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_evaluations_asset_id ON policy_evaluations(asset_id);
CREATE INDEX IF NOT EXISTS idx_policy_evaluations_status ON policy_evaluations(status);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- NOTES
-- ============================================================
--
-- 1. Secrets (DATABASE_URL, credentials) are NOT stored in this schema.
--    They must be managed via a separate secret manager (e.g., Supabase Vault,
--    AWS Secrets Manager, HashiCorp Vault).
--
-- 2. The configuration JSONB in data_sources contains credentialRef,
--    which is a reference to the secret, NOT the secret itself.
--
-- 3. All timestamps use TIMESTAMPTZ for timezone-aware storage.
--
-- 4. UUIDs are used for all primary keys to support distributed systems.
--
-- 5. JSONB is used for flexible metadata storage while maintaining
--    query capabilities via PostgreSQL JSON operators.
--
-- 6. Foreign keys use ON DELETE CASCADE for simplicity.
--    In production, consider ON DELETE RESTRICT for critical entities.
--
-- 7. Indexes are optimized for common query patterns:
--    - Asset lookup by source, type, qualified_name
--    - Relationship traversal (upstream/downstream)
--    - Time-series queries (evidence, audit, quality)
--    - Full-text search on assets
--
