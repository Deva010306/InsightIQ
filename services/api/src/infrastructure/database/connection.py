"""
InsightIQ — Database Connection & Session Management
Async SQLAlchemy with PostgreSQL, tenant isolation via session variable.
"""
from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from uuid import UUID

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from src.shared.config import get_settings
from src.shared.logging import get_logger

logger = get_logger(__name__)


def create_engine(database_url: str | None = None) -> AsyncEngine:
    """
    Create the async SQLAlchemy engine.
    Uses NullPool in test environments for clean isolation.
    """
    settings = get_settings()
    url = database_url or settings.database_url

    return create_async_engine(
        url,
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
        echo=settings.database_echo,
        future=True,
        # JSON serializer — use orjson for performance
        json_serializer=lambda obj: __import__("orjson").dumps(obj).decode(),
        json_deserializer=lambda s: __import__("orjson").loads(s),
    )


# Module-level engine and session factory
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        _engine = create_engine()
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for database sessions.
    Automatically closes session after each request.

    Usage:
        db: AsyncSession = Depends(get_db_session)
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def tenant_scoped_session(
    tenant_id: UUID,
) -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager that sets the PostgreSQL session variable for RLS.
    All queries within this context are automatically scoped to the tenant.

    This enforces the Row Level Security policies defined in init.sql.
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        # Set tenant context for RLS — this is the key security enforcement
        await session.execute(
            __import__("sqlalchemy").text(
                "SELECT set_config('app.current_tenant_id', :tenant_id, TRUE)"
            ),
            {"tenant_id": str(tenant_id)},
        )
        logger.debug("tenant_session_started", tenant_id=str(tenant_id))
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def ping_database() -> bool:
    """Health check — verify database connectivity."""
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        return True
    except Exception as e:
        logger.error("database_ping_failed", error=str(e))
        return False


async def dispose_engine() -> None:
    """Dispose the engine pool — call on application shutdown."""
    global _engine
    if _engine:
        await _engine.dispose()
        logger.info("database_engine_disposed")
