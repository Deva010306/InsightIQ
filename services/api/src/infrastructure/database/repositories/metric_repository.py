"""
InsightIQ — Metric Repository
Tenant-scoped CRUD for the metric_definitions table.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.models import MetricDefinition


class MetricRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_metrics(
        self,
        tenant_id: uuid.UUID,
        *,
        certified_only: bool = False,
        search: str | None = None,
    ) -> list[MetricDefinition]:
        q = select(MetricDefinition).where(MetricDefinition.tenant_id == tenant_id)
        if certified_only:
            q = q.where(MetricDefinition.is_certified.is_(True))
        if search:
            q = q.where(MetricDefinition.display_name.ilike(f"%{search}%"))
        q = q.order_by(MetricDefinition.display_name)
        result = await self._session.execute(q)
        return list(result.scalars().all())

    async def get_by_id(self, tenant_id: uuid.UUID, metric_id: uuid.UUID) -> MetricDefinition | None:
        q = select(MetricDefinition).where(
            MetricDefinition.tenant_id == tenant_id,
            MetricDefinition.id == metric_id,
        )
        result = await self._session.execute(q)
        return result.scalar_one_or_none()
