import { useState } from 'react'
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { mockSalesData } from '../@/api/mock/data'

const formatCurrency = (v: number) =>
  v >= 10_000_000 ? `₹${(v / 10_000_000).toFixed(2)}Cr` :
  v >= 100_000    ? `₹${(v / 100_000).toFixed(1)}L`      :
                    `₹${(v / 1_000).toFixed(0)}K`

function sliceByRange(data: typeof mockSalesData, range: string) {
  if (range === '30d') return data.slice(-2)
  if (range === '90d') return data.slice(-6)
  return data
}

export default function Sales() {
  const [dateRange, setDateRange] = useState('90d')

  const chartData = sliceByRange(mockSalesData, dateRange)

  return (
    <div className="page-enter">
      <div className="analytics-header">
        <div>
          <h1 className="page-title">Sales Analytics</h1>
          <p className="page-subtitle">Pipeline, deal velocity, and new business performance</p>
        </div>
        <div className="date-range-selector">
          {['30d', '90d', '1y'].map((r) => (
            <button key={r} className={`date-btn ${dateRange === r ? 'active' : ''}`} onClick={() => setDateRange(r)}>{r}</button>
          ))}
        </div>
      </div>

      <div className="kpi-grid section-gap" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Pipeline Value', value: '₹10.71Cr', trend: -5.2, dir: 'down' as const },
          { label: 'New Business', value: '₹71.4L', trend: 14.2, dir: 'up' as const },
          { label: 'Win Rate', value: '38%', trend: 2.1, dir: 'up' as const },
          { label: 'Avg. Sales Cycle', value: '42 days', trend: -9.0, dir: 'down' as const },
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

      <div className="chart-card section-gap">
        <div className="chart-card__header">
          <div className="chart-card__title">Sales Breakdown by Type</div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-muted)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={64} />
            <Tooltip formatter={(v: number) => [formatCurrency(v), '']} contentStyle={{ border: '1px solid var(--color-border-muted)', borderRadius: 6, fontSize: 13 }} />
            <Bar dataKey="newBusiness" fill="var(--chart-1)" radius={[3, 3, 0, 0]} name="New Business" stackId="s" />
            <Bar dataKey="expansion" fill="var(--chart-2)" radius={[3, 3, 0, 0]} name="Expansion" stackId="s" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ padding: 16, background: 'var(--color-ai-light)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: 8, display: 'flex', gap: 12 }}>
        <Sparkles size={16} style={{ color: 'var(--color-ai)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ai-text)', marginBottom: 4 }}>AI Insight</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Q3 pipeline coverage stands at 3.2x target — healthy. However, 3 of the top 10 deals have shown no activity in 14+ days. Sales cycle in the Enterprise segment extended by 9 days vs last quarter.
          </div>
        </div>
      </div>
    </div>
  )
}
