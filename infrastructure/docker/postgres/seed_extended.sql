-- =============================================
-- InsightIQ — PostgreSQL Extended Seed Script
-- Run this AFTER init.sql to populate the DB with realistic data.
-- =============================================

\c insightiq;

-- 1. Get the Tenant ID from the dev tenant created in init.sql
DO $$ 
DECLARE
    dev_tenant_id UUID;
    dev_workspace_id UUID;
    dev_user_id UUID;
    
    metric_rev_id UUID := gen_random_uuid();
    metric_arr_id UUID := gen_random_uuid();
    metric_churn_id UUID := gen_random_uuid();
    metric_nps_id UUID := gen_random_uuid();
    metric_cac_id UUID := gen_random_uuid();
    metric_pipe_id UUID := gen_random_uuid();
    
    insight_run_id UUID := gen_random_uuid();
    insight_1_id UUID := gen_random_uuid();
    insight_2_id UUID := gen_random_uuid();
    insight_3_id UUID := gen_random_uuid();
    
    session_id UUID := gen_random_uuid();
BEGIN
    SELECT id INTO dev_tenant_id FROM insightiq_core.tenants WHERE slug = 'dev-tenant' LIMIT 1;
    SELECT id INTO dev_workspace_id FROM insightiq_core.workspaces WHERE tenant_id = dev_tenant_id LIMIT 1;
    
    -- 2. Create Dev User
    INSERT INTO insightiq_core.users (id, tenant_id, external_id, email, display_name, role, is_active)
    VALUES (
        gen_random_uuid(), dev_tenant_id, 'dev-user-001', 'dev@insightiq.local', 
        'Dev User', 'admin', true
    ) RETURNING id INTO dev_user_id;

    -- 3. Seed Metric Catalog
    INSERT INTO insightiq_core.metric_definitions (id, tenant_id, workspace_id, name, display_name, description, formula, time_grain, dimensions, is_certified) VALUES
    (metric_rev_id, dev_tenant_id, dev_workspace_id, 'revenue', 'Total Revenue', 'Recognized monthly revenue', 'SUM(value)', 'monthly', '["region", "channel", "product"]'::jsonb, true),
    (metric_arr_id, dev_tenant_id, dev_workspace_id, 'arr', 'Annual Recurring Revenue', 'Total ARR from active subscriptions', 'SUM(arr)', 'monthly', '["segment", "region"]'::jsonb, true),
    (metric_churn_id, dev_tenant_id, dev_workspace_id, 'churn_rate', 'Customer Churn Rate', 'Percentage of customers canceling', '(lost_customers / total_customers) * 100', 'monthly', '["segment"]'::jsonb, true),
    (metric_nps_id, dev_tenant_id, dev_workspace_id, 'nps', 'Net Promoter Score', 'Customer satisfaction score', 'promoters - detractors', 'monthly', '["region", "product"]'::jsonb, true),
    (metric_cac_id, dev_tenant_id, dev_workspace_id, 'cac', 'Customer Acquisition Cost', 'Total marketing/sales spend per new customer', 'total_spend / new_customers', 'monthly', '["channel"]'::jsonb, true),
    (metric_pipe_id, dev_tenant_id, dev_workspace_id, 'pipeline', 'Sales Pipeline', 'Total value of open opportunities', 'SUM(deal_value)', 'monthly', '["channel", "segment"]'::jsonb, true);

    -- 4. Seed Insight Run
    INSERT INTO insightiq_core.insight_runs (id, tenant_id, trigger_type, status, insight_count, started_at, completed_at)
    VALUES (insight_run_id, dev_tenant_id, 'scheduled', 'completed', 3, now() - interval '1 hour', now() - interval '55 minutes');

    -- 5. Seed Insights
    INSERT INTO insightiq_core.insights (id, tenant_id, run_id, insight_type, severity, title, summary, confidence_score, status) VALUES
    (insight_1_id, dev_tenant_id, insight_run_id, 'anomaly', 'high', 'Revenue drop in West Region', 'West region revenue dropped 2.8% unexpectedly.', 0.92, 'active'),
    (insight_2_id, dev_tenant_id, insight_run_id, 'trend', 'medium', 'Rising Churn in SMB Segment', 'SMB churn has trended upward for 3 consecutive months.', 0.88, 'active'),
    (insight_3_id, dev_tenant_id, insight_run_id, 'forecast_risk', 'high', 'Pipeline coverage insufficient for Q3 target', 'Current pipeline implies missing Q3 revenue target by 4%.', 0.81, 'active');

    -- 6. Seed Recommendations
    INSERT INTO insightiq_core.recommendations (id, tenant_id, insight_id, title, description, action_type, impact_score, effort_score, composite_score) VALUES
    (gen_random_uuid(), dev_tenant_id, insight_1_id, 'Review West Region sales team performance', 'Investigate the recent 2.8% revenue drop.', 'investigate', 0.8, 0.4, 0.7),
    (gen_random_uuid(), dev_tenant_id, insight_2_id, 'Launch SMB retention campaign', 'Target at-risk SMB customers with a proactive outreach campaign.', 'marketing', 0.7, 0.6, 0.65),
    (gen_random_uuid(), dev_tenant_id, insight_3_id, 'Increase top-of-funnel marketing spend', 'Boost pipeline coverage to meet Q3 targets.', 'budget', 0.9, 0.8, 0.85);

    -- 7. Seed Advisor Session
    INSERT INTO insightiq_core.advisor_sessions (id, tenant_id, user_id, title, status)
    VALUES (session_id, dev_tenant_id, dev_user_id, 'Q3 Pipeline Analysis', 'active');

    -- 8. Seed Advisor Messages
    INSERT INTO insightiq_core.advisor_messages (id, tenant_id, session_id, role, content, created_at) VALUES
    (gen_random_uuid(), dev_tenant_id, session_id, 'user', 'Why is our pipeline coverage low for Q3?', now() - interval '10 minutes'),
    (gen_random_uuid(), dev_tenant_id, session_id, 'assistant', 'Based on current data, your Q3 pipeline is 108M, which provides only 2.4x coverage against the 45M target. A minimum of 3x is recommended. Outbound channels specifically show a 15% YoY decline.', now() - interval '9 minutes');

END $$;
