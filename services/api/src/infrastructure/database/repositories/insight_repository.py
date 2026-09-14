"""
InsightIQ — Insight Repository
Tenant-scoped CRUD for the insights table.
"""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.models import Insight, InsightRun


class InsightRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_insights(
        self,
        tenant_id: uuid.UUID,
        *,
        insight_type: str | None = None,
        severity: str | None = None,
        status: str = "active",
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Insight], int]:
        """List insights with filters and pagination. Returns (items, total)."""
        q = select(Insight).where(Insight.tenant_id == tenant_id)

        if insight_type:
            q = q.where(Insight.insight_type == insight_type)
        if severity:
            q = q.where(Insight.severity == severity)
        if status:
            q = q.where(Insight.status == status)

        # Count total
        count_q = select(func.count()).select_from(q.subquery())
        total = (await self._session.execute(count_q)).scalar_one()

        # Paginate
        q = q.order_by(Insight.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await self._session.execute(q)
        return list(result.scalars().all()), total

    async def get_by_id(self, tenant_id: uuid.UUID, insight_id: uuid.UUID) -> Insight | None:
        q = select(Insight).where(
            Insight.tenant_id == tenant_id,
            Insight.id == insight_id,
        )
        result = await self._session.execute(q)
        return result.scalar_one_or_none()

    async def create_run(self, tenant_id: uuid.UUID, trigger_type: str = "manual") -> InsightRun:
        run = InsightRun(tenant_id=tenant_id, trigger_type=trigger_type, status="queued")
        self._session.add(run)
        await self._session.flush()
        await self._session.refresh(run)
        return run
