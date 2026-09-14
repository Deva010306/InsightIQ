"""
InsightIQ — Core API Service
FastAPI application entrypoint with full middleware stack,
exception handlers, router registration, and lifespan management.
"""
from __future__ import annotations

import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.shared.config import get_settings
from src.shared.exceptions import InsightIQError
from src.shared.logging import configure_logging, get_logger

# Configure logging first — before anything else
configure_logging()
logger = get_logger(__name__)

settings = get_settings()


# ==========================================
# Lifespan — Startup & Shutdown
# ==========================================

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan handler.
    Manages database connections, cache pools, and vector DB clients.
    """
    logger.info(
        "insightiq_api_starting",
        version=settings.app_version,
        environment=settings.app_env,
    )

    # --- Startup ---
    # Initialize database engine (PostgreSQL — optional, app degrades gracefully)
    from src.infrastructure.database.connection import get_engine, ping_database
    get_engine()  # Eagerly creates pool
    pg_ok = await ping_database()
    if pg_ok:
        logger.info("database_connected", status="healthy")
        # Seed PostgreSQL with initial tenant/user/metric data
        try:
            from src.infrastructure.database.seed_pg import seed_postgres
            await seed_postgres()
            
            from src.infrastructure.database.seed_doms import seed_doms_data
            await seed_doms_data()
        except Exception as e:
            logger.warning("postgres_seed_skipped", error=str(e))
    else:
        logger.warning("database_connection_failed", status="degraded",
                       note="Running without PostgreSQL — insights/sessions will not persist")

    # Initialize DuckDB and auto-seed analytics data
    try:
        from src.infrastructure.analytics.seed import run_seed
        run_seed()  # Idempotent — skips if already seeded
        logger.info("duckdb_ready", status="healthy")
    except Exception as e:
        logger.warning("duckdb_seed_failed", error=str(e))

    # Initialize Redis connection pool (optional)
    try:
        import redis.asyncio as aioredis
        app.state.redis = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=settings.redis_pool_size,
        )
        await app.state.redis.ping()
        logger.info("redis_connected", status="healthy")
    except Exception as e:
        logger.warning("redis_connection_failed", error=str(e), status="degraded")
        app.state.redis = None

    # Initialize Qdrant client (optional — vector retrieval degrades gracefully)
    try:
        from qdrant_client import AsyncQdrantClient
        app.state.qdrant = AsyncQdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key or None,
        )
        collections = await app.state.qdrant.get_collections()
        logger.info("qdrant_connected", collections=len(collections.collections), status="healthy")
    except Exception as e:
        logger.warning("qdrant_connection_failed", error=str(e), status="degraded")
        app.state.qdrant = None

    logger.info("insightiq_api_started")
    yield

    # --- Shutdown ---
    logger.info("insightiq_api_shutting_down")

    from src.infrastructure.database.connection import dispose_engine
    await dispose_engine()

    if hasattr(app.state, "redis") and app.state.redis:
        await app.state.redis.aclose()

    if hasattr(app.state, "qdrant") and app.state.qdrant:
        await app.state.qdrant.close()

    logger.info("insightiq_api_stopped")


# ==========================================
# FastAPI Application
# ==========================================

app = FastAPI(
    title="InsightIQ API",
    description=(
        "AI-Powered Business Intelligence Platform — "
        "Evidence-backed insights, root cause analysis, forecasts, "
        "and AI-driven recommendations."
    ),
    version=settings.app_version,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
    lifespan=lifespan,
)


# ==========================================
# Middleware Stack
# ==========================================

# 1. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time-Ms", "X-Confidence-Score"],
)

# 2. Tenant Context (auth + isolation)
from src.middleware.tenant import TenantContextMiddleware  # noqa: E402
app.add_middleware(TenantContextMiddleware)


# ==========================================
# Exception Handlers
# ==========================================

@app.exception_handler(InsightIQError)
async def insightiq_error_handler(request: Request, exc: InsightIQError) -> JSONResponse:
    """Convert domain exceptions to consistent JSON error responses."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

    logger.warning(
        "domain_error",
        error_code=exc.error_code,
        message=exc.message,
        status_code=exc.status_code,
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.error_code,
            "message": exc.message,
            "details": exc.details or {},
            "request_id": request_id,
            "retryable": exc.retryable,
        },
        headers={"X-Request-ID": request_id},
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for unexpected errors — never expose stack traces."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

    logger.exception("unexpected_error", exc_info=exc)

    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred. Please try again later.",
            "request_id": request_id,
            "retryable": True,
        },
        headers={"X-Request-ID": request_id},
    )


# ==========================================
# API Routers
# ==========================================

from src.interfaces.api.v1.health import router as health_router              # noqa: E402
from src.interfaces.api.v1.insights import router as insights_router          # noqa: E402
from src.interfaces.api.v1.advisor import router as advisor_router            # noqa: E402
from src.interfaces.api.v1.metrics import router as metrics_router            # noqa: E402
from src.interfaces.api.v1.auth import router as auth_router                  # noqa: E402
from src.interfaces.api.v1.dashboard import router as dashboard_router        # noqa: E402
from src.interfaces.api.v1.recommendations import router as recs_router       # noqa: E402

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(insights_router)
app.include_router(advisor_router)
app.include_router(metrics_router)
app.include_router(recs_router)


# ==========================================
# Root
# ==========================================

@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {
        "service": "InsightIQ API",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/v1/health",
    }
