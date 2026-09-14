"""
InsightIQ — Domain Exceptions
Business and application-layer exceptions with HTTP status mapping.
"""
from __future__ import annotations

from uuid import UUID


class InsightIQError(Exception):
    """Base exception for all InsightIQ errors."""
    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"
    retryable: bool = False

    def __init__(self, message: str, details: dict | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


# ==========================================
# Authentication & Authorization
# ==========================================

class AuthenticationError(InsightIQError):
    status_code = 401
    error_code = "AUTHENTICATION_FAILED"
    retryable = False

    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__(message)


class AuthorizationError(InsightIQError):
    status_code = 403
    error_code = "AUTHORIZATION_FAILED"
    retryable = False

    def __init__(self, message: str = "Insufficient permissions") -> None:
        super().__init__(message)


class TenantNotFoundError(InsightIQError):
    status_code = 401
    error_code = "TENANT_NOT_FOUND"
    retryable = False


# ==========================================
# Resource Errors
# ==========================================

class NotFoundError(InsightIQError):
    status_code = 404
    error_code = "NOT_FOUND"
    retryable = False

    def __init__(self, resource: str, resource_id: UUID | str) -> None:
        super().__init__(
            message=f"{resource} not found",
            details={"resource": resource, "id": str(resource_id)},
        )


class ConflictError(InsightIQError):
    status_code = 409
    error_code = "CONFLICT"
    retryable = False


class ValidationError(InsightIQError):
    status_code = 422
    error_code = "VALIDATION_ERROR"
    retryable = False


# ==========================================
# Rate Limiting
# ==========================================

class RateLimitError(InsightIQError):
    status_code = 429
    error_code = "RATE_LIMIT_EXCEEDED"
    retryable = True

    def __init__(self, retry_after_seconds: int = 60) -> None:
        super().__init__(
            message="Rate limit exceeded",
            details={"retry_after_seconds": retry_after_seconds},
        )
        self.retry_after_seconds = retry_after_seconds


# ==========================================
# AI & Data Errors
# ==========================================

class MetricNotCertifiedError(InsightIQError):
    status_code = 400
    error_code = "METRIC_NOT_CERTIFIED"
    retryable = False

    def __init__(self, metric_name: str) -> None:
        super().__init__(
            message=f"Metric '{metric_name}' is not certified for AI use",
            details={"metric_name": metric_name},
        )


class InsufficientDataError(InsightIQError):
    status_code = 422
    error_code = "INSUFFICIENT_DATA"
    retryable = False

    def __init__(self, message: str, required: int, available: int) -> None:
        super().__init__(
            message=message,
            details={"required_rows": required, "available_rows": available},
        )


class AIGenerationError(InsightIQError):
    status_code = 503
    error_code = "AI_GENERATION_FAILED"
    retryable = True

    def __init__(self, message: str = "AI generation failed", provider: str | None = None) -> None:
        super().__init__(message, details={"provider": provider})


class CrossTenantAccessError(InsightIQError):
    """Critical security error — cross-tenant data access attempt."""
    status_code = 403
    error_code = "CROSS_TENANT_ACCESS_DENIED"
    retryable = False

    def __init__(self) -> None:
        super().__init__("Cross-tenant access denied")


# ==========================================
# External Service Errors
# ==========================================

class ExternalServiceError(InsightIQError):
    status_code = 503
    error_code = "EXTERNAL_SERVICE_ERROR"
    retryable = True

    def __init__(self, service: str, message: str) -> None:
        super().__init__(message, details={"service": service})


class DatabaseError(InsightIQError):
    status_code = 503
    error_code = "DATABASE_ERROR"
    retryable = True
