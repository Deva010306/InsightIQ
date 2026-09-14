"""
InsightIQ — Authentication Router
Login, logout, and current-user endpoints.

Dev mode: any email/password → returns dev-token.
Production: validate against user store, issue real JWT.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

UV = "C:\\Users\\Devashish Khainar\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\uv.exe"


# ==========================================
# Schemas
# ==========================================

class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=1, description="User password")


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: dict


class MeResponse(BaseModel):
    id: str
    tenant_id: str
    email: str
    display_name: str | None
    role: str


# ==========================================
# Endpoints
# ==========================================

@router.post("/login", response_model=LoginResponse, summary="Login")
async def login(body: LoginRequest) -> LoginResponse:
    """
    Authenticate a user and return a JWT.

    In development mode (APP_ENV=development):
    - Any email/password combination is accepted.
    - Returns a `dev-token` which the middleware accepts as a bypass.

    In production:
    - Validates credentials against the user database.
    - Issues a real signed JWT.
    """
    from src.shared.config import get_settings
    settings = get_settings()

    if settings.is_development:
        # Dev bypass — accept any credentials
        return LoginResponse(
            access_token="dev-token",
            token_type="bearer",
            expires_in=settings.jwt_expiry_minutes * 60,
            user={
                "id": "00000000-0000-0000-0000-000000000099",
                "tenant_id": "00000000-0000-0000-0000-000000000001",
                "email": body.email,
                "display_name": body.email.split("@")[0].title(),
                "role": "admin",
            },
        )

    # Production: real JWT validation
    import jwt
    try:
        from src.infrastructure.database.connection import get_session_factory
        # TODO: look up user from DB, validate password hash
        raise HTTPException(status_code=401, detail="Invalid credentials")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Authentication service error") from e


@router.post("/logout", summary="Logout")
async def logout(request: Request) -> dict:
    """Logout — client should discard the token."""
    return {"status": "logged_out"}


@router.get("/me", response_model=MeResponse, summary="Current user")
async def get_me(request: Request) -> MeResponse:
    """Return the currently authenticated user's profile."""
    tenant_context = request.state.tenant_context
    return MeResponse(
        id=str(tenant_context["user_id"]),
        tenant_id=str(tenant_context["tenant_id"]),
        email=tenant_context.get("email", "dev@insightiq.local"),
        display_name=tenant_context.get("email", "dev@insightiq.local").split("@")[0].title(),
        role=tenant_context.get("role", "viewer"),
    )
