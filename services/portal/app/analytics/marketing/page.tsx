import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const channelData = [
  { channel: 'Paid Search', spend: 7140000, leads: 420, cpl: 17000, conv: 3.2 },
  { channel: 'Organic SEO', spend: 1020000, leads: 310, cpl: 3290, conv: 4.8 },
  { channel: 'LinkedIn Ads', spend: 4760000, leads: 185, cpl: 25730, conv: 2.1 },
  { channel: 'Email', spend: 680000, leads: 290, cpl: 2345, conv: 5.1 },
  { channel: 'Content', spend: 1870000, leads: 165, cpl: 11330, conv: 3.9 },
]

const formatCurrency = (v: number) =>
  v >= 100_000 ? `₹${(v / 100_000).toFixed(1)}L` : `₹${(v / 1_000).toFixed(0)}K`

export default function Marketing() {
  return (
    <div className="page-enter">
      <div className="analytics-header">
        <div>
          <h1 className="page-title">Marketing Analytics</h1>
          <p className="page-subtitle">Channel performance, spend efficiency, and lead generation</p>
        </div>
      </div>

      <div className="kpi-grid section-gap" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Total Marketing Spend', value: '₹15.47L', trend: -18.2, dir: 'down' as const },
          { label: 'Total Leads Generated', value: '1,370', trend: -12.4, dir: 'down' as const },
          { label: 'Blended CPL', value: '₹11,300', trend: -6.8, dir: 'up' as const },
          { label: 'MQL → SQL Rate', value: '34%', trend: 2.4, dir: 'up' as const },
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

      <div className="dashboard-grid section-gap">
        <div className="chart-card">
          <div className="chart-card__header"><div className="chart-card__title">Leads by Channel</div></div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={channelData} layout="vertical" barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-muted)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="channel" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ border: '1px solid var(--color-border-muted)', borderRadius: 6, fontSize: 13 }} />
              <Bar dataKey="leads" fill="var(--chart-1)" radius={[0, 4, 4, 0]} name="Leads" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card__header"><div className="card__title">Channel Efficiency</div></div>
          <table className="data-table">
            <thead>
              <tr><th>Channel</th><th>Spend</th><th>Leads</th><th>CPL</th><th>Conv%</th></tr>
            </thead>
            <tbody>
              {channelData.map((row) => (
                <tr key={row.channel}>
                  <td style={{ fontWeight: 500 }}>{row.channel}</td>
                  <td className="tabular-nums">{formatCurrency(row.spend)}</td>
                  <td className="tabular-nums">{row.leads}</td>
                  <td className="tabular-nums">₹{row.cpl.toLocaleString('en-IN')}</td>
                  <td className="tabular-nums">{row.conv}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ padding: 16, background: 'var(--color-danger-light)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 8, display: 'flex', gap: 12 }}>
        <Sparkles size={16} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-danger-text)', marginBottom: 4 }}>AI Alert — Action Required</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Paid search conversion dropped 21.5% after the Aug 1 budget cut. Restoring the top 2 campaigns (Brand + Competitor) is estimated to recover ₹15.3L/month in revenue.
          </div>
        </div>
      </div>
    </div>
  )
}
