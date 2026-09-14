"""
InsightIQ — PostgreSQL Seed Script
Seeds the local database with the dev tenant, user, metric definitions,
insights, recommendations, and advisor session.

Idempotent: checks if tenant already exists before inserting.
Called automatically on API startup when PostgreSQL is connected.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from uuid import UUID

import structlog

logger = structlog.get_logger(__name__)

DEV_TENANT_ID = UUID("00000000-0000-0000-0000-000000000001")
DEV_USER_ID   = UUID("00000000-0000-0000-0000-000000000099")
DEV_WS_ID     = UUID("00000000-0000-0000-0000-000000000010")


async def seed_postgres() -> None:
    """Main entry point — seeds all tables idempotently."""
    try:
        from src.infrastructure.database.connection import get_session_factory
        from src.infrastructure.database.models import (
            Tenant, Workspace, User, MetricDefinition,
            InsightRun, Insight, Recommendation,
            AdvisorSession, AdvisorMessage,
        )
        from sqlalchemy import select

        session_factory = get_session_factory()
        async with session_factory() as db:
            # Check if already seeded
            existing = await db.execute(select(Tenant).where(Tenant.id == DEV_TENANT_ID))
            if existing.scalar_one_or_none():
                logger.info("postgres_already_seeded", tenant_id=str(DEV_TENANT_ID))
                return

            logger.info("postgres_seeding_start")

            # 1. Tenant
            db.add(Tenant(
                id=DEV_TENANT_ID,
                slug="dev-tenant",
                name="Doms Stationery Co.",
                plan="enterprise",
                industry="Retail / Stationery",
                settings={"currency": "INR", "timezone": "Asia/Kolkata"},
                is_active=True,
            ))

            # 2. Workspace
            db.add(Workspace(
                id=DEV_WS_ID,
                tenant_id=DEV_TENANT_ID,
                name="Main Workspace",
                slug="main",
                settings={},
            ))

            # 3. User
            db.add(User(
                id=DEV_USER_ID,
                tenant_id=DEV_TENANT_ID,
                external_id="dev-user-001",
                email="dev@insightiq.local",
                display_name="Dev Admin",
                role="admin",
                is_active=True,
            ))

            await db.flush()

            # 4. Metric definitions
            now = datetime.utcnow()
            metric_defs = [
                MetricDefinition(
                    id=uuid.uuid4(), tenant_id=DEV_TENANT_ID, workspace_id=DEV_WS_ID,
                    name="revenue", display_name="Total Revenue",
                    description="Recognized monthly revenue",
                    formula="SUM(value)", time_grain="monthly",
                    dimensions=["region", "channel", "product"], is_certified=True,
                ),
                MetricDefinition(
                    id=uuid.uuid4(), tenant_id=DEV_TENANT_ID, workspace_id=DEV_WS_ID,
                    name="arr", display_name="Annual Recurring Revenue",
                    description="Total ARR from active subscriptions",
                    formula="SUM(arr)", time_grain="monthly",
                    dimensions=["segment", "region"], is_certified=True,
                ),
                MetricDefinition(
                    id=uuid.uuid4(), tenant_id=DEV_TENANT_ID, workspace_id=DEV_WS_ID,
                    name="churn_rate", display_name="Customer Churn Rate",
                    description="Percentage of customers canceling",
                    formula="(lost_customers / total_customers) * 100", time_grain="monthly",
                    dimensions=["segment"], is_certified=True,
                ),
                MetricDefinition(
                    id=uuid.uuid4(), tenant_id=DEV_TENANT_ID, workspace_id=DEV_WS_ID,
                    name="nps", display_name="Net Promoter Score",
                    description="Customer satisfaction score",
                    formula="promoters - detractors", time_grain="monthly",
                    dimensions=["region", "product"], is_certified=True,
                ),
                MetricDefinition(
                    id=uuid.uuid4(), tenant_id=DEV_TENANT_ID, workspace_id=DEV_WS_ID,
                    name="cac", display_name="Customer Acquisition Cost",
                    description="Total marketing/sales spend per new customer",
                    formula="total_spend / new_customers", time_grain="monthly",
                    dimensions=["channel"], is_certified=True,
                ),
                MetricDefinition(
                    id=uuid.uuid4(), tenant_id=DEV_TENANT_ID, workspace_id=DEV_WS_ID,
                    name="pipeline", display_name="Sales Pipeline",
                    description="Total value of open opportunities",
                    formula="SUM(deal_value)", time_grain="monthly",
                    dimensions=["channel", "segment"], is_certified=True,
                ),
            ]
            for md in metric_defs:
                db.add(md)

            await db.flush()

            # 5. Insight run
            run_id = uuid.uuid4()
            db.add(InsightRun(
                id=run_id,
                tenant_id=DEV_TENANT_ID,
                trigger_type="scheduled",
                status="completed",
                insight_count=3,
                started_at=now - timedelta(hours=1),
                completed_at=now - timedelta(minutes=55),
            ))

            await db.flush()

            # 6. Insights
            ins_1_id = uuid.uuid4()
            ins_2_id = uuid.uuid4()
            ins_3_id = uuid.uuid4()

            insights_data = [
                Insight(
                    id=ins_1_id, tenant_id=DEV_TENANT_ID, run_id=run_id,
                    insight_type="anomaly", severity="high",
                    title="Revenue drop in West Region",
                    summary="West region revenue dropped 2.8σ unexpectedly — ₹3.2Cr ARR at risk.",
                    confidence_score=0.92,
                    evidence={
                        "metric": "revenue", "dimension": "region",
                        "dimension_value": "West", "deviation": -2.8,
                        "anomaly_score": 0.91,
                    },
                    recommended_actions=["Investigate West region accounts", "Schedule QBRs"],
                    status="active",
                ),
                Insight(
                    id=ins_2_id, tenant_id=DEV_TENANT_ID, run_id=run_id,
                    insight_type="trend", severity="medium",
                    title="Rising Churn in SMB Segment",
                    summary="SMB churn has trended upward for 3 consecutive months. Now 4.2% vs 2.1% baseline.",
                    confidence_score=0.88,
                    evidence={
                        "metric": "churn_rate", "dimension": "segment",
                        "dimension_value": "SMB", "trend_months": 3,
                        "current_value": 4.2, "baseline": 2.1,
                    },
                    recommended_actions=["Launch SMB retention campaign"],
                    status="active",
                ),
                Insight(
                    id=ins_3_id, tenant_id=DEV_TENANT_ID, run_id=run_id,
                    insight_type="forecast_risk", severity="high",
                    title="Pipeline Coverage Insufficient for Q3 Target",
                    summary="Current pipeline implies missing Q3 revenue target by 4% (₹1.8Cr gap).",
                    confidence_score=0.81,
                    evidence={
                        "metric": "pipeline", "pipeline_value": 107_100_000,
                        "q3_target": 111_562_500, "coverage_ratio": 2.4,
                    },
                    recommended_actions=["Increase top-of-funnel spend", "Accelerate late-stage deals"],
                    status="active",
                ),
            ]
            for ins in insights_data:
                db.add(ins)

            await db.flush()

            # 7. Recommendations
            recs = [
                Recommendation(
                    id=uuid.UUID("00000000-0000-0000-0001-000000000001"),
                    tenant_id=DEV_TENANT_ID,
                    insight_id=ins_1_id,
                    title="Re-engage West Region Sales Team",
                    description="Investigate the recent 2.8σ revenue drop and re-engage key enterprise accounts.",
                    action_type="investigate",
                    impact_score=0.88, effort_score=0.35,
                    confidence_score=0.91, composite_score=0.85,
                    expected_impact={"arr_risk_mitigated": "₹3.2Cr", "timeline": "30 days"},
                    status="pending",
                ),
                Recommendation(
                    id=uuid.UUID("00000000-0000-0000-0001-000000000002"),
                    tenant_id=DEV_TENANT_ID,
                    insight_id=ins_2_id,
                    title="Launch SMB Retention Campaign",
                    description="Target at-risk SMB customers with proactive 3-touch outreach sequence.",
                    action_type="marketing",
                    impact_score=0.75, effort_score=0.55,
                    confidence_score=0.85, composite_score=0.72,
                    expected_impact={"churn_reduction": "0.8pp", "arr_retained": "₹1.1Cr"},
                    status="pending",
                ),
                Recommendation(
                    id=uuid.UUID("00000000-0000-0000-0001-000000000003"),
                    tenant_id=DEV_TENANT_ID,
                    insight_id=ins_3_id,
                    title="Restore Outbound Pipeline Budget",
                    description="Restore SDR outreach budget to recover 60-70% of pipeline gap before Q3 close.",
                    action_type="budget",
                    impact_score=0.80, effort_score=0.65,
                    confidence_score=0.78, composite_score=0.76,
                    expected_impact={"pipeline_added": "₹1.8Cr", "timeline": "45 days"},
                    status="pending",
                ),
            ]
            for rec in recs:
                db.add(rec)

            # 8. Sample advisor session
            session_id = uuid.uuid4()
            db.add(AdvisorSession(
                id=session_id,
                tenant_id=DEV_TENANT_ID,
                user_id=DEV_USER_ID,
                title="Q3 Pipeline Analysis",
                status="active",
            ))
            await db.flush()

            db.add(AdvisorMessage(
                id=uuid.uuid4(), tenant_id=DEV_TENANT_ID, session_id=session_id,
                role="user",
                content="Why is our pipeline coverage low for Q3?",
                created_at=now - timedelta(minutes=10),
            ))
            db.add(AdvisorMessage(
                id=uuid.uuid4(), tenant_id=DEV_TENANT_ID, session_id=session_id,
                role="assistant",
                content=(
                    "Based on the data, your Q3 pipeline stands at ₹10.71Cr which provides 2.4x coverage "
                    "against the ₹4.45Cr monthly target. Outbound channel shows a 15% YoY decline — "
                    "this is the primary driver. Restoring outbound budget or adding 2-3 SDRs to focus "
                    "on mid-market accounts could recover the gap within 45 days."
                ),
                confidence_score=0.87,
                created_at=now - timedelta(minutes=9),
            ))

            await db.commit()
            logger.info("postgres_seeding_complete", tenant_id=str(DEV_TENANT_ID))

    except Exception as e:
        logger.warning("postgres_seed_failed", error=str(e),
                       note="Continuing without PostgreSQL seed — analytics still works via DuckDB")
