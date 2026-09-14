"""
InsightIQ — Advisor Repository
Tenant-scoped CRUD for advisor_sessions and advisor_messages.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.database.models import AdvisorSession, AdvisorMessage


class AdvisorRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_session(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        title: str | None = None,
    ) -> AdvisorSession:
        session = AdvisorSession(
            tenant_id=tenant_id,
            user_id=user_id,
            title=title or "New Conversation",
            status="active",
        )
        self._session.add(session)
        await self._session.flush()
        await self._session.refresh(session)
        return session

    async def get_session(self, tenant_id: uuid.UUID, session_id: uuid.UUID) -> AdvisorSession | None:
        q = select(AdvisorSession).where(
            AdvisorSession.tenant_id == tenant_id,
            AdvisorSession.id == session_id,
        )
        result = await self._session.execute(q)
        return result.scalar_one_or_none()

    async def get_messages(
        self, tenant_id: uuid.UUID, session_id: uuid.UUID
    ) -> list[AdvisorMessage]:
        q = (
            select(AdvisorMessage)
            .where(
                AdvisorMessage.tenant_id == tenant_id,
                AdvisorMessage.session_id == session_id,
            )
            .order_by(AdvisorMessage.created_at.asc())
        )
        result = await self._session.execute(q)
        return list(result.scalars().all())

    async def save_message(
        self,
        tenant_id: uuid.UUID,
        session_id: uuid.UUID,
        role: str,
        content: str,
        *,
        evidence_panel: dict | None = None,
        confidence_score: float | None = None,
        model_provider: str | None = None,
        model_version: str | None = None,
        latency_ms: int | None = None,
    ) -> AdvisorMessage:
        message = AdvisorMessage(
            tenant_id=tenant_id,
            session_id=session_id,
            role=role,
            content=content,
            evidence_panel=evidence_panel,
            confidence_score=confidence_score,
            model_provider=model_provider,
            model_version=model_version,
            latency_ms=latency_ms,
        )
        self._session.add(message)
        await self._session.flush()
        await self._session.refresh(message)
        return message

    async def archive_session(self, tenant_id: uuid.UUID, session_id: uuid.UUID) -> None:
        from sqlalchemy import update
        q = (
            update(AdvisorSession)
            .where(AdvisorSession.tenant_id == tenant_id, AdvisorSession.id == session_id)
            .values(status="archived")
        )
        await self._session.execute(q)
