/**
 * InsightIQ — Dashboard API Client
 * KPIs, alerts, health score, and dashboard summary from the backend.
 * Falls back to mock data if the API is unavailable.
 */
import apiClient from './client'

// ── Types ────────────────────────────────────────────────────────────────────

export interface KPICard {
  id: string
  label: string
  value: string
  rawValue: number
  trend: number
  trendDir: 'up' | 'down' | 'neutral'
  period: string
  sparkline: number[]
  accent: string
}

export interface AlertCard {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  desc: string
  metric: string
  time: string
}

export interface HealthDriver {
  name: string
  score: number
}

export interface HealthScore {
  score: number
  label: string
  trend: number
  drivers: HealthDriver[]
}

export interface InsightCard {
  id: string
  severity: string
  title: string
  summary: string
  confidence: number
  evidenceCount: number
  createdAt: string
}

export interface RecommendationCard {
  id: string
  title: string
  description: string | null
  impact: string
  effort: string
  expectedROI: string
  timeToImpact: string
  status: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapApiKPI(d: Record<string, unknown>): KPICard {
  return {
    id: d.id as string,
    label: d.label as string,
    value: d.value as string,
    rawValue: d.raw_value as number,
    trend: d.trend as number,
    trendDir: d.trend_dir as 'up' | 'down' | 'neutral',
    period: d.period as string,
    sparkline: (d.sparkline as number[]) ?? [],
    accent: d.accent as string,
  }
}

function mapApiAlert(d: Record<string, unknown>): AlertCard {
  return {
    id: d.id as string,
    severity: d.severity as AlertCard['severity'],
    title: d.title as string,
    desc: d.desc as string,
    metric: d.metric as string,
    time: d.time as string,
  }
}

function mapApiRec(d: Record<string, unknown>): RecommendationCard {
  const expected = (d.expected_impact as Record<string, string>) ?? {}
  const impact_key = Object.keys(expected).filter(k => k !== 'timeline')[0]
  return {
    id: d.id as string,
    title: d.title as string,
    description: d.description as string | null,
    impact: d.impact_label as string,
    effort: d.effort_label as string,
    expectedROI: impact_key ? `${expected[impact_key]} ${impact_key.replace(/_/g, ' ')}` : 'TBD',
    timeToImpact: expected.timeline ?? '30 days',
    status: d.status as string,
  }
}

// ── API Calls ─────────────────────────────────────────────────────────────────

/**
 * Fetch KPI cards.
 */
export async function fetchKPIs(): Promise<KPICard[]> {
  const res = await apiClient.get<Record<string, unknown>[]>('/api/v1/dashboard/kpis')
  return (res.data ?? []).map(mapApiKPI)
}

/**
 * Fetch active alerts.
 */
export async function fetchAlerts(): Promise<AlertCard[]> {
  const res = await apiClient.get<Record<string, unknown>[]>('/api/v1/dashboard/alerts')
  return (res.data ?? []).map(mapApiAlert)
}

/**
 * Fetch business health score.
 */
export async function fetchHealthScore(): Promise<HealthScore> {
  const res = await apiClient.get<HealthScore>('/api/v1/dashboard/health-score')
  return res.data
}

/**
 * Fetch priority insights.
 */
export async function fetchInsights(): Promise<InsightCard[]> {
  const res = await apiClient.get<{ data: Record<string, unknown>[] }>('/api/v1/insights')
  const items = res.data?.data ?? []
  return items.map(d => ({
    id: d.id as string,
    severity: d.severity as string,
    title: d.title as string,
    summary: d.summary as string,
    confidence: Math.round((d.confidence_score as number) * 100),
    evidenceCount: (d.evidence as Record<string, unknown>)
      ? Object.keys(d.evidence as Record<string, unknown>).length
      : 3,
    createdAt: (d.created_at as string) ?? '2h ago',
  }))
}

/**
 * Fetch recommendations.
 */
export async function fetchRecommendations(): Promise<RecommendationCard[]> {
  const res = await apiClient.get<{ data: Record<string, unknown>[]; total: number }>('/api/v1/recommendations/')
  const items = res.data?.data ?? []
  return items.map(mapApiRec)
}
