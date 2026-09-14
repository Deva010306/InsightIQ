"""
InsightIQ — Analytics Seed Script
Seeds DuckDB with 12 months of realistic business metrics.
Run this AFTER the PostgreSQL seed has been applied.

Usage:
    cd services/api
    .venv/Scripts/python.exe -m src.infrastructure.analytics.seed
"""
from __future__ import annotations

import random
import uuid
from datetime import date, timedelta

from src.infrastructure.analytics.duckdb_client import get_duckdb
from src.shared.logging import get_logger, configure_logging

configure_logging()
logger = get_logger(__name__)

TENANT_ID = "00000000-0000-0000-0000-000000000001"
FORECAST_RUN_ID = str(uuid.uuid4())

# Base monthly revenue values (INR, in Crores × 10M)
# Realistic SaaS growth trajectory over 12 months
REVENUE_MONTHLY = [
    18_500_000, 19_200_000, 18_800_000, 20_100_000, 20_900_000, 21_300_000,
    22_100_000, 21_700_000, 22_800_000, 23_500_000, 23_100_000, 24_100_000,
]

ARR_MONTHLY = [
    222_000_000, 230_400_000, 225_600_000, 241_200_000, 250_800_000, 255_600_000,
    265_200_000, 260_400_000, 273_600_000, 282_000_000, 277_200_000, 289_900_000,
]

CHURN_MONTHLY = [2.8, 2.7, 2.9, 2.6, 2.5, 2.4, 2.3, 2.5, 2.4, 2.3, 2.2, 2.1]
NPS_MONTHLY   = [55, 57, 56, 58, 60, 61, 62, 60, 63, 64, 65, 67]
CAC_MONTHLY   = [134_300, 130_500, 128_000, 125_000, 122_500, 120_000,
                 118_000, 116_000, 113_000, 110_000, 107_500, 105_400]
PIPELINE_MONTHLY = [
    95_000_000, 98_000_000, 102_000_000, 106_000_000, 109_000_000, 111_000_000,
    114_000_000, 112_000_000, 109_000_000, 108_000_000, 110_000_000, 107_100_000,
]

REGIONS   = ["North", "South", "East", "West", "Central"]
CHANNELS  = ["Direct", "Partner", "Inbound", "Outbound"]
SEGMENTS  = ["Enterprise", "Mid-Market", "SMB"]


def seed_metric_snapshots(conn) -> None:
    logger.info("seeding_metric_snapshots_start")
    rows = []
    today = date.today()
    # 12 months back
    start_month = date(today.year - 1, today.month, 1)

    metrics = [
        ("revenue",  REVENUE_MONTHLY),
        ("arr",      ARR_MONTHLY),
        ("churn_rate", CHURN_MONTHLY),
        ("nps",      NPS_MONTHLY),
        ("cac",      CAC_MONTHLY),
        ("pipeline", PIPELINE_MONTHLY),
    ]

    for month_idx in range(12):
        # First day of each month
        if start_month.month + month_idx > 12:
            snap_date = date(start_month.year + 1, (start_month.month + month_idx) % 12 or 12, 1)
        else:
            snap_date = date(start_month.year, start_month.month + month_idx, 1)

        prev_idx = max(0, month_idx - 1)

        for metric_name, values in metrics:
            value = values[month_idx]
            prev_value = values[prev_idx]
            pct_change = ((value - prev_value) / prev_value * 100) if prev_value else 0

            # Overall (no dimension breakdown)
            rows.append((
                TENANT_ID, metric_name, snap_date, "monthly",
                "overall", "total",
                value, prev_value, pct_change, 1.0, random.randint(100, 5000),
            ))

            # Regional breakdown for revenue
            if metric_name == "revenue":
                weights = [0.30, 0.22, 0.18, 0.20, 0.10]
                for region, weight in zip(REGIONS, weights):
                    rval = value * weight * (1 + random.uniform(-0.05, 0.05))
                    rprev = prev_value * weight * (1 + random.uniform(-0.05, 0.05))
                    rows.append((
                        TENANT_ID, metric_name, snap_date, "monthly",
                        "region", region,
                        round(rval), round(rprev),
                        ((rval - rprev) / rprev * 100) if rprev else 0,
                        0.98, random.randint(20, 500),
                    ))

            # Segment breakdown for ARR
            if metric_name == "arr":
                weights = [0.57, 0.29, 0.14]
                for segment, weight in zip(SEGMENTS, weights):
                    sval = value * weight * (1 + random.uniform(-0.03, 0.03))
                    sprev = prev_value * weight * (1 + random.uniform(-0.03, 0.03))
                    rows.append((
                        TENANT_ID, metric_name, snap_date, "monthly",
                        "segment", segment,
                        round(sval), round(sprev),
                        ((sval - sprev) / sprev * 100) if sprev else 0,
                        0.97, random.randint(10, 200),
                    ))

    conn.executemany("""
        INSERT INTO metric_snapshots
        (tenant_id, metric_name, snapshot_date, time_grain,
         dimension_key, dimension_value, value, period_prev_value,
         pct_change, data_quality_score, row_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows)
    logger.info("metric_snapshots_seeded", count=len(rows))


def seed_forecast_results(conn) -> None:
    logger.info("seeding_forecasts_start")
    rows = []
    today = date.today()

    for metric_name, base_values in [("revenue", REVENUE_MONTHLY), ("arr", ARR_MONTHLY)]:
        last_val = base_values[-1]
        growth_rate = (base_values[-1] / base_values[-3]) ** (1 / 3) - 1  # 3-month CAGR

        for day_offset in range(1, 91):
            forecast_date = today + timedelta(days=day_offset)
            fraction = day_offset / 30  # months ahead
            baseline = last_val * ((1 + growth_rate) ** fraction)
            optimistic = baseline * 1.12
            conservative = baseline * 0.91

            rows.append((
                TENANT_ID, FORECAST_RUN_ID, metric_name, forecast_date, 90, "prophet",
                round(baseline), round(optimistic), round(conservative),
                round(baseline * 0.93), round(baseline * 1.07),
                round(baseline * 0.87), round(baseline * 1.13),
                round(last_val * 0.035), 3.4,
            ))

    conn.executemany("""
        INSERT INTO forecast_results
        (tenant_id, forecast_run_id, metric_name, forecast_date, horizon_days, model_type,
         scenario_baseline, scenario_optimistic, scenario_conservative,
         lower_80, upper_80, lower_95, upper_95, historical_mae, historical_mape)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows)
    logger.info("forecasts_seeded", count=len(rows))


def seed_anomaly_results(conn) -> None:
    logger.info("seeding_anomalies_start")
    today = date.today()
    anomalies = [
        (today - timedelta(days=5),  "revenue",    "region",  "West",   19_200_000, 22_800_000, -2.8, 0.91, "critical", "zscore"),
        (today - timedelta(days=12), "churn_rate", "segment", "SMB",    4.2,  2.4,  3.1,  0.85, "high",     "zscore"),
        (today - timedelta(days=18), "pipeline",   "channel", "Outbound", 8_200_000, 11_000_000, -2.2, 0.78, "high", "isolation_forest"),
        (today - timedelta(days=25), "nps",        "region",  "East",   52,   65,   -2.4, 0.74, "medium",   "rule_based"),
        (today - timedelta(days=31), "cac",        "channel", "Inbound", 148_000, 115_000, 2.5, 0.70, "medium", "zscore"),
        (today - timedelta(days=38), "revenue",    "segment", "SMB",    2_800_000, 4_100_000, -2.6, 0.88, "high", "zscore"),
        (today - timedelta(days=3),  "arr",        "segment", "Enterprise", 155_000_000, 167_000_000, -1.9, 0.65, "medium", "zscore"),
    ]

    rows = [
        (TENANT_ID, d, mn, dk, dv, ov, ev, zs, asc_, sev, dm, None)
        for d, mn, dk, dv, ov, ev, zs, asc_, sev, dm in anomalies
    ]

    conn.executemany("""
        INSERT INTO anomaly_results
        (tenant_id, detection_date, metric_name, dimension_key, dimension_value,
         observed_value, expected_value, deviation_zscore, anomaly_score,
         severity, detection_method, insight_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows)
    logger.info("anomalies_seeded", count=len(rows))


def seed_business_events(conn) -> None:
    """Seed 500 sample business events."""
    logger.info("seeding_business_events_start")
    random.seed(42)
    rows = []
    today = date.today()

    for i in range(500):
        event_date = today - timedelta(days=random.randint(0, 365))
        event_type = random.choice(["sale", "sale", "sale", "refund", "churn", "upsell"])
        region = random.choice(REGIONS)
        channel = random.choice(CHANNELS)
        segment = random.choice(SEGMENTS)

        if event_type == "sale":
            value = random.uniform(50_000, 2_000_000)
        elif event_type == "refund":
            value = -random.uniform(10_000, 200_000)
        elif event_type == "upsell":
            value = random.uniform(100_000, 500_000)
        else:
            value = 0

        rows.append((
            TENANT_ID, event_date, event_date,
            event_type, f"entity-{i:04d}", "customer",
            region, channel, "SaaS Platform", segment, "",
            round(value, 2), 1, "{}",
            "00000000-0000-0000-0000-000000000001",
        ))

    conn.executemany("""
        INSERT INTO business_events
        (tenant_id, event_date, event_datetime, event_type, entity_id, entity_type,
         dim_region, dim_channel, dim_product, dim_segment, dim_campaign,
         value, quantity, metadata, data_source_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows)
    logger.info("business_events_seeded", count=len(rows))


def run_seed() -> None:
    conn = get_duckdb()

    # Check if already seeded
    count = conn.execute(
        "SELECT COUNT(*) FROM metric_snapshots WHERE tenant_id = ?", [TENANT_ID]
    ).fetchone()[0]

    if count > 0:
        logger.info("duckdb_already_seeded", existing_rows=count)
        return

    seed_metric_snapshots(conn)
    seed_forecast_results(conn)
    seed_anomaly_results(conn)
    seed_business_events(conn)

    logger.info("duckdb_seed_complete")


if __name__ == "__main__":
    run_seed()
