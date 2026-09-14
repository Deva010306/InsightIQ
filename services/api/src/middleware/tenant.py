"""
InsightIQ — Tenant Context Middleware
Resolves tenant context from JWT on every request.
Enforces tenant isolation — no request proceeds without a valid tenant.
"""
from __future__ import annotations

import time
from uuid import UUID

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from src.shared.exceptions import AuthenticationError, TenantNotFoundError

logger = structlog.get_logger(__name__)

# Paths that don't require tenant context
PUBLIC_PATHS = {
    "/api/v1/health",
    "/api/v1/health/ready",
    "/docs",
    "/openapi.json",
    "/redoc",
}


class TenantContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware that:
    1. Validates JWT token
    2. Resolves tenant and user context
    3. Injects tenant context into request.state
    4. Sets structlog context variables for all log entries in this request
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip public paths
        if request.url.path in PUBLIC_PATHS:
            return await call_next(request)

        start_time = time.monotonic()
        request_id = request.headers.get("X-Request-ID", str(__import__("uuid").uuid4()))

        # Bind request context to all logs in this request
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        try:
            # Extract and validate token
            tenant_context = await self._resolve_tenant_context(request)
            request.state.tenant_context = tenant_context
            request.state.request_id = request_id

            # Add tenant to log context
            structlog.contextvars.bind_contextvars(
                tenant_id=str(tenant_context.get("tenant_id", "")),
                user_id=str(tenant_context.get("user_id", "")),
            )

            response = await call_next(request)

            # Add correlation headers to response
            response.headers["X-Request-ID"] = request_id
            duration_ms = int((time.monotonic() - start_time) * 1000)
            response.headers["X-Response-Time-Ms"] = str(duration_ms)

            logger.info(
                "request_completed",
                status_code=response.status_code,
                duration_ms=duration_ms,
            )

            return response

        except (AuthenticationError, TenantNotFoundError) as e:
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "code": e.error_code,
                    "message": e.message,
                    "request_id": request_id,
                    "retryable": e.retryable,
                },
                headers={"X-Request-ID": request_id},
            )

    async def _resolve_tenant_context(self, request: Request) -> dict:
        """
        Extract JWT, validate it, and resolve tenant/user context.
        In MVP: simple JWT validation.
        In enterprise: Auth0/WorkOS token introspection + SCIM.
        """
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            raise AuthenticationError("Missing or invalid Authorization header")

        token = auth_header.removeprefix("Bearer ")

        # TODO: Replace with real JWT validation
        # For now, decode and return mock context for development
        try:
            from src.shared.config import get_settings
            settings = get_settings()

            if settings.is_development and token == "dev-token":
                # Development bypass — remove in production!
                return {
                    "tenant_id": UUID("00000000-0000-0000-0000-000000000001"),
                    "user_id": UUID("00000000-0000-0000-0000-000000000099"),
                    "role": "admin",
                    "email": "dev@insightiq.local",
                }

            # Real JWT decoding (to be wired to auth provider)
            import jwt  # PyJWT — fully typed, actively maintained
            payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
            return {
                "tenant_id": UUID(payload["tenant_id"]),
                "user_id": UUID(payload["sub"]),
                "role": payload.get("role", "viewer"),
                "email": payload.get("email", ""),
            }
        except Exception as e:
            raise AuthenticationError(f"Token validation failed: {e}") from e
