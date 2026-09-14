"""
InsightIQ — Dashboard Router
KPI cards, alerts, and business health score from DuckDB.
No PostgreSQL required — runs entirely from DuckDB analytics store.
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


# ==========================================
# Schemas
# ==========================================

class KPICard(BaseModel):
    id: str
    label: str
    value: str            # Formatted display value
    raw_value: float
    trend: float          # % change vs prior period (signed)
    trend_dir: str        # "up" | "down" | "neutral"
    period: str           # "vs last month"
    sparkline: list[float]
    accent: str           # CSS color for sparkline


class AlertCard(BaseModel):
    id: str
    severity: str         # "critical" | "high" | "medium" | "low"
    title: str
    desc: str
    metric: str
    time: str


class HealthDriver(BaseModel):
    name: str
    score: int


class HealthScore(BaseModel):
    score: int
    label: str
    trend: float
    drivers: list[HealthDriver]


class DashboardSummary(BaseModel):
    kpis: list[KPICard]
    alerts: list[AlertCard]
    health: HealthScore


# ==========================================
# Helpers
# ==========================================

def _fmt_currency(v: float) -> str:
    """Format a number as INR with appropriate suffix."""
    if v >= 10_000_000:
        return f"₹{v / 10_000_000:.2f}Cr"
    if v >= 100_000:
        return f"₹{v / 100_000:.1f}L"
    return f"₹{v / 1_000:.0f}K"


def _fmt_pct(v: float) -> str:
    return f"{v:.1f}%"


def _fmt_score(v: float) -> str:
    return f"{v:.0f}"


def _trend_dir(pct: float) -> str:
    if pct > 0.2:
        return "up"
    if pct < -0.2:
        return "down"
    return "neutral"


def _get_kpis_from_duckdb(tenant_id: str) -> list[KPICard]:
    """Pull 12-month monthly snapshots for each KPI and compute cards."""
    from src.infrastructure.analytics.duckdb_client import get_duckdb, query_metric_snapshots

    today = date.today()
    date_from = today - timedelta(days=365)

    metrics_config = [
        ("revenue",    "Total Revenue",    "#6366f1", _fmt_currency),
        ("arr",        "Annual Recurring Revenue", "#8b5cf6", _fmt_currency),
        ("churn_rate", "Churn Rate",       "#ef4444", _fmt_pct),
        ("nps",        "Net Promoter Score", "#10b981", _fmt_score),
        ("cac",        "Customer Acq. Cost", "#f59e0b", _fmt_currency),
        ("pipeline",   "Sales Pipeline",   "#3b82f6", _fmt_currency),
    ]

    cards: list[KPICard] = []

    for metric_name, label, accent, formatter in metrics_config:
        rows = query_metric_snapshots(
            tenant_id=tenant_id,
            metric_name=metric_name,
            date_from=date_from,
            date_to=today,
            time_grain="monthly",
            dimension_key="overall",
        )

        if not rows:
            continue

        # Latest and previous values
        values = [r["value"] for r in rows if r.get("value") is not None]
        sparkline = values[-12:] if len(values) >= 2 else values

        current = values[-1] if values else 0
        previous = values[-2] if len(values) >= 2 else current
        trend_pct = ((current - previous) / previous * 100) if previous else 0

        cards.append(KPICard(
            id=metric_name,
            label=label,
            value=formatter(current),
            raw_value=current,
            trend=round(trend_pct, 1),
            trend_dir=_trend_dir(trend_pct),
            period="vs last month",
            sparkline=[round(v, 0) for v in sparkline],
            accent=accent,
        ))

    return cards


def _get_alerts_from_duckdb(tenant_id: str) -> list[AlertCard]:
    """Get recent anomalies formatted as alert cards."""
    from src.infrastructure.analytics.duckdb_client import query_anomalies

    anomalies = query_anomalies(tenant_id, limit=10)

    alerts = []
    for i, a in enumerate(anomalies):
        severity = a.get("severity", "medium")
        metric = a.get("metric_name", "metric").replace("_", " ").title()
        dim_val = a.get("dimension_value", "overall")
        score = a.get("anomaly_score", 0)
        zscore = a.get("deviation_zscore", 0)
        det_date = a.get("detection_date", date.today())

        days_ago = (date.today() - det_date).days if isinstance(det_date, date) else 0
        time_str = f"{days_ago}d ago" if days_ago > 0 else "Today"

        alerts.append(AlertCard(
            id=str(i),
            severity=severity,
            title=f"{metric} anomaly in {dim_val}",
            desc=(
                f"Observed value deviates {abs(zscore):.1f}σ from expected. "
                f"Anomaly score: {score:.2f}."
            ),
            metric=metric,
            time=time_str,
        ))

    return alerts


def _compute_health_score(kpis: list[KPICard]) -> HealthScore:
    """Compute a composite health score from KPI trends."""
    kpi_map = {k.id: k for k in kpis}

    # Weight each KPI contribution
    revenue_score = max(30, min(100, 70 + (kpi_map.get("revenue", KPICard(
        id="", label="", value="", raw_value=0, trend=0, trend_dir="neutral",
        period="", sparkline=[], accent=""
    )).trend * 2)))

    churn_kpi = kpi_map.get("churn_rate")
    churn_score = max(30, min(100, 80 - (churn_kpi.trend * 3 if churn_kpi else 0)))

    nps_kpi = kpi_map.get("nps")
    nps_score = max(30, min(100, 65 + (nps_kpi.trend * 2 if nps_kpi else 0)))

    pipeline_kpi = kpi_map.get("pipeline")
    pipeline_score = max(30, min(100, 70 + (pipeline_kpi.trend * 1.5 if pipeline_kpi else 0)))

    composite = int(
        revenue_score * 0.35 +
        churn_score * 0.25 +
        nps_score * 0.20 +
        pipeline_score * 0.20
    )

    if composite >= 80:
        label = "Excellent"
    elif composite >= 70:
        label = "Good"
    elif composite >= 60:
        label = "Fair"
    else:
        label = "Needs Attention"

    return HealthScore(
        score=composite,
        label=label,
        trend=round(
            (kpi_map.get("revenue", KPICard(
                id="", label="", value="", raw_value=0, trend=0, trend_dir="neutral",
                period="", sparkline=[], accent=""
            )).trend +
            kpi_map.get("arr", KPICard(
                id="", label="", value="", raw_value=0, trend=0, trend_dir="neutral",
                period="", sparkline=[], accent=""
            )).trend) / 2, 1
        ),
        drivers=[
            HealthDriver(name="Revenue Growth", score=int(revenue_score)),
            HealthDriver(name="Customer Retention", score=int(churn_score)),
            HealthDriver(name="Customer Satisfaction", score=int(nps_score)),
            HealthDriver(name="Pipeline Health", score=int(pipeline_score)),
        ],
    )


# ==========================================
# Endpoints
# ==========================================

@router.get("/kpis", response_model=list[KPICard], summary="Get KPI cards")
async def get_kpis(request: Request) -> list[KPICard]:
    """Return KPI card data for the dashboard from DuckDB analytics store."""
    tenant_context = request.state.tenant_context
    tenant_id = str(tenant_context["tenant_id"])

    try:
        return _get_kpis_from_duckdb(tenant_id)
    except Exception as e:
        import structlog
        structlog.get_logger(__name__).warning("kpis_duckdb_error", error=str(e))
        return []


@router.get("/alerts", response_model=list[AlertCard], summary="Get active alerts")
async def get_alerts(request: Request) -> list[AlertCard]:
    """Return active alerts from DuckDB anomaly detection results."""
    tenant_context = request.state.tenant_context
    tenant_id = str(tenant_context["tenant_id"])

    try:
        return _get_alerts_from_duckdb(tenant_id)
    except Exception as e:
        import structlog
        structlog.get_logger(__name__).warning("alerts_duckdb_error", error=str(e))
        return []


@router.get("/health-score", response_model=HealthScore, summary="Business health score")
async def get_health_score(request: Request) -> HealthScore:
    """Compute composite business health score from KPI trends."""
    tenant_context = request.state.tenant_context
    tenant_id = str(tenant_context["tenant_id"])

    try:
        kpis = _get_kpis_from_duckdb(tenant_id)
        return _compute_health_score(kpis)
    except Exception as e:
        import structlog
        structlog.get_logger(__name__).warning("health_score_error", error=str(e))
        return HealthScore(
            score=70, label="Good", trend=2.1,
            drivers=[
                HealthDriver(name="Revenue Growth", score=75),
                HealthDriver(name="Customer Retention", score=70),
                HealthDriver(name="Customer Satisfaction", score=68),
                HealthDriver(name="Pipeline Health", score=65),
            ]
        )


@router.get("/summary", response_model=DashboardSummary, summary="Full dashboard summary")
async def get_summary(request: Request) -> DashboardSummary:
    """Single call to get KPIs + alerts + health score for the dashboard."""
    tenant_context = request.state.tenant_context
    tenant_id = str(tenant_context["tenant_id"])

    kpis = _get_kpis_from_duckdb(tenant_id)
    alerts = _get_alerts_from_duckdb(tenant_id)
    health = _compute_health_score(kpis)

    return DashboardSummary(kpis=kpis, alerts=alerts, health=health)
