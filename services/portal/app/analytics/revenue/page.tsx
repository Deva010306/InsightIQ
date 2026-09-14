import { useState } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart2, TrendingUp, TrendingDown, Download,
  RefreshCw, ArrowUpRight, Sparkles
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { mockRevenueChart, mockKPIs } from '../@/api/mock/data'

const formatCurrency = (v: number) =>
  v >= 10_000_000 ? `₹${(v / 10_000_000).toFixed(2)}Cr` :
  v >= 100_000    ? `₹${(v / 100_000).toFixed(1)}L`      :
                    `₹${(v / 1_000).toFixed(0)}K`

const revenueKPI = mockKPIs.find((k) => k.id === 'revenue')!
const arrKPI = mockKPIs.find((k) => k.id === 'arr')!

const breakdownData = [
  { segment: 'Enterprise', revenue: 137700000, prev: 126650000 },
  { segment: 'Mid-Market', revenue: 71400000, prev: 61200000 },
  { segment: 'SMB', revenue: 32300000, prev: 34850000 },
]

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
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function Revenue() {
  const router = useRouter()
  const [dateRange, setDateRange] = useState('30d')

  const chartData = sliceByRange(mockRevenueChart, dateRange)

  const handleExport = () => {
    const rows = chartData.map((d) => [d.month, String(d.revenue), String(d.prevRevenue)])
    downloadCSV('revenue_analytics.csv', rows, ['Month', 'Revenue (₹)', 'Prev Revenue (₹)'])
  }

  return (
    <div className="page-enter">
      <div className="analytics-header">
        <div>
          <h1 className="page-title">Revenue Analytics</h1>
          <p className="page-subtitle">Monthly revenue performance and segment breakdown</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="date-range-selector">
            {['7d', '30d', '90d', '1y'].map((r) => (
              <button key={r} className={`date-btn ${dateRange === r ? 'active' : ''}`} onClick={() => setDateRange(r)}>
                {r === '7d' ? '7d' : r === '30d' ? '30d' : r === '90d' ? '90d' : '1yr'}
              </button>
            ))}
          </div>
          <button className="btn btn--secondary btn--sm" onClick={handleExport}><Download size={13} /> Export CSV</button>
          <button className="btn btn--ai btn--sm" onClick={() => router.push('/advisor')}><Sparkles size={13} /> Ask AI</button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid section-gap" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Monthly Revenue', value: revenueKPI.value, trend: revenueKPI.trend, dir: revenueKPI.trendDir },
          { label: 'Annual Recurring Revenue', value: arrKPI.value, trend: arrKPI.trend, dir: arrKPI.trendDir },
          { label: 'Revenue Growth MoM', value: '+8.3%', trend: 8.3, dir: 'up' as const },
          { label: 'Avg. Deal Size', value: '₹24.14L', trend: 4.1, dir: 'up' as const },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-card__label">{k.label}</div>
            <div className="kpi-card__value">{k.value}</div>
            <div className={`kpi-card__trend kpi-card__trend--${k.dir}`}>
              {k.dir === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {Math.abs(k.trend)}% <span className="kpi-card__period">vs last period</span>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Trend Chart */}
      <div className="chart-card section-gap">
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">Revenue Trend</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>This year vs prior year</div>
          </div>
          <div className="chart-legend">
            <div className="chart-legend__item"><div className="chart-legend__dot" style={{ background: 'var(--chart-1)' }} />This year</div>
            <div className="chart-legend__item"><div className="chart-legend__dot" style={{ background: 'var(--chart-8)' }} />Prior year</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-muted)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={64} />
            <Tooltip formatter={(v: number) => [formatCurrency(v), '']} contentStyle={{ border: '1px solid var(--color-border-muted)', borderRadius: 6, fontSize: 13 }} />
            <Line type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} name="This year" />
            <Line type="monotone" dataKey="prevRevenue" stroke="var(--chart-8)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Prior year" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Segment Breakdown */}
      <div className="dashboard-grid section-gap">
        <div className="chart-card">
          <div className="chart-card__header">
            <div className="chart-card__title">Revenue by Segment</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={breakdownData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-muted)" vertical={false} />
              <XAxis dataKey="segment" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={64} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), '']} contentStyle={{ border: '1px solid var(--color-border-muted)', borderRadius: 6, fontSize: 13 }} />
              <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="This period" />
              <Bar dataKey="prev" fill="var(--color-border-muted)" radius={[4, 4, 0, 0]} name="Prior period" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown Table */}
        <div className="card">
          <div className="card__header">
            <div className="card__title">Segment Detail</div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Segment</th>
                <th>Revenue</th>
                <th>vs Prior</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {breakdownData.map((row) => {
                const total = breakdownData.reduce((s, r) => s + r.revenue, 0)
                const change = ((row.revenue - row.prev) / row.prev) * 100
                return (
                  <tr key={row.segment}>
                    <td style={{ fontWeight: 500 }}>{row.segment}</td>
                    <td className="tabular-nums">{formatCurrency(row.revenue)}</td>
                    <td>
                      <span className={`kpi-card__trend kpi-card__trend--${change >= 0 ? 'up' : 'down'}`} style={{ fontSize: 12 }}>
                        {change >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {Math.abs(change).toFixed(1)}%
                      </span>
                    </td>
                    <td className="tabular-nums">{((row.revenue / total) * 100).toFixed(0)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Insight */}
      <div style={{ padding: 16, background: 'var(--color-ai-light)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Sparkles size={16} style={{ color: 'var(--color-ai)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ai-text)', marginBottom: 4 }}>AI Insight</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Enterprise segment is the primary growth driver (+8.7% MoM), offsetting a −7.3% decline in SMB. Mid-market velocity has accelerated with 3 large deals expected to close before month-end, adding ~₹66L to ARR.
          </div>
          <button className="btn btn--ghost btn--sm" style={{ marginTop: 8, color: 'var(--color-ai)', paddingLeft: 0 }} onClick={() => router.push('/advisor')}>
            Investigate <ArrowUpRight size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
