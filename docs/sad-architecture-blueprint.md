# Software Architecture Document

## AI Business Decision Intelligence Platform

Document type: Architecture blueprint  
Version: 0.1  
Date: 2026-07-06  
Scope: High-level architecture, microservices, AI architecture, data flows, components, deployment, authentication, security, cloud, scalability, disaster recovery, and technology justification.

---

## 1. Architecture Goals

The platform is designed to become an enterprise-scale AI decision intelligence SaaS product. Its foundation must support multi-tenancy, governed analytics, autonomous insight generation, explainable AI recommendations, secure data handling, and scalable AI workloads.

Primary architecture goals:

- Provide AI-assisted business decision-making beyond static dashboards.
- Separate product UI, business APIs, data processing, AI orchestration, and infrastructure concerns.
- Support structured and unstructured business data.
- Enforce tenant isolation and role-based access throughout the stack.
- Keep AI outputs explainable, auditable, and evidence-backed.
- Scale from early MVP usage to thousands of businesses and millions to billions of analytical records.

---

## 2. High-Level Architecture

The system follows a modular SaaS architecture with a web application, API layer, domain microservices, AI orchestration layer, data platform, external integrations, and observability stack.

```mermaid
flowchart TB
    Users[Business Users] --> Web[Next.js Web Application]
    Web --> BFF[Web BFF / Server-Side API Layer]
    BFF --> Gateway[API Gateway]

    Gateway --> AuthSvc[Auth and Identity Service]
    Gateway --> TenantSvc[Tenant and Workspace Service]
    Gateway --> DataSvc[Data Source Service]
    Gateway --> InsightSvc[Insight Service]
    Gateway --> AdvisorSvc[AI Advisor Service]
    Gateway --> ForecastSvc[Forecasting Service]
    Gateway --> AdminSvc[Admin and Audit Service]

    DataSvc --> Queue[Workflow and Job Queue]
    InsightSvc --> Queue
    ForecastSvc --> Queue
    AdvisorSvc --> AIOrch[AI Orchestration Layer]

    Queue --> IngestionWorker[Ingestion Workers]
    Queue --> AnalyticsWorker[Analytics Workers]
    Queue --> EmbeddingWorker[Embedding Workers]

    IngestionWorker --> Storage[Object Storage]
    IngestionWorker --> OLTP[(PostgreSQL)]
    IngestionWorker --> OLAP[(ClickHouse)]
    EmbeddingWorker --> Vector[(Vector Store)]

    AIOrch --> LLMGateway[LLM Gateway]
    AIOrch --> Vector
    AIOrch --> OLTP
    AIOrch --> OLAP
    AIOrch --> Storage

    LLMGateway --> ModelProviders[OpenAI / Azure OpenAI / Anthropic / OSS Models]

    Gateway --> Observability[Logs / Metrics / Traces]
    AIOrch --> Observability
    Queue --> Observability
```

### 2.1 Component Communication

| Source | Target | Protocol | Purpose |
|---|---|---|---|
| Browser | Web app | HTTPS | User interaction and UI rendering |
| Web app | API gateway | HTTPS | Authenticated application APIs |
| API gateway | Microservices | HTTP/gRPC internal | Domain service operations |
| Services | PostgreSQL | SQL | Transactional system of record |
| Services | Redis | Redis protocol | Cache, sessions, rate limits |
| Services | Queue/Temporal | Worker protocol | Durable async workflows |
| Workers | Object storage | S3 API | Raw files, exports, artifacts |
| AI orchestrator | Vector store | SQL/API | Semantic retrieval |
| AI orchestrator | LLM gateway | HTTPS/internal API | Model calls, routing, metering |
| LLM gateway | Model providers | HTTPS | LLM and embedding requests |
| All services | Observability stack | OpenTelemetry | Logs, metrics, traces |

---

## 3. Microservice Architecture

The platform should begin as a modular monorepo with independently deployable services where operationally justified. Early development may run some services together, but boundaries should be clear from day one.

```mermaid
flowchart LR
    Gateway[API Gateway] --> Identity[Identity Service]
    Gateway --> Tenant[Tenant Service]
    Gateway --> DataSource[Data Source Service]
    Gateway --> Semantic[Semantic Layer Service]
    Gateway --> Insight[Insight Service]
    Gateway --> Advisor[Advisor Service]
    Gateway --> Forecast[Forecast Service]
    Gateway --> Document[Document Service]
    Gateway --> Audit[Audit Service]
    Gateway --> Billing[Billing and Usage Service]

    DataSource --> Workflow[Workflow Engine]
    Document --> Workflow
    Insight --> Workflow
    Forecast --> Workflow
    Advisor --> AI[AI Orchestrator]

    Workflow --> Workers[Worker Pool]
    Workers --> Datastores[(Operational / Analytical / Vector Stores)]
```

### 3.1 Services

| Service | Responsibility | Owns Data |
|---|---|---|
| Identity Service | User sessions, auth provider integration, invitations | User identity mapping, sessions |
| Tenant Service | Organizations, workspaces, tenant settings | Tenants, workspaces, memberships |
| Data Source Service | Connectors, uploads, sync jobs, schema discovery | Data source metadata |
| Semantic Layer Service | Metrics, dimensions, business entities, formulas | Metric definitions, semantic models |
| Document Service | File metadata, parsing lifecycle, document access | Documents, chunks, extraction status |
| Insight Service | Insight runs, anomalies, root causes, recommendation records | Insight entities and decisions |
| Advisor Service | Advisor sessions, messages, evidence presentation | Conversation metadata |
| Forecast Service | Forecast jobs, model metadata, forecast outputs | Forecast runs and results |
| AI Orchestrator | Agent workflows, RAG, tool calls, reasoning plans | Agent state, traces, memory references |
| LLM Gateway | Model routing, provider abstraction, costs, retries | Provider usage, model policies |
| Audit Service | Immutable audit events and security events | Audit logs |
| Billing and Usage Service | Plans, quotas, token/row/job usage | Metering and billing events |

### 3.2 Service Boundary Rules

- Each service owns its domain model and persistence interface.
- Cross-service access happens through explicit APIs or domain events.
- No service may bypass tenant context.
- AI services may not directly access raw data without scoped tools.
- Audit events are emitted by all services for sensitive actions.
- Shared libraries must contain contracts, telemetry, auth primitives, and utilities only.

---

## 4. AI Architecture

The AI layer is built as a governed multi-agent system. It does not replace deterministic analytics; it orchestrates tools, statistical analysis, semantic retrieval, and LLM reasoning to produce explainable business advice.

```mermaid
flowchart TB
    UserQuestion[User Question / Scheduled Insight Trigger] --> AdvisorAPI[Advisor or Insight API]
    AdvisorAPI --> Supervisor[Supervisor Agent]

    Supervisor --> Context[Context Builder]
    Context --> TenantPolicy[Tenant Policy and Permissions]
    Context --> SemanticLayer[Semantic Metric Catalog]
    Context --> Memory[Conversation and Insight Memory]

    Supervisor --> DataAgent[Data Analyst Agent]
    Supervisor --> RCAAgent[Root Cause Agent]
    Supervisor --> ForecastAgent[Forecast Agent]
    Supervisor --> DocAgent[Document Intelligence Agent]
    Supervisor --> ScenarioAgent[Scenario Simulation Agent]
    Supervisor --> RecommendAgent[Recommendation Agent]
    Supervisor --> GuardrailAgent[Safety and Policy Agent]

    DataAgent --> SQLTool[Governed SQL Tool]
    RCAAgent --> StatsTool[Driver Analysis Tool]
    ForecastAgent --> ForecastTool[Forecasting Tool]
    DocAgent --> RAGTool[RAG Retrieval Tool]
    ScenarioAgent --> SimulationTool[What-If Simulation Tool]
    RecommendAgent --> ActionTool[Action Catalog Tool]

    SQLTool --> OLAP[(ClickHouse)]
    SQLTool --> OLTP[(PostgreSQL)]
    RAGTool --> Vector[(Vector Store)]
    RAGTool --> ObjectStorage[(Object Storage)]
    ForecastTool --> FeatureStore[Feature and Metric Store]

    Supervisor --> LLMGateway[LLM Gateway]
    LLMGateway --> Models[LLM and Embedding Providers]

    GuardrailAgent --> FinalAnswer[Evidence-Backed Answer]
    FinalAnswer --> Audit[AI Trace and Audit Store]
```

### 4.1 AI Design Principles

| Principle | Implementation |
|---|---|
| Evidence-first answers | Every insight must include metric sources, document citations, query references, or computation records. |
| Governed tool use | Agents use approved tenant-scoped tools instead of arbitrary database access. |
| Provider abstraction | Model calls go through the LLM gateway. |
| Human approval | Recommendations do not execute business actions automatically in version 1. |
| Confidence and caveats | Outputs include confidence, assumptions, and data-quality warnings. |
| Prompt-injection resistance | Retrieved documents are treated as untrusted content. |
| Evaluation loop | Prompts, agents, and model outputs are evaluated continuously. |

### 4.2 AI Runtime Flow

```mermaid
sequenceDiagram
    participant User
    participant API as Advisor API
    participant Sup as Supervisor Agent
    participant Policy as Policy Engine
    participant Tools as Governed Tools
    participant LLM as LLM Gateway
    participant Audit

    User->>API: Ask decision question
    API->>Policy: Resolve tenant, role, and data permissions
    Policy-->>API: Allowed scope
    API->>Sup: Start reasoning workflow
    Sup->>Tools: Retrieve metrics, documents, forecasts
    Tools-->>Sup: Evidence and computed results
    Sup->>LLM: Generate reasoning plan and answer draft
    LLM-->>Sup: Draft response
    Sup->>Policy: Validate output safety and access boundaries
    Policy-->>Sup: Approved or blocked
    Sup->>Audit: Store trace, evidence, model usage
    Sup-->>API: Stream answer with citations
    API-->>User: Display answer and evidence panel
```

---

## 5. Data Flow Diagrams

### 5.1 Data Ingestion Flow

```mermaid
flowchart TD
    Source[CSV / XLSX / SaaS Connector / API] --> Upload[Upload or Connector Sync]
    Upload --> RawStorage[Raw Landing Zone in Object Storage]
    Upload --> Job[Create Ingestion Job]
    Job --> Queue[Workflow Queue]
    Queue --> Parser[Parser Worker]
    Parser --> Profile[Schema and Data Quality Profiler]
    Profile --> Classify[PII and Business Entity Classifier]
    Classify --> Normalize[Canonical Business Model Mapper]
    Normalize --> OLTP[(PostgreSQL Metadata)]
    Normalize --> OLAP[(ClickHouse Facts)]
    Normalize --> Semantic[Semantic Layer Suggestions]
    Parser --> Audit[Audit Event]
```

### 5.2 Document Intelligence Flow

```mermaid
flowchart TD
    File[PDF / DOCX / TXT / Feedback Export] --> Store[Object Storage]
    Store --> Parse[Document Parser]
    Parse --> Extract[Text and Metadata Extraction]
    Extract --> Chunk[Chunking Strategy]
    Chunk --> Redact[PII Redaction and Policy Tagging]
    Redact --> Embed[Embedding Worker]
    Embed --> Vector[(Vector Store)]
    Chunk --> DocMeta[(PostgreSQL Document Metadata)]
    Vector --> RAG[RAG Retrieval for Advisor]
```

### 5.3 Insight Generation Flow

```mermaid
flowchart LR
    Schedule[Scheduled or Manual Trigger] --> InsightRun[Create Insight Run]
    InsightRun --> Metrics[Load Certified Metrics]
    Metrics --> Detect[Anomaly and Trend Detection]
    Detect --> Drivers[Root Cause Driver Analysis]
    Drivers --> Forecast[Forecast Impact]
    Forecast --> Recommend[Generate Recommendations]
    Recommend --> Evidence[Attach Evidence]
    Evidence --> Review[Policy and Quality Review]
    Review --> Publish[Publish Insight]
    Publish --> Notify[Notify Users]
```

### 5.4 User Decision Flow

```mermaid
flowchart TD
    User[User Opens Decision Center] --> Insights[Review Prioritized Insights]
    Insights --> Evidence[Open Evidence Panel]
    Evidence --> Ask[Ask Advisor Follow-Up]
    Ask --> AI[AI Reasoning Workflow]
    AI --> Recommendation[Recommended Action]
    Recommendation --> Decision{Accept Recommendation?}
    Decision -->|Yes| Task[Create Action Item / Export]
    Decision -->|No| Feedback[Capture Feedback]
    Task --> Audit[Audit Trail]
    Feedback --> Eval[AI Evaluation Dataset]
```

---

## 6. Component Diagrams

### 6.1 Frontend Component Diagram

```mermaid
flowchart TB
    App[Next.js App Router] --> AuthUI[Auth Screens]
    App --> DecisionCenter[Decision Center]
    App --> AdvisorChat[Advisor Chat]
    App --> EvidencePanel[Evidence Panel]
    App --> DataSources[Data Sources]
    App --> MetricsCatalog[Metrics Catalog]
    App --> Forecasts[Forecast Views]
    App --> ScenarioLab[Scenario Lab]
    App --> Admin[Admin Console]

    AdvisorChat --> StreamingClient[SSE Streaming Client]
    EvidencePanel --> CitationViewer[Citation and Query Viewer]
    DataSources --> UploadClient[Direct Upload Client]
    App --> DesignSystem[Shared UI Design System]
```

### 6.2 Backend Component Diagram

```mermaid
flowchart TB
    API[FastAPI Service] --> Routers[API Routers]
    Routers --> UseCases[Application Use Cases]
    UseCases --> Domain[Domain Services]
    Domain --> Repositories[Repository Interfaces]
    Repositories --> PostgresAdapter[PostgreSQL Adapter]
    Repositories --> ObjectAdapter[Object Storage Adapter]
    Repositories --> QueueAdapter[Workflow Queue Adapter]
    Repositories --> VectorAdapter[Vector Store Adapter]

    API --> AuthMiddleware[Auth Middleware]
    API --> TenantMiddleware[Tenant Context Middleware]
    API --> RateLimit[Rate Limiting]
    API --> Telemetry[Telemetry Middleware]
```

### 6.3 Data Platform Component Diagram

```mermaid
flowchart LR
    Raw[Raw Zone] --> Bronze[Bronze Parsed Data]
    Bronze --> Silver[Silver Normalized Data]
    Silver --> Gold[Gold Business Metrics]
    Gold --> Semantic[Semantic Layer]
    Semantic --> AI[AI Tools]
    Semantic --> UI[Decision UI]

    Raw -. object storage .-> S3[(S3 Compatible Storage)]
    Bronze -. metadata .-> PG[(PostgreSQL)]
    Silver -. facts .-> CH[(ClickHouse)]
    Gold -. aggregates .-> CH
    Semantic -. definitions .-> PG
```

---

## 7. Deployment Architecture

The production deployment should be containerized and cloud-native. MVP may start on managed container services, but the architecture should remain Kubernetes-compatible.

```mermaid
flowchart TB
    Internet[Internet] --> CDN[CDN / WAF]
    CDN --> LB[Load Balancer]
    LB --> Ingress[Kubernetes Ingress]

    subgraph K8s[Kubernetes Cluster]
        Ingress --> WebPods[Web Pods]
        Ingress --> APIPods[API Pods]
        APIPods --> InternalServices[Internal Service Mesh]
        InternalServices --> AdvisorPods[Advisor Service Pods]
        InternalServices --> DataPods[Data Service Pods]
        InternalServices --> InsightPods[Insight Service Pods]
        InternalServices --> LLMGatewayPods[LLM Gateway Pods]
        WorkerPods[Worker Pods] --> Workflow[Temporal Workers]
    end

    APIPods --> Redis[(Managed Redis)]
    APIPods --> Postgres[(Managed PostgreSQL)]
    WorkerPods --> ObjectStorage[(Object Storage)]
    WorkerPods --> ClickHouse[(Managed ClickHouse)]
    AdvisorPods --> Vector[(Managed Vector Store)]
    LLMGatewayPods --> Providers[External Model Providers]

    K8s --> Observability[Observability Platform]
```

### 7.1 Deployment Units

| Unit | Scaling Metric |
|---|---|
| Web app | CPU, memory, request rate |
| API service | Request latency, CPU, DB pool saturation |
| Advisor service | Concurrent sessions, model latency |
| LLM gateway | Token throughput, provider latency |
| Ingestion workers | Queue depth, job duration |
| Embedding workers | Queue depth, embedding provider rate |
| Analytics workers | Job queue depth, CPU, memory |
| Forecast workers | Job duration, CPU/memory |

---

## 8. Authentication Flow

The platform should use OIDC/OAuth for MVP with SAML and SCIM support for enterprise.

```mermaid
sequenceDiagram
    participant User
    participant Web
    participant IdP as Identity Provider
    participant API
    participant Tenant as Tenant Service
    participant Audit

    User->>Web: Open app
    Web->>IdP: Redirect to login
    IdP->>User: Authenticate and MFA if required
    IdP-->>Web: Authorization code
    Web->>IdP: Exchange code for tokens
    IdP-->>Web: ID token and access token
    Web->>API: Request with session/token
    API->>Tenant: Resolve tenant memberships and roles
    Tenant-->>API: Tenant context and permissions
    API->>Audit: Record login/session event
    API-->>Web: Authorized user context
    Web-->>User: Load workspace
```

### 8.1 Authorization Model

```mermaid
flowchart LR
    Request[Incoming Request] --> AuthN[Authenticate User]
    AuthN --> Tenant[Resolve Tenant and Workspace]
    Tenant --> RBAC[Check Role Permissions]
    RBAC --> ABAC[Check Attribute Policies]
    ABAC --> DataPolicy[Apply Row and Column Security]
    DataPolicy --> ToolPolicy[Apply AI Tool Permissions]
    ToolPolicy --> Decision{Allowed?}
    Decision -->|Yes| Execute[Execute Use Case]
    Decision -->|No| Deny[Return 403 and Audit]
```

---

## 9. Security Architecture

Security is enforced across identity, application, data, AI, infrastructure, and operations.

```mermaid
flowchart TB
    Edge[CDN / WAF / DDoS Protection] --> Gateway[API Gateway]
    Gateway --> Auth[Authentication]
    Auth --> Authz[RBAC / ABAC Authorization]
    Authz --> TenantIsolation[Tenant Isolation]
    TenantIsolation --> Services[Application Services]
    Services --> DataSecurity[Database RLS / Encryption / Backups]
    Services --> AISecurity[AI Guardrails / Tool Policies]
    Services --> Audit[Immutable Audit Logs]
    Services --> Secrets[Secret Manager]
    Services --> Monitoring[Security Monitoring]
```

### 9.1 Security Controls

| Layer | Controls |
|---|---|
| Edge | WAF, DDoS protection, TLS, bot controls, IP allowlists for enterprise |
| Application | Secure cookies, CSRF protection, input validation, rate limits |
| API | Tenant context, RBAC, ABAC, idempotency, request signing for webhooks |
| Data | Encryption at rest, row-level security, backups, least-privilege credentials |
| AI | Prompt-injection defense, evidence requirements, model policy enforcement |
| Infrastructure | Private networking, secret manager, image scanning, runtime policies |
| Operations | Audit logs, alerting, incident response, access reviews |

### 9.2 Data Classification

| Classification | Examples | Handling |
|---|---|---|
| Public | Public company metadata | Standard controls |
| Internal | Workspace settings, non-sensitive metrics | Tenant access required |
| Confidential | Revenue, customers, forecasts | Encryption, RBAC, audit |
| Restricted | PII, contracts, payment data | Redaction, limited access, strict audit |

---

## 10. Cloud Architecture

The platform should be cloud-agnostic at the architecture level, with AWS as the reference cloud because of its mature managed data, security, and container services.

```mermaid
flowchart TB
    DNS[Route 53 / DNS] --> CDN[CloudFront / CDN]
    CDN --> WAF[AWS WAF]
    WAF --> ALB[Application Load Balancer]
    ALB --> EKS[EKS Kubernetes Cluster]

    subgraph VPC[Private VPC]
        EKS --> API[API and Web Services]
        EKS --> Workers[Worker Services]
        API --> RDS[(RDS PostgreSQL)]
        API --> ElastiCache[(Redis)]
        Workers --> S3[(S3 Object Storage)]
        Workers --> ClickHouse[(ClickHouse Cloud or Self-Managed)]
        Workers --> Vector[(pgvector / Qdrant)]
        EKS --> Secrets[AWS Secrets Manager]
        EKS --> KMS[AWS KMS]
    end

    EKS --> OTEL[OpenTelemetry Collector]
    OTEL --> Logs[CloudWatch / Grafana / Datadog]
    EKS --> ExternalLLM[External or Private Model Endpoints]
```

### 10.1 Cloud Services

| Capability | AWS Reference | Portable Alternative |
|---|---|---|
| DNS/CDN/WAF | Route 53, CloudFront, AWS WAF | Cloudflare |
| Containers | EKS | GKE, AKS, ECS |
| Relational DB | RDS PostgreSQL / Aurora PostgreSQL | Cloud SQL, Azure Database |
| Object storage | S3 | GCS, Azure Blob, R2, MinIO |
| Cache | ElastiCache Redis | Memorystore, Azure Cache |
| Secrets | AWS Secrets Manager | GCP Secret Manager, Azure Key Vault |
| KMS | AWS KMS | Cloud KMS, Azure Key Vault |
| Queue/workflows | Temporal Cloud or self-hosted | Cloud Tasks, SQS plus workers |
| Observability | CloudWatch plus OpenTelemetry | Datadog, Grafana Cloud |

---

## 11. Scalability Strategy

### 11.1 Scaling Dimensions

| Dimension | Strategy |
|---|---|
| Tenants | Tenant-aware data model, tenant quotas, optional tenant sharding |
| Users | Horizontally scale web/API pods; cache user and permission context |
| Records | Move analytical facts to ClickHouse; partition by tenant and time |
| Documents | Store raw files in object storage; index chunks in vector store |
| AI requests | Queue long tasks, stream responses, route by model complexity |
| Embeddings | Batch embedding jobs with provider rate-limit awareness |
| Forecasting | Async jobs, cached outputs, precomputed feature sets |
| Connectors | Isolated worker pools per connector class and tenant priority |

### 11.2 Growth Architecture

```mermaid
flowchart LR
    MVP[MVP: Modular Services + Postgres + pgvector] --> Growth[Growth: Add ClickHouse + Temporal + Redis Scaling]
    Growth --> Scale[Scale: Kafka/Redpanda + Qdrant + Read Replicas]
    Scale --> Enterprise[Enterprise: Tenant Shards + Dedicated VPC + CMK]
```

### 11.3 Multi-Tenant Scaling Controls

- Tenant quotas for storage, rows, documents, tokens, jobs, and users.
- Per-tenant rate limits at API gateway and LLM gateway.
- Queue priorities by tenant plan.
- Query timeouts and maximum scanned rows.
- Separate worker pools for ingestion, analytics, embeddings, and AI.
- Dedicated collections or databases for high-value enterprise tenants.
- Model routing policies by cost, latency, data sensitivity, and task type.

---

## 12. Disaster Recovery

### 12.1 Recovery Objectives

| System Area | RPO | RTO |
|---|---:|---:|
| PostgreSQL transactional data | 5 minutes | 1 hour |
| Object storage | Near zero with versioning | 1 hour |
| Audit logs | Near zero | 1 hour |
| ClickHouse analytics | 15 minutes | 4 hours |
| Vector indexes | 24 hours if rebuildable | 8 hours |
| Redis cache | Best effort | 30 minutes |
| AI workflow state | 5 minutes | 2 hours |

### 12.2 DR Architecture

```mermaid
flowchart LR
    Primary[Primary Region] --> Backup[Encrypted Backups]
    Primary --> Replicas[Cross-Region Replicas]
    Backup --> DR[Disaster Recovery Region]
    Replicas --> DR

    subgraph Primary
        PG1[(PostgreSQL Primary)]
        S31[(Object Storage)]
        CH1[(ClickHouse)]
        K81[Kubernetes]
    end

    subgraph DR
        PG2[(PostgreSQL Restored/Replica)]
        S32[(Replicated Object Storage)]
        CH2[(Analytics Restore)]
        K82[Kubernetes Standby]
    end
```

### 12.3 Disaster Recovery Practices

- Enable point-in-time recovery for PostgreSQL.
- Use versioned object storage with lifecycle policies.
- Replicate critical buckets across regions.
- Store infrastructure as code in version control.
- Keep container images in replicated registries.
- Test restore procedures quarterly.
- Run backup integrity checks automatically.
- Define incident severity levels and communication templates.
- Maintain a manual emergency access process with audit logging.

---

## 13. Technology Justification

| Area | Technology | Justification |
|---|---|---|
| Frontend | Next.js + TypeScript | Strong React ecosystem, server rendering, routing, API integration, enterprise maintainability. |
| UI system | Tailwind CSS + Radix/shadcn-style components | Fast accessible UI delivery with design-system consistency. |
| Backend | FastAPI + Python | Excellent for AI/ML workloads, async APIs, typed validation, OpenAPI generation. |
| Domain modeling | Pydantic + SQLAlchemy | Strong validation, clean data models, mature database access. |
| Primary database | PostgreSQL | Reliable transactional store, JSON support, indexing, partitioning, RLS, strong ecosystem. |
| Analytics database | ClickHouse | High-performance analytical queries over large event and metric datasets. |
| Vector search | pgvector initially, Qdrant at scale | pgvector simplifies MVP operations; Qdrant provides dedicated vector search scaling. |
| Cache | Redis | Low-latency caching, rate limits, distributed locks, ephemeral state. |
| Object storage | S3-compatible storage | Durable, scalable raw file and artifact storage. |
| Workflows | Temporal | Durable long-running workflows, retries, visibility, and replay for ingestion and AI jobs. |
| AI orchestration | LangGraph | Stateful multi-agent workflows, human-in-the-loop path, memory and persistence model. |
| Model access | LLM Gateway | Centralized model routing, cost control, retries, audit, and provider abstraction. |
| Containers | Docker | Consistent local development, CI, and production packaging. |
| Orchestration | Kubernetes | Standard horizontal scaling, service isolation, rolling deployments, workload portability. |
| Infrastructure | Terraform | Reproducible cloud infrastructure and environment parity. |
| CI/CD | GitHub Actions | Repository-native automation for testing, scanning, building, and deployment. |
| Observability | OpenTelemetry + Grafana/Datadog | Vendor-neutral instrumentation with strong production monitoring options. |
| Authentication | Managed OIDC/SAML provider | Reduces security burden and supports enterprise identity requirements. |
| Secrets | Cloud secret manager | Centralized secret storage, rotation, and auditability. |

### 13.1 Key Tradeoffs

| Decision | Benefit | Tradeoff |
|---|---|---|
| Modular monorepo first | Faster product iteration and shared contracts | Requires discipline to preserve service boundaries |
| PostgreSQL plus ClickHouse | Correct transactional data and fast analytics | Two database systems to operate |
| pgvector first | Faster MVP and simpler deployment | May need migration to Qdrant for large-scale vector workloads |
| Temporal for workflows | Durable, observable async processing | More operational complexity than a simple queue |
| Managed auth provider | Faster secure launch | Vendor dependency and recurring cost |
| Kubernetes-compatible deployment | Enterprise scalability and portability | Higher complexity than basic PaaS hosting |

---

## 14. Summary Architecture Decision

The recommended foundation is a cloud-native, multi-tenant, AI-first SaaS architecture:

- Next.js frontend for the decision workspace.
- FastAPI services for domain APIs.
- PostgreSQL as transactional source of truth.
- ClickHouse for analytical workloads.
- pgvector for MVP semantic retrieval, with Qdrant as the scale path.
- Object storage for files and artifacts.
- Temporal-backed workers for ingestion, insight generation, embeddings, and forecasting.
- LangGraph-based multi-agent AI orchestration.
- LLM gateway for model routing, governance, cost control, and provider abstraction.
- OpenTelemetry-based observability.
- Managed OIDC/SAML-ready authentication.
- Kubernetes-compatible deployment on a secure cloud foundation.

This architecture is intentionally pragmatic: it can ship an MVP without overbuilding, while giving the product a credible path to enterprise security, multi-region resilience, and large-scale AI decision intelligence.
