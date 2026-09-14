"""
InsightIQ — Core API Service
Pydantic-based settings with environment variable support.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    app_env: Literal["development", "staging", "production"] = "development"
    app_name: str = "InsightIQ API"
    app_version: str = "0.1.0"
    debug: bool = False
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # --- API Server ---
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_secret_key: str = Field(..., min_length=32)

    # --- CORS ---
    # Store as str internally; validator splits comma-sep OR JSON array
    allowed_origins_raw: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        alias="ALLOWED_ORIGINS",
    )

    @property
    def allowed_origins(self) -> list[str]:
        v = self.allowed_origins_raw.strip()
        # Handle JSON array format: ["a","b"]
        if v.startswith("["):
            import json
            try:
                return json.loads(v)
            except Exception:
                pass
        # Handle comma-separated format
        return [o.strip() for o in v.split(",") if o.strip()]

    # --- PostgreSQL ---
    database_url: str = Field(..., description="Async PostgreSQL DSN")
    database_pool_size: int = 20
    database_max_overflow: int = 10
    database_echo: bool = False

    # --- DuckDB (replaces ClickHouse for local dev — no server needed) ---
    duckdb_path: str = "./data/analytics.duckdb"

    # --- OpenAI ---
    openai_api_key: str | None = None
    openai_embedding_model: str = "text-embedding-3-small"

    # --- Qdrant ---
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str | None = None

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"
    redis_pool_size: int = 20

    # --- Authentication ---
    jwt_secret_key: str = Field(..., min_length=32)
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60

    # --- Internal Service URLs ---
    ai_orchestrator_url: str = "http://localhost:8001"
    ai_orchestrator_api_key: str = ""
    llm_gateway_url: str = "http://localhost:8002"
    llm_gateway_api_key: str = ""

    # --- Object Storage ---
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "us-east-1"
    s3_bucket_name: str = "insightiq-uploads-dev"

    # --- Rate Limiting ---
    rate_limit_per_minute: int = 60
    rate_limit_ai_per_minute: int = 10

    # --- OpenTelemetry ---
    otel_exporter_otlp_endpoint: str = "http://localhost:4317"
    otel_service_name: str = "insightiq-api"
    otel_traces_enabled: bool = True
    otel_metrics_enabled: bool = True

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


@lru_cache
def get_settings() -> Settings:
    """
    Cached settings instance.
    Use as a FastAPI dependency: settings = Depends(get_settings)
    """
    return Settings()  # type: ignore[call-arg]
