"""
InsightIQ — DuckDB Analytics Client
Replaces ClickHouse for local development (no server needed).
Provides the same analytical queries as the ClickHouse layer.
"""
from __future__ import annotations

import os
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Any

import duckdb

from src.shared.config import get_settings
from src.shared.logging import get_logger

logger = get_logger(__name__)

_conn: duckdb.DuckDBPyConnection | None = None


def get_duckdb() -> duckdb.DuckDBPyConnection:
    """Get or create the DuckDB connection (singleton)."""
    global _conn
    if _conn is None:
        settings = get_settings()
        db_path = Path(settings.duckdb_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        _conn = duckdb.connect(str(db_path))
        _ensure_schema(_conn)
        logger.info("duckdb_connected", path=str(db_path))
    return _conn


def _ensure_schema(conn: duckdb.DuckDBPyConnection) -> None:
    """Create DuckDB tables matching the ClickHouse schema if they don't exist."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS metric_snapshots (
            tenant_id       VARCHAR,
            metric_name     VARCHAR,
            snapshot_date   DATE,
            time_grain      VARCHAR,
            dimension_key   VARCHAR,
            dimension_value VARCHAR,
            value           DOUBLE,
            period_prev_value DOUBLE DEFAULT 0,
            pct_change      DOUBLE DEFAULT 0,
            data_quality_score FLOAT DEFAULT 1.0,
            row_count       BIGINT DEFAULT 0,
            computed_at     TIMESTAMP DEFAULT NOW()
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS business_events (
            tenant_id       VARCHAR,
            event_date      DATE,
            event_datetime  TIMESTAMP,
            event_type      VARCHAR,
            entity_id       VARCHAR,
            entity_type     VARCHAR,
            dim_region      VARCHAR DEFAULT '',
            dim_channel     VARCHAR DEFAULT '',
            dim_product     VARCHAR DEFAULT '',
            dim_segment     VARCHAR DEFAULT '',
            dim_campaign    VARCHAR DEFAULT '',
            value           DOUBLE DEFAULT 0,
            quantity        INTEGER DEFAULT 0,
            metadata        VARCHAR DEFAULT '{}',
            data_source_id  VARCHAR,
            ingested_at     TIMESTAMP DEFAULT NOW()
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS forecast_results (
            tenant_id           VARCHAR,
            forecast_run_id     VARCHAR,
            metric_name         VARCHAR,
            forecast_date       DATE,
            horizon_days        INTEGER,
            model_type          VARCHAR,
            scenario_baseline   DOUBLE,
            scenario_optimistic DOUBLE,
            scenario_conservative DOUBLE,
            lower_80            DOUBLE,
            upper_80            DOUBLE,
            lower_95            DOUBLE,
            upper_95            DOUBLE,
            historical_mae      DOUBLE,
            historical_mape     DOUBLE,
            created_at          TIMESTAMP DEFAULT NOW()
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS anomaly_results (
            tenant_id           VARCHAR,
            detection_date      DATE,
            metric_name         VARCHAR,
            dimension_key       VARCHAR,
            dimension_value     VARCHAR,
            observed_value      DOUBLE,
            expected_value      DOUBLE,
            deviation_zscore    DOUBLE,
            anomaly_score       FLOAT,
            severity            VARCHAR,
            detection_method    VARCHAR,
            insight_id          VARCHAR,
            created_at          TIMESTAMP DEFAULT NOW()
        )
    """)
    logger.info("duckdb_schema_ready")


def query_metric_snapshots(
    tenant_id: str,
    metric_name: str,
    date_from: date,
    date_to: date,
    *,
    dimension_key: str | None = None,
    dimension_value: str | None = None,
    time_grain: str = "daily",
) -> list[dict[str, Any]]:
    """Query metric time-series from DuckDB."""
    conn = get_duckdb()

    sql = """
        SELECT
            snapshot_date AS date,
            SUM(value) AS value,
            dimension_key,
            dimension_value
        FROM metric_snapshots
        WHERE tenant_id = ?
          AND metric_name = ?
          AND snapshot_date BETWEEN ? AND ?
          AND time_grain = ?
    """
    params: list[Any] = [tenant_id, metric_name, date_from, date_to, time_grain]

    if dimension_key:
        sql += " AND dimension_key = ?"
        params.append(dimension_key)

    sql += " GROUP BY snapshot_date, dimension_key, dimension_value ORDER BY snapshot_date ASC"

    result = conn.execute(sql, params).fetchall()
    columns = ["date", "value", "dimension_key", "dimension_value"]
    return [dict(zip(columns, row)) for row in result]


def query_forecasts(
    tenant_id: str,
    metric_name: str,
    *,
    horizon_days: int = 90,
) -> list[dict[str, Any]]:
    """Query forecast results from DuckDB."""
    conn = get_duckdb()
    sql = """
        SELECT
            forecast_date,
            scenario_baseline,
            scenario_optimistic,
            scenario_conservative,
            lower_80, upper_80, lower_95, upper_95,
            model_type,
            historical_mape
        FROM forecast_results
        WHERE tenant_id = ?
          AND metric_name = ?
          AND horizon_days = ?
        ORDER BY forecast_date ASC
        LIMIT 200
    """
    result = conn.execute(sql, [tenant_id, metric_name, horizon_days]).fetchall()
    columns = [
        "forecast_date", "scenario_baseline", "scenario_optimistic",
        "scenario_conservative", "lower_80", "upper_80", "lower_95", "upper_95",
        "model_type", "historical_mape"
    ]
    return [dict(zip(columns, row)) for row in result]


def query_anomalies(tenant_id: str, limit: int = 20) -> list[dict[str, Any]]:
    """Get recent anomaly detections."""
    conn = get_duckdb()
    sql = """
        SELECT
            detection_date, metric_name, dimension_key, dimension_value,
            observed_value, expected_value, deviation_zscore,
            anomaly_score, severity, detection_method
        FROM anomaly_results
        WHERE tenant_id = ?
        ORDER BY anomaly_score DESC, detection_date DESC
        LIMIT ?
    """
    result = conn.execute(sql, [tenant_id, limit]).fetchall()
    columns = [
        "detection_date", "metric_name", "dimension_key", "dimension_value",
        "observed_value", "expected_value", "deviation_zscore",
        "anomaly_score", "severity", "detection_method"
    ]
    return [dict(zip(columns, row)) for row in result]


def close_duckdb() -> None:
    global _conn
    if _conn:
        _conn.close()
        _conn = None
        logger.info("duckdb_closed")
