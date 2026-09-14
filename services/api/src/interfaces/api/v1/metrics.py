"""
InsightIQ — Metrics Router
Certified metric catalog + time-series values from DuckDB.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/metrics", tags=["Metrics"])


class MetricDefinitionResponse(BaseModel):
    id: uuid.UUID
    name: str
    display_name: str
    description: str | None
    formula: str
    time_grain: str
    dimensions: list[str]
    is_certified: bool
    owner: str | None
    pii_sensitivity: str
    synonyms: list[str]
    tags: list[str]
    version: int
    created_at: datetime


class MetricValueRequest(BaseModel):
    date_from: date
    date_to: date
    dimensions: dict[str, str] | None = None
    time_grain: str = "monthly"


class MetricValuePoint(BaseModel):
    date: date
    value: float
    dimension_key: str | None
    dimension_value: str | None


class ForecastPoint(BaseModel):
    forecast_date: date
    scenario_baseline: float
    scenario_optimistic: float
    scenario_conservative: float
    lower_80: float
    upper_80: float
    model_type: str


@router.get("/", response_model=list[MetricDefinitionResponse], summary="List metric catalog")
async def list_metrics(
    request: Request,
    certified_only: bool = Query(False),
    search: str | None = Query(None),
) -> list[MetricDefinitionResponse]:
    """List all metrics in the semantic catalog for this tenant."""
    tenant_context = request.state.tenant_context
    tenant_id: uuid.UUID = tenant_context["tenant_id"]

    try:
        from src.infrastructure.database.connection import tenant_scoped_session
        from src.infrastructure.database.repositories import MetricRepository

        async with tenant_scoped_session(tenant_id) as db:
            repo = MetricRepository(db)
            metrics = await repo.list_metrics(
                tenant_id,
                certified_only=certified_only,
                search=search,
            )
            return [
                MetricDefinitionResponse(
                    id=m.id,
                    name=m.name,
                    display_name=m.display_name,
                    description=m.description,
                    formula=m.formula,
                    time_grain=m.time_grain,
                    dimensions=m.dimensions or [],
                    is_certified=m.is_certified,
                    owner=m.owner,
                    pii_sensitivity=m.pii_sensitivity,
                    synonyms=m.synonyms or [],
                    tags=m.tags or [],
                    version=m.version,
                    created_at=m.created_at,
                )
                for m in metrics
            ]
    except Exception as e:
        import structlog
        structlog.get_logger(__name__).warning("metrics_db_fallback", error=str(e))
        return []


@router.get("/{metric_id}", response_model=MetricDefinitionResponse, summary="Get metric definition")
async def get_metric(metric_id: uuid.UUID, request: Request) -> MetricDefinitionResponse:
    """Get full metric definition."""
    tenant_context = request.state.tenant_context
    tenant_id: uuid.UUID = tenant_context["tenant_id"]

    try:
        from src.infrastructure.database.connection import tenant_scoped_session
        from src.infrastructure.database.repositories import MetricRepository

        async with tenant_scoped_session(tenant_id) as db:
            repo = MetricRepository(db)
            metric = await repo.get_by_id(tenant_id, metric_id)
            if not metric:
                raise HTTPException(status_code=404, detail=f"Metric {metric_id} not found")
            return MetricDefinitionResponse(
                id=metric.id, name=metric.name, display_name=metric.display_name,
                description=metric.description, formula=metric.formula,
                time_grain=metric.time_grain, dimensions=metric.dimensions or [],
                is_certified=metric.is_certified, owner=metric.owner,
                pii_sensitivity=metric.pii_sensitivity, synonyms=metric.synonyms or [],
                tags=metric.tags or [], version=metric.version, created_at=metric.created_at,
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail=f"Metric {metric_id} not found")


@router.post("/{metric_id}/values", response_model=list[MetricValuePoint], summary="Query metric values")
async def query_metric_values(
    metric_id: uuid.UUID,
    query: MetricValueRequest,
    request: Request,
) -> list[MetricValuePoint]:
    """Query historical metric values from DuckDB analytics store."""
    tenant_context = request.state.tenant_context
    tenant_id: uuid.UUID = tenant_context["tenant_id"]

    # Get metric name from DB
    metric_name: str | None = None
    try:
        from src.infrastructure.database.connection import tenant_scoped_session
        from src.infrastructure.database.repositories import MetricRepository

        async with tenant_scoped_session(tenant_id) as db:
            repo = MetricRepository(db)
            metric = await repo.get_by_id(tenant_id, metric_id)
            if metric:
                metric_name = metric.name
    except Exception:
        pass

    if not metric_name:
        raise HTTPException(status_code=404, detail=f"Metric {metric_id} not found")

    # Query DuckDB
    from src.infrastructure.analytics.duckdb_client import query_metric_snapshots

    dim_key = None
    dim_val = None
    if query.dimensions:
        items = list(query.dimensions.items())
        if items:
            dim_key, dim_val = items[0]

    data = query_metric_snapshots(
        tenant_id=str(tenant_id),
        metric_name=metric_name,
        date_from=query.date_from,
        date_to=query.date_to,
        dimension_key=dim_key,
        time_grain=query.time_grain,
    )

    return [
        MetricValuePoint(
            date=row["date"],
            value=row["value"],
            dimension_key=row.get("dimension_key"),
            dimension_value=row.get("dimension_value"),
        )
        for row in data
    ]


@router.get("/{metric_name}/forecast", response_model=list[ForecastPoint], summary="Get metric forecast")
async def get_metric_forecast(
    metric_name: str,
    request: Request,
    horizon_days: int = Query(90, ge=7, le=365),
) -> list[ForecastPoint]:
    """Get 90-day forecast from DuckDB forecast store."""
    tenant_context = request.state.tenant_context
    tenant_id: uuid.UUID = tenant_context["tenant_id"]

    from src.infrastructure.analytics.duckdb_client import query_forecasts
    data = query_forecasts(
        tenant_id=str(tenant_id),
        metric_name=metric_name,
        horizon_days=horizon_days,
    )

    return [
        ForecastPoint(
            forecast_date=row["forecast_date"],
            scenario_baseline=row["scenario_baseline"],
            scenario_optimistic=row["scenario_optimistic"],
            scenario_conservative=row["scenario_conservative"],
            lower_80=row["lower_80"],
            upper_80=row["upper_80"],
            model_type=row["model_type"],
        )
        for row in data
    ]
