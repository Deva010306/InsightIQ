-- =============================================
-- InsightIQ — ClickHouse Initialization Script
-- Creates analytical tables for the OLAP layer
-- =============================================

-- Create the analytics database
CREATE DATABASE IF NOT EXISTS insightiq_analytics;

-- =============================================
-- BUSINESS EVENTS FACT TABLE
-- Core event stream: sales, transactions, marketing
-- =============================================

CREATE TABLE IF NOT EXISTS insightiq_analytics.business_events (
    tenant_id           UUID,
    event_date          Date,
    event_datetime      DateTime64(3),
    event_type          LowCardinality(String),  -- 'sale'|'refund'|'campaign_click'|'churn' etc.
    entity_id           String,
    entity_type         LowCardinality(String),  -- 'customer'|'product'|'campaign'
    -- Dimensions
    dim_region          LowCardinality(String)   DEFAULT '',
    dim_channel         LowCardinality(String)   DEFAULT '',
    dim_product         LowCardinality(String)   DEFAULT '',
    dim_segment         LowCardinality(String)   DEFAULT '',
    dim_campaign        LowCardinality(String)   DEFAULT '',
    -- Values
    value               Float64                  DEFAULT 0,
    quantity            Int32                    DEFAULT 0,
    metadata            String                   DEFAULT '{}',  -- JSON string
    -- Lineage
    data_source_id      UUID,
    ingestion_job_id    UUID,
    ingested_at         DateTime                 DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY (tenant_id, toYYYYMM(event_date))
ORDER BY (tenant_id, event_date, event_type, entity_id)
TTL event_date + INTERVAL 5 YEAR
SETTINGS index_granularity = 8192;


-- =============================================
-- METRIC SNAPSHOTS
-- Precomputed metric aggregates by tenant+metric+time+dimension
-- =============================================

CREATE TABLE IF NOT EXISTS insightiq_analytics.metric_snapshots (
    tenant_id           UUID,
    metric_name         LowCardinality(String),
    snapshot_date       Date,
    time_grain          LowCardinality(String),  -- 'daily'|'weekly'|'monthly'
    dimension_key       LowCardinality(String),  -- e.g., 'region'
    dimension_value     String,                  -- e.g., 'North America'
    value               Float64,
    period_prev_value   Float64                  DEFAULT 0,  -- Prior period value
    pct_change          Float64                  DEFAULT 0,  -- Period-over-period %
    data_quality_score  Float32                  DEFAULT 1.0,
    row_count           Int64                    DEFAULT 0,  -- # records behind this metric
    computed_at         DateTime                 DEFAULT now()
)
ENGINE = ReplacingMergeTree(computed_at)
PARTITION BY (tenant_id, toYYYYMM(snapshot_date))
ORDER BY (tenant_id, metric_name, snapshot_date, time_grain, dimension_key, dimension_value)
TTL snapshot_date + INTERVAL 3 YEAR;


-- =============================================
-- ANOMALY DETECTION RESULTS
-- =============================================

CREATE TABLE IF NOT EXISTS insightiq_analytics.anomaly_results (
    tenant_id           UUID,
    detection_date      Date,
    metric_name         LowCardinality(String),
    dimension_key       LowCardinality(String),
    dimension_value     String,
    observed_value      Float64,
    expected_value      Float64,
    deviation_zscore    Float64,
    anomaly_score       Float32,
    severity            LowCardinality(String),  -- 'critical'|'high'|'medium'|'low'
    detection_method    LowCardinality(String),  -- 'zscore'|'isolation_forest'|'rule_based'
    insight_id          Nullable(UUID),
    created_at          DateTime                 DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY (tenant_id, toYYYYMM(detection_date))
ORDER BY (tenant_id, detection_date, metric_name, anomaly_score DESC);


-- =============================================
-- FORECAST OUTPUTS
-- =============================================

CREATE TABLE IF NOT EXISTS insightiq_analytics.forecast_results (
    tenant_id           UUID,
    forecast_run_id     UUID,
    metric_name         LowCardinality(String),
    forecast_date       Date,
    horizon_days        Int32,
    model_type          LowCardinality(String),  -- 'prophet'|'nhits'|'xgboost'|'theta'
    -- Scenario values
    scenario_baseline   Float64,
    scenario_optimistic Float64,
    scenario_conservative Float64,
    -- Uncertainty intervals
    lower_80            Float64,
    upper_80            Float64,
    lower_95            Float64,
    upper_95            Float64,
    -- Quality metrics
    historical_mae      Float64,
    historical_mape     Float64,
    created_at          DateTime                 DEFAULT now()
)
ENGINE = ReplacingMergeTree(created_at)
PARTITION BY (tenant_id, toYYYYMM(forecast_date))
ORDER BY (tenant_id, metric_name, forecast_date, model_type);


-- =============================================
-- SENTIMENT ANALYSIS RESULTS
-- =============================================

CREATE TABLE IF NOT EXISTS insightiq_analytics.sentiment_results (
    tenant_id           UUID,
    document_id         UUID,
    analysis_date       Date,
    content_type        LowCardinality(String),  -- 'review'|'survey'|'email'|'transcript'
    -- Scores
    overall_sentiment   Float32,    -- -1.0 to +1.0
    sentiment_label     LowCardinality(String),  -- 'positive'|'neutral'|'negative'
    urgency_score       Float32,    -- 0.0 to 1.0
    -- Dimensions
    dim_product         LowCardinality(String)   DEFAULT '',
    dim_region          LowCardinality(String)   DEFAULT '',
    dim_channel         LowCardinality(String)   DEFAULT '',
    -- Topics (stored as comma-separated)
    detected_topics     Array(String),
    -- Aspect scores (JSONB stored as String)
    aspect_scores       String                   DEFAULT '{}',
    created_at          DateTime                 DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY (tenant_id, toYYYYMM(analysis_date))
ORDER BY (tenant_id, analysis_date, content_type, overall_sentiment);


-- =============================================
-- MATERIALIZED VIEW: Daily Metric Summary
-- Pre-aggregates business events into daily metric snapshots
-- =============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS insightiq_analytics.mv_daily_revenue
ENGINE = SummingMergeTree()
PARTITION BY (tenant_id, toYYYYMM(event_date))
ORDER BY (tenant_id, event_date, dim_region, dim_channel, dim_product)
AS
SELECT
    tenant_id,
    event_date,
    dim_region,
    dim_channel,
    dim_product,
    sum(value)      AS total_revenue,
    count()         AS transaction_count,
    uniq(entity_id) AS unique_customers
FROM insightiq_analytics.business_events
WHERE event_type = 'sale'
GROUP BY tenant_id, event_date, dim_region, dim_channel, dim_product;
