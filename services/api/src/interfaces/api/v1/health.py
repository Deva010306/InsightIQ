"""
InsightIQ — Health Check Router
Liveness, readiness, and dependency health checks.
"""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/health", tags=["Health"])


class HealthStatus(BaseModel):
    status: str
    service: str
    version: str
    environment: str
    dependencies: dict[str, str]


class LivenessResponse(BaseModel):
    status: str  # "ok"


@router.get("/", response_model=LivenessResponse, summary="Liveness probe")
async def liveness() -> LivenessResponse:
    """
    Kubernetes liveness probe.
    Returns 200 if the process is alive.
    """
    return LivenessResponse(status="ok")


@router.get("/ready", response_model=HealthStatus, summary="Readiness probe")
async def readiness() -> HealthStatus:
    """
    Kubernetes readiness probe.
    Checks all dependency connections before marking the pod as ready.
    """
    from src.shared.config import get_settings
    from src.infrastructure.database.connection import ping_database

    settings = get_settings()
    deps: dict[str, str] = {}

    # Check PostgreSQL
    try:
        pg_ok = await ping_database()
        deps["postgresql"] = "healthy" if pg_ok else "unhealthy"
    except Exception as e:
        deps["postgresql"] = f"error: {e!s}"

    # Check Redis
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.redis_url, socket_connect_timeout=2)
        await r.ping()
        await r.aclose()
        deps["redis"] = "healthy"
    except Exception as e:
        deps["redis"] = f"error: {e!s}"

    # Check Qdrant
    try:
        from qdrant_client import AsyncQdrantClient
        qclient = AsyncQdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)
        await qclient.get_collections()
        deps["qdrant"] = "healthy"
    except Exception as e:
        deps["qdrant"] = f"error: {e!s}"

    overall = "healthy" if all(v == "healthy" for v in deps.values()) else "degraded"

    return HealthStatus(
        status=overall,
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        dependencies=deps,
    )
