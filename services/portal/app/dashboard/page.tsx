import { useState, useCallback, useEffect } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, RefreshCw, Download,
  ArrowUpRight, AlertTriangle, Sparkles, CheckCircle,
  Loader2,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, ReferenceLine,
} from 'recharts'
import {
  fetchKPIs, fetchAlerts, fetchHealthScore, fetchInsights, fetchRecommendations,
  type KPICard, type AlertCard, type HealthScore, type InsightCard, type RecommendationCard,
} from '@/api/dashboard'
import { mockRevenueChart, mockForecastChart } from '@/api/mock/data'

const formatCurrency = (v: number) =>
  v >= 10_000_000 ? `₹${(v / 10_000_000).toFixed(2)}Cr` :
  v >= 100_000    ? `₹${(v / 100_000).toFixed(1)}L`      :
                    `₹${(v / 1_000).toFixed(0)}K`

const ScoreColor = (s: number) => s >= 80 ? 'great' : s >= 65 ? 'good' : s >= 50 ? 'fair' : 'poor'

function sliceByRange(data: typeof mockRevenueChart, range: string) {
  if (range === '7d') return data.slice(-2)
  if (range === '30d') return data.slice(-4)
  if (range === '90d') return data.slice(-9)
  return data
}

function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function DecisionCenter() {
  const router = useRouter()
  const [dateRange, setDateRange] = useState('30d')
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)

  // API data state
  const [kpis, setKpis] = useState<KPICard[]>([])
  const [alerts, setAlerts] = useState<AlertCard[]>([])
  const [health, setHealth] = useState<HealthScore | null>(null)
  const [insights, setInsights] = useState<InsightCard[]>([])
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([])
  const [loading, setLoading] = useState(true)

  const chartData = sliceByRange(mockRevenueChart, dateRange)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const [k, a, h, i, r] = await Promise.all([
        fetchKPIs(),
        fetchAlerts(),
        fetchHealthScore(),
        fetchInsights(),
        fetchRecommendations(),
      ])
      setKpis(k)
      setAlerts(a)
      setHealth(h)
      setInsights(i)
      setRecommendations(r)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const handleSync = useCallback(() => {
    setSyncing(true)
    setSyncDone(false)
    loadDashboard().then(() => {
      setSyncing(false)
      setSyncDone(true)
      setTimeout(() => setSyncDone(false), 2500)
    })
  }, [loadDashboard])

  const handleExport = useCallback(() => {
    const rows = chartData.map((d) => [d.month, String(d.revenue), String(d.prevRevenue)])
    downloadCSV('decision_center_kpis.csv', rows, ['Month', 'Revenue (₹)', 'Prev Revenue (₹)'])
  }, [chartData])

  const healthData = health ?? {
    score: 74,
    label: 'Good',
    trend: 2.1,
    drivers: [
      { name: 'Revenue Growth', score: 78 },
      { name: 'Customer Retention', score: 72 },
      { name: 'Customer Satisfaction', score: 68 },
      { name: 'Pipeline Health', score: 65 },
    ],
  }

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1 className="page-title">Decision Center</h1>
          <p className="page-subtitle">
            Business health overview ·{' '}
            {loading ? 'Loading…' : 'Live data from DuckDB analytics'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="date-range-selector">
            {['7d', '30d', '90d', '1y'].map((r) => (
              <button key={r} className={`date-btn ${dateRange === r ? 'active' : ''}`} onClick={() => setDateRange(r)}>
                {r === '7d' ? '7 days' : r === '30d' ? '30 days' : r === '90d' ? '90 days' : '1 year'}
              </button>
            ))}
          </div>
          <button
            className="btn btn--secondary btn--sm"
            style={{ gap: 6 }}
            onClick={handleSync}
            disabled={syncing || loading}
          >
            {syncDone
              ? <><CheckCircle size={13} style={{ color: 'var(--color-success)' }} /> Synced</>
              : <><RefreshCw size={13} style={{ animation: syncing ? 'spin 0.8s linear infinite' : 'none' }} /> {syncing ? 'Syncing…' : 'Sync'}</>
            }
          </button>
          <button className="btn btn--secondary btn--sm" style={{ gap: 6 }} onClick={handleExport}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', marginBottom: 16 }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13 }}>Loading live data from analytics store…</span>
        </div>
      )}

      {/* KPI Band */}
      <div className="kpi-grid section-gap">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="kpi-card"
            style={{ '--kpi-accent': kpi.accent } as React.CSSProperties}
            onClick={() => router.push(`/analytics/${kpi.id}`)}
            role="button"
            tabIndex={0}
          >
            <div className="kpi-card__label">{kpi.label}</div>
            <div className="kpi-card__value tabular-nums">{kpi.value}</div>
            <div className={`kpi-card__trend kpi-card__trend--${kpi.trendDir}`}>
              {kpi.trendDir === 'up'
                ? <TrendingUp size={13} />
                : <TrendingDown size={13} />}
              {Math.abs(kpi.trend)}
              {kpi.id === 'churn_rate' ? 'pp' : '%'}
              <span className="kpi-card__period">{kpi.period}</span>
            </div>
            {/* Mini sparkline */}
            <div className="kpi-card__sparkline">
              <ResponsiveContainer width="100%" height={36}>
                <AreaChart data={kpi.sparkline.map((v, i) => ({ v, i }))}>
                  <defs>
                    <linearGradient id={`sg-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={kpi.accent} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={kpi.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke={kpi.accent} strokeWidth={1.5} fill={`url(#sg-${kpi.id})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
        {/* Placeholder cards while loading */}
        {loading && kpis.length === 0 && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="kpi-card" style={{ opacity: 0.4, '--kpi-accent': '#6366f1' } as React.CSSProperties}>
            <div className="kpi-card__label">Loading…</div>
            <div className="kpi-card__value">—</div>
          </div>
        ))}
      </div>

      {/* Row 2: Health Score + Priority Insights */}
      <div className="dashboard-grid section-gap">
        {/* Business Health Score */}
        <div className="health-score-panel">
          <div className="card__header">
            <div>
              <div className="card__title">Business Health Score</div>
              <div className="card__subtitle">Composite AI-evaluated metric</div>
            </div>
            <span className={`badge badge--${ScoreColor(healthData.score) === 'great' ? 'teal' : ScoreColor(healthData.score) === 'good' ? 'primary' : 'high'}`}>
              {healthData.label}
            </span>
          </div>
          <div className="health-score__gauge">
            <div>
              <div className={`health-score__number health-score__number--${ScoreColor(healthData.score)}`}>
                {healthData.score}
              </div>
              <div className="health-score__label" style={{ color: 'var(--color-text-muted)' }}>out of 100</div>
            </div>
            <div className="health-drivers">
              {healthData.drivers.map((d) => (
                <div key={d.name} className="health-driver">
                  <span className="health-driver__name">{d.name}</span>
                  <div className="health-driver__bar">
                    <div className="health-driver__fill" style={{ width: `${d.score}%`, background: d.score >= 75 ? 'var(--color-success)' : d.score >= 60 ? 'var(--color-primary)' : 'var(--color-warning)' }} />
                  </div>
                  <span className="health-driver__score">{d.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Priority Insights */}
        <div className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Priority Insights</div>
              <div className="card__subtitle">AI-ranked by business impact</div>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => router.push('/advisor')}>
              <Sparkles size={13} /> Ask AI
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {insights.map((ins) => (
              <div key={ins.id} className="insight-card">
                <div className="insight-card__header">
                  <span className={`insight-card__severity insight-card__severity--${ins.severity}`} />
                  <div>
                    <div className="insight-card__title">{ins.title}</div>
                  </div>
                  <span className={`badge badge--${ins.severity === 'critical' ? 'critical' : ins.severity === 'high' ? 'high' : ins.severity === 'medium' ? 'medium' : 'low'}`} style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    {ins.severity}
                  </span>
                </div>
                <div className="insight-card__summary">{ins.summary}</div>
                <div className="insight-card__meta">
                  <div className="insight-card__confidence">
                    <div className="confidence-bar">
                      <div className="confidence-bar__fill" style={{ width: `${ins.confidence}%` }} />
                    </div>
                    {ins.confidence}% confidence
                  </div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{ins.evidenceCount} sources</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 11, marginLeft: 'auto' }}>{ins.createdAt}</span>
                </div>
              </div>
            ))}
            {loading && insights.length === 0 && (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '16px 0' }}>Loading insights…</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Revenue Chart + Recommendations Preview */}
      <div className="dashboard-grid section-gap">
        {/* Revenue Trend */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <div className="chart-card__title">Revenue Trend</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Monthly revenue vs prior year</div>
            </div>
            <div className="chart-legend">
              <div className="chart-legend__item">
                <div className="chart-legend__dot" style={{ background: 'var(--chart-1)' }} />
                This year
              </div>
              <div className="chart-legend__item">
                <div className="chart-legend__dot" style={{ background: 'var(--chart-8)' }} />
                Prior year
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-muted)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={64} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '']}
                contentStyle={{ border: '1px solid var(--color-border-muted)', borderRadius: 6, fontSize: 13 }}
              />
              <Line type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="prevRevenue" stroke="var(--chart-8)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Recommendations */}
        <div className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Top Recommendations</div>
              <div className="card__subtitle">Ranked by impact · evidence-backed</div>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => router.push('/recommendations')}>
              View all <ArrowUpRight size={13} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recommendations.slice(0, 3).map((rec) => (
              <div key={rec.id} className="rec-card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div className="rec-card__title" style={{ fontSize: 13, marginBottom: 0 }}>{rec.title}</div>
                  <span className={`badge badge--${rec.impact === 'High' ? 'critical' : 'medium'}`}>{rec.impact} impact</span>
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginBottom: 10 }}>{rec.expectedROI} · {rec.timeToImpact}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn--primary btn--sm" onClick={() => router.push('/recommendations')}>Accept</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => router.push('/recommendations')}>Details</button>
                </div>
              </div>
            ))}
            {loading && recommendations.length === 0 && (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '16px 0' }}>Loading recommendations…</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Forecast Snapshot + Alerts */}
      <div className="dashboard-grid section-gap">
        {/* Forecast Snapshot */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <div className="chart-card__title">Revenue Forecast</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>90-day projection with confidence band</div>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => router.push('/forecasting')}>
              Full forecast <ArrowUpRight size={13} />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockForecastChart}>
              <defs>
                <linearGradient id="fcast-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-muted)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={64} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), '']} contentStyle={{ border: '1px solid var(--color-border-muted)', borderRadius: 6, fontSize: 13 }} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#fcast-grad)" />
              <Area type="monotone" dataKey="lower" stroke="none" fill="white" />
              <Line type="monotone" dataKey="actual" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="forecast" stroke="var(--chart-1)" strokeWidth={2} strokeDasharray="5 3" dot={false} />
              <ReferenceLine x="Jul" stroke="var(--color-border)" strokeDasharray="4 2" label={{ value: 'Today', fontSize: 10, fill: 'var(--color-text-muted)' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts Panel */}
        <div className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Active Alerts</div>
              <div className="card__subtitle">{alerts.length} require attention</div>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => router.push('/alerts')}>
              View all <ArrowUpRight size={13} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map((alert) => (
              <div key={alert.id} className={`alert-card alert-card--${alert.severity}`}>
                <div className="alert-card__icon">
                  <AlertTriangle size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="alert-card__title">{alert.title}</div>
                  <div className="alert-card__desc">{alert.desc}</div>
                  <div className="alert-card__time">{alert.time} · {alert.metric}</div>
                </div>
              </div>
            ))}
            {loading && alerts.length === 0 && (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '16px 0' }}>Loading alerts…</div>
            )}
          </div>
        </div>
      </div>

      {/* AI Advisor CTA */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Sparkles size={16} color="rgba(165,180,252,1)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(165,180,252,1)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              AI Advisor
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 6 }}>
            Have a question about your business?
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', maxWidth: 480 }}>
            Ask in plain English and get evidence-backed insights, root cause analysis, and recommended actions in seconds.
          </div>
        </div>
        <button
          className="btn btn--ai btn--lg"
          style={{ flexShrink: 0, background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}
          onClick={() => router.push('/advisor')}
        >
          <Sparkles size={16} /> Ask a question
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
