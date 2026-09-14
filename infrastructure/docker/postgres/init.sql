-- =============================================
-- InsightIQ — PostgreSQL Initialization Script
-- Runs once when the postgres container first starts
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- Fuzzy text search
CREATE EXTENSION IF NOT EXISTS "vector";    -- pgvector for semantic search (MVP)

-- =============================================
-- CORE MULTI-TENANT FOUNDATION
-- =============================================

CREATE TABLE IF NOT EXISTS tenants (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT        UNIQUE NOT NULL,
    name        TEXT        NOT NULL,
    plan        TEXT        NOT NULL DEFAULT 'starter', -- 'starter' | 'professional' | 'enterprise'
    industry    TEXT,
    settings    JSONB       NOT NULL DEFAULT '{}',
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    slug        TEXT        NOT NULL,
    settings    JSONB       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    external_id     TEXT        UNIQUE,             -- ID from Auth0/WorkOS/Clerk
    email           TEXT        NOT NULL,
    display_name    TEXT,
    role            TEXT        NOT NULL DEFAULT 'viewer', -- 'owner'|'admin'|'analyst'|'viewer'
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

-- =============================================
-- SEMANTIC METRIC CATALOG
-- =============================================

CREATE TABLE IF NOT EXISTS metric_definitions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    workspace_id    UUID        REFERENCES workspaces(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    display_name    TEXT        NOT NULL,
    description     TEXT,
    formula         TEXT        NOT NULL,           -- Certified SQL expression
    time_grain      TEXT        NOT NULL DEFAULT 'daily',  -- 'hourly'|'daily'|'weekly'|'monthly'
    dimensions      JSONB       NOT NULL DEFAULT '[]',    -- ["region","product","channel"]
    filters         JSONB       NOT NULL DEFAULT '{}',
    owner           TEXT,
    data_source_id  UUID,
    is_certified    BOOLEAN     NOT NULL DEFAULT FALSE,
    synonyms        JSONB       NOT NULL DEFAULT '[]',    -- Natural language aliases
    pii_sensitivity TEXT        NOT NULL DEFAULT 'internal', -- 'public'|'internal'|'confidential'|'restricted'
    tags            JSONB       NOT NULL DEFAULT '[]',
    version         INTEGER     NOT NULL DEFAULT 1,
    deprecated_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

-- =============================================
-- DATA SOURCES
-- =============================================

CREATE TABLE IF NOT EXISTS data_sources (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    connector_type  TEXT        NOT NULL,  -- 'csv_upload'|'postgres'|'salesforce'|'hubspot' etc.
    status          TEXT        NOT NULL DEFAULT 'pending', -- 'pending'|'active'|'error'|'paused'
    config          JSONB       NOT NULL DEFAULT '{}',      -- Non-sensitive connector config
    last_sync_at    TIMESTAMPTZ,
    next_sync_at    TIMESTAMPTZ,
    row_count       BIGINT,
    data_quality_score FLOAT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    data_source_id  UUID        NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    status          TEXT        NOT NULL DEFAULT 'pending', -- 'pending'|'running'|'completed'|'failed'
    job_type        TEXT        NOT NULL DEFAULT 'full_sync', -- 'full_sync'|'incremental'
    rows_processed  BIGINT      DEFAULT 0,
    rows_failed     BIGINT      DEFAULT 0,
    error_details   JSONB,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- DOCUMENTS
-- =============================================

CREATE TABLE IF NOT EXISTS documents (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    data_source_id  UUID        REFERENCES data_sources(id),
    title           TEXT        NOT NULL,
    content_type    TEXT        NOT NULL,  -- 'review'|'survey'|'email'|'transcript'|'report'|'pdf'
    language        TEXT        NOT NULL DEFAULT 'en',
    storage_path    TEXT,                  -- Object storage path
    status          TEXT        NOT NULL DEFAULT 'pending', -- 'pending'|'processing'|'indexed'|'failed'
    chunk_count     INTEGER     DEFAULT 0,
    pii_redacted    BOOLEAN     NOT NULL DEFAULT FALSE,
    data_class      TEXT        NOT NULL DEFAULT 'internal',
    metadata        JSONB       NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id     UUID        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index     INTEGER     NOT NULL,
    content         TEXT        NOT NULL,              -- Original chunk text
    content_clean   TEXT,                              -- PII-redacted version
    tokens          INTEGER,
    page_number     INTEGER,
    metadata        JSONB       NOT NULL DEFAULT '{}',
    embedding_model TEXT,
    embedded_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INSIGHTS
-- =============================================

CREATE TABLE IF NOT EXISTS insight_runs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    trigger_type    TEXT        NOT NULL DEFAULT 'scheduled', -- 'scheduled'|'manual'|'webhook'
    status          TEXT        NOT NULL DEFAULT 'pending',   -- 'pending'|'running'|'completed'|'failed'
    insight_count   INTEGER     DEFAULT 0,
    error_details   JSONB,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insights (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    run_id              UUID        REFERENCES insight_runs(id),
    insight_type        TEXT        NOT NULL, -- 'anomaly'|'trend'|'shift'|'opportunity'|'risk'
    severity            TEXT        NOT NULL DEFAULT 'medium', -- 'critical'|'high'|'medium'|'low'
    title               TEXT        NOT NULL,
    summary             TEXT,
    affected_metrics    JSONB       NOT NULL DEFAULT '[]',
    affected_dimensions JSONB       NOT NULL DEFAULT '{}',
    evidence            JSONB       NOT NULL DEFAULT '{}',
    confidence_score    FLOAT       NOT NULL DEFAULT 0.0,
    confidence_breakdown JSONB      NOT NULL DEFAULT '{}',
    caveats             JSONB       NOT NULL DEFAULT '[]',
    status              TEXT        NOT NULL DEFAULT 'active', -- 'active'|'resolved'|'superseded'
    agent_trace_id      UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- RECOMMENDATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS recommendations (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    insight_id      UUID        REFERENCES insights(id),
    title           TEXT        NOT NULL,
    description     TEXT,
    action_type     TEXT,                      -- 'pricing'|'marketing'|'ops'|'retention' etc.
    expected_impact JSONB       NOT NULL DEFAULT '{}',  -- {metric, direction, magnitude, confidence}
    impact_score    FLOAT       NOT NULL DEFAULT 0.0,
    effort_score    FLOAT       NOT NULL DEFAULT 0.0,
    risk_score      FLOAT       NOT NULL DEFAULT 0.0,
    confidence_score FLOAT      NOT NULL DEFAULT 0.0,
    composite_score  FLOAT      NOT NULL DEFAULT 0.0,
    status          TEXT        NOT NULL DEFAULT 'pending', -- 'pending'|'accepted'|'rejected'|'deferred'
    decided_by      UUID        REFERENCES users(id),
    decided_at      TIMESTAMPTZ,
    rejection_reason TEXT,
    outcome_tracking JSONB      NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- DECISION GRAPH (Audit-grade decision memory)
-- =============================================

CREATE TABLE IF NOT EXISTS decision_nodes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_id  UUID,
    node_type   TEXT        NOT NULL, -- 'question'|'evidence'|'assumption'|'recommendation'|'decision'|'outcome'
    content     JSONB       NOT NULL DEFAULT '{}',
    parent_id   UUID        REFERENCES decision_nodes(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- AI ADVISOR SESSIONS
-- =============================================

CREATE TABLE IF NOT EXISTS advisor_sessions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id),
    title       TEXT,
    status      TEXT        NOT NULL DEFAULT 'active', -- 'active'|'archived'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS advisor_messages (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_id      UUID        NOT NULL REFERENCES advisor_sessions(id) ON DELETE CASCADE,
    role            TEXT        NOT NULL, -- 'user'|'assistant'
    content         TEXT        NOT NULL,
    evidence_panel  JSONB,                -- Attached evidence panel for assistant messages
    tool_calls      JSONB       NOT NULL DEFAULT '[]',
    model_provider  TEXT,
    model_version   TEXT,
    token_cost      INTEGER,
    latency_ms      INTEGER,
    confidence_score FLOAT,
    agent_trace_id  UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- AUDIT LOG (Immutable)
-- =============================================

CREATE TABLE IF NOT EXISTS audit_events (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL,
    event_type      TEXT        NOT NULL,
    actor_id        UUID,
    actor_email     TEXT,
    resource_type   TEXT,
    resource_id     UUID,
    ip_address      INET,
    user_agent      TEXT,
    metadata        JSONB       NOT NULL DEFAULT '{}',
    model_provider  TEXT,
    model_version   TEXT,
    prompt_version  TEXT,
    token_cost      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- VECTOR STORE (pgvector — MVP fallback)
-- =============================================

CREATE TABLE IF NOT EXISTS document_embeddings (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    chunk_id        UUID        NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
    embedding       vector(1536),        -- text-embedding-3-small dimensions
    model_name      TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ANN search
CREATE INDEX IF NOT EXISTS document_embeddings_vector_idx
    ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- =============================================
-- ROW LEVEL SECURITY — Tenant Isolation
-- =============================================

ALTER TABLE workspaces          ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_definitions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_nodes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS policies — enforced via app.current_tenant_id session variable
CREATE POLICY tenant_rls_workspaces        ON workspaces           USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
CREATE POLICY tenant_rls_users             ON users                USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
CREATE POLICY tenant_rls_metrics           ON metric_definitions   USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
CREATE POLICY tenant_rls_data_sources      ON data_sources         USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
CREATE POLICY tenant_rls_ingestion_jobs    ON ingestion_jobs       USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
CREATE POLICY tenant_rls_documents         ON documents            USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
CREATE POLICY tenant_rls_chunks            ON document_chunks      USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
CREATE POLICY tenant_rls_insight_runs      ON insight_runs         USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
CREATE POLICY tenant_rls_insights          ON insights             USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
CREATE POLICY tenant_rls_recommendations   ON recommendations      USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
CREATE POLICY tenant_rls_decision_nodes    ON decision_nodes       USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
CREATE POLICY tenant_rls_sessions          ON advisor_sessions     USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
CREATE POLICY tenant_rls_messages          ON advisor_messages     USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
CREATE POLICY tenant_rls_embeddings        ON document_embeddings  USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));

-- =============================================
-- INDEXES FOR QUERY PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_insights_tenant_type     ON insights (tenant_id, insight_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_tenant_status   ON insights (tenant_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_recommendations_tenant   ON recommendations (tenant_id, status, composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session         ON advisor_messages (session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_type        ON audit_events (tenant_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chunks_document          ON document_chunks (document_id, chunk_index ASC);
CREATE INDEX IF NOT EXISTS idx_metrics_tenant_certified ON metric_definitions (tenant_id, is_certified, name);

-- =============================================
-- SEED DATA — Dev tenant for testing
-- =============================================

INSERT INTO tenants (id, slug, name, plan, industry) VALUES
    ('00000000-0000-0000-0000-000000000001', 'dev-tenant', 'InsightIQ Dev Tenant', 'enterprise', 'saas')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO workspaces (id, tenant_id, name, slug) VALUES
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Main Workspace', 'main')
ON CONFLICT (tenant_id, slug) DO NOTHING;
