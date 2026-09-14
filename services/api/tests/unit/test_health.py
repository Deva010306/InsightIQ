"""
Test: Health endpoints
"""
import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_liveness(client: AsyncClient):
    """Health liveness endpoint should always return 200."""
    response = await client.get("/api/v1/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.anyio
async def test_root(client: AsyncClient):
    """Root endpoint returns service info."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "InsightIQ API"
