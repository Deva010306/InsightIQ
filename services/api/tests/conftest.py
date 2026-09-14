"""
InsightIQ — Test Configuration & Shared Fixtures
"""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client() -> AsyncClient:
    """Async HTTP client for testing the FastAPI app without a running server."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": "Bearer dev-token"},
    ) as ac:
        yield ac
