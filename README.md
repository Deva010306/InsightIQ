# InsightIQ — AI-Powered Business Intelligence Platform

> An AI Business Advisor that explains business performance, predicts what comes next, simulates strategic options, and recommends evidence-backed actions.

## Project Structure

```
insightiq/
├── docs/                        # Architecture & design documents
├── infrastructure/
│   └── docker/                  # Docker Compose for local dev
│       ├── docker-compose.yml
│       ├── postgres/init.sql
│       └── clickhouse/
├── services/
│   ├── api/                     # Core FastAPI REST API
│   ├── ai-orchestrator/         # LangGraph multi-agent system
│   ├── ingestion-worker/        # Data ingestion & processing
│   ├── analytics-worker/        # Forecasting, anomaly detection, ML
│   └── llm-gateway/             # LLM provider abstraction
├── packages/
│   ├── contracts/               # Shared Pydantic schemas & OpenAPI
│   ├── config/                  # Shared config primitives
│   └── telemetry/               # OpenTelemetry setup
└── .env.example                 # Root env template
```

## Quick Start (Local Development)

### Prerequisites
- Docker Desktop ≥ 4.x
- Python 3.12+
- `uv` package manager: `pip install uv`

### 1. Start the database infrastructure
```bash
cd infrastructure/docker
cp .env.docker .env
docker-compose up -d
```

Verify all services are running:
```bash
docker-compose ps
```

### 2. Start the Core API
```bash
cd services/api
uv sync
cp .env.example .env   # Fill in your values
uv run uvicorn src.main:app --reload --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
Health:   [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 3. Start the AI Orchestrator
```bash
cd services/ai-orchestrator
uv sync
cp .env.example .env
uv run uvicorn src.main:app --reload --port 8001
```

## Local Service Ports

| Service      | Port  | Description                    |
|---|---|---|
| Core API     | 8000  | Main FastAPI REST gateway      |
| AI Orchestrator | 8001 | Agent workflow service       |
| LLM Gateway  | 8002  | Model routing service          |
| PostgreSQL   | 5432  | OLTP database                  |
| ClickHouse   | 8123  | OLAP analytics (HTTP)          |
| ClickHouse   | 9000  | OLAP analytics (native)        |
| Qdrant       | 6333  | Vector database (HTTP)         |
| Qdrant       | 6334  | Vector database (gRPC)         |
| Redis        | 6379  | Cache & queue                  |

## Technology Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI + Python 3.12 |
| Agent Framework | LangGraph |
| OLTP Database | PostgreSQL 16 + pgvector |
| OLAP Database | ClickHouse 24 |
| Vector Database | Qdrant |
| Cache / Queue | Redis 7 |
| Workflow Engine | Temporal |
| Container Runtime | Docker |
| Package Manager | uv |

## Documentation

- [AI Architecture](docs/ai-architecture.md)
- [Software Architecture Document](docs/software-architecture-document.md)
- [SAD Architecture Blueprint](docs/sad-architecture-blueprint.md)
- [Competitive Analysis](docs/competitive-analysis-novelty.md)
- [Backend Architecture Design](docs/insightiq_backend_architecture.md)
