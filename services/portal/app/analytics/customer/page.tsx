import { useState } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Sparkles, ArrowUpRight } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { mockCustomerData } from '../@/api/mock/data'

function sliceByRange(data: typeof mockCustomerData, range: string) {
  if (range === '30d') return data.slice(-3)
  if (range === '90d') return data.slice(-6)
  return data
}

export default function Customer() {
  const router = useRouter()
  const [dateRange, setDateRange] = useState('1y')

  const chartData = sliceByRange(mockCustomerData, dateRange)

  return (
    <div className="page-enter">
      <div className="analytics-header">
        <div>
          <h1 className="page-title">Customer Analytics</h1>
          <p className="page-subtitle">Customer growth, churn, and sentiment</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="date-range-selector">
            {['30d', '90d', '1y'].map((r) => (
              <button key={r} className={`date-btn ${dateRange === r ? 'active' : ''}`} onClick={() => setDateRange(r)}>{r}</button>
            ))}
          </div>
          <button className="btn btn--ai btn--sm" onClick={() => router.push('/advisor')}><Sparkles size={13} /> Ask AI</button>
        </div>
      </div>

      <div className="kpi-grid section-gap" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Total Customers', value: '412', trend: 4.1, dir: 'up' as const },
          { label: 'New This Month', value: '18', trend: 12.5, dir: 'up' as const },
          { label: 'Churn Rate', value: '2.1%', trend: 0.4, dir: 'up' as const },
          { label: 'Net Promoter Score', value: '67', trend: 3.0, dir: 'up' as const },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-card__label">{k.label}</div>
            <div className="kpi-card__value">{k.value}</div>
            <div className={`kpi-card__trend kpi-card__trend--${k.dir}`}>
              {k.dir === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {k.trend}% <span className="kpi-card__period">vs last period</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid section-gap">
        <div className="chart-card">
          <div className="chart-card__header">
            <div className="chart-card__title">Customer Growth</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-muted)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ border: '1px solid var(--color-border-muted)', borderRadius: 6, fontSize: 13 }} />
              <Line type="monotone" dataKey="total" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} name="Total" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card__header">
            <div className="chart-card__title">New vs Churned</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-muted)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ border: '1px solid var(--color-border-muted)', borderRadius: 6, fontSize: 13 }} />
              <Bar dataKey="new" fill="var(--color-success)" radius={[4, 4, 0, 0]} name="New" />
              <Bar dataKey="churned" fill="var(--color-danger)" radius={[4, 4, 0, 0]} name="Churned" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ padding: 16, background: 'var(--color-ai-light)', border: '1px solid rgba(79,70,229,0.15)', borderRadius: 8, display: 'flex', gap: 12 }}>
        <Sparkles size={16} style={{ color: 'var(--color-ai)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ai-text)', marginBottom: 4 }}>AI Insight</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            34 enterprise accounts in the West region show health scores below 65. Churn probability for this cohort is 28% over the next 60 days. Combined ARR at risk: ₹3.57 Crore. Immediate renewal outreach is recommended.
          </div>
          <button className="btn btn--ghost btn--sm" style={{ marginTop: 8, color: 'var(--color-ai)', paddingLeft: 0 }} onClick={() => router.push('/advisor')}>
            Investigate <ArrowUpRight size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
