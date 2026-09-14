import { useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { mockForecastChart } from '@/api/mock/data'

const formatCurrency = (v: number) =>
  v >= 10_000_000 ? `₹${(v / 10_000_000).toFixed(2)}Cr` :
  v >= 100_000    ? `₹${(v / 100_000).toFixed(1)}L`      :
                    `₹${(v / 1_000).toFixed(0)}K`

const metrics = ['Revenue', 'Churn Rate', 'Pipeline', 'Cash Flow']
const dateOptions = ['30d', '90d', '6m', '1y']

function sliceByRange(data: typeof mockForecastChart, range: string) {
  if (range === '30d') return data.slice(-4)
  if (range === '90d') return data.slice(-6)
  if (range === '6m') return data.slice(-8)
  return data
}

export default function Forecasting() {
  const [metric, setMetric] = useState('Revenue')
  const [dateRange, setDateRange] = useState('1y')

  const chartData = sliceByRange(mockForecastChart, dateRange)

  return (
    <div className="page-enter">
      <div className="analytics-header">
        <div>
          <h1 className="page-title">Forecasting</h1>
          <p className="page-subtitle">AI-powered predictive models with confidence intervals</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="date-range-selector">
            {dateOptions.map((r) => (
              <button key={r} className={`date-btn ${dateRange === r ? 'active' : ''}`} onClick={() => setDateRange(r)}>{r}</button>
            ))}
          </div>
          <div className="date-range-selector">
            {metrics.map((m) => (
              <button key={m} className={`date-btn ${metric === m ? 'active' : ''}`} onClick={() => setMetric(m)}>{m}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Confidence summary */}
      <div className="kpi-grid section-gap" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: '90-Day Forecast', value: '₹79.05Cr', sub: 'Total projected revenue' },
          { label: 'Model Confidence', value: '81%', sub: 'Based on 18mo history' },
          { label: 'Forecast Range', value: '±12%', sub: '80% confidence band' },
          { label: 'Data Freshness', value: '4 min ago', sub: 'Last model update' },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-card__label">{k.label}</div>
            <div className="kpi-card__value" style={{ fontSize: 20 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Forecast chart */}
      <div className="chart-card section-gap">
        <div className="chart-card__header">
          <div>
            <div className="chart-card__title">{metric} Forecast — {dateRange} Projection</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Historical actuals + forecast with 80% confidence band</div>
          </div>
          <div className="chart-legend">
            <div className="chart-legend__item"><div className="chart-legend__dot" style={{ background: 'var(--chart-1)' }} />Actual</div>
            <div className="chart-legend__item"><div className="chart-legend__dot" style={{ background: 'rgba(37,99,235,0.4)' }} />Forecast</div>
            <div className="chart-legend__item"><div className="chart-legend__dot" style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 2 }} />Confidence band</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="conf-band" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.12} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-muted)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={68} />
            <Tooltip formatter={(v: number) => v !== null ? [formatCurrency(v), ''] : ['-', '']} contentStyle={{ border: '1px solid var(--color-border-muted)', borderRadius: 6, fontSize: 13 }} />
            <Area type="monotone" dataKey="upper" stroke="none" fill="url(#conf-band)" />
            <Area type="monotone" dataKey="lower" stroke="none" fill="white" />
            <Line type="monotone" dataKey="actual" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} connectNulls={false} name="Actual" />
            <Line type="monotone" dataKey="forecast" stroke="var(--chart-1)" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} name="Forecast" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Forecast drivers */}
      <div className="card">
        <div className="card__header"><div className="card__title">Forecast Drivers</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { driver: 'Enterprise Renewal Rate', direction: 'risk', impact: '−₹35.7L if 5% decline', confidence: 88 },
            { driver: 'Mid-Market Pipeline Velocity', direction: 'positive', impact: '+₹26.35L if 10% faster close', confidence: 74 },
            { driver: 'Paid Search Conversion', direction: 'risk', impact: '−₹15.3L at current rate', confidence: 82 },
          ].map((d) => (
            <div key={d.driver} style={{ padding: 16, background: 'var(--color-surface-muted)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>{d.driver}</div>
              <div style={{ fontSize: 12, color: d.direction === 'risk' ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 500, marginBottom: 4 }}>{d.impact}</div>
              <div className="insight-card__confidence">
                <div className="confidence-bar"><div className="confidence-bar__fill" style={{ width: `${d.confidence}%` }} /></div>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{d.confidence}% confidence</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
