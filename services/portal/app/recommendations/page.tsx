import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Lightbulb, Filter, BarChart2, TrendingUp, X } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { mockRecommendations } from '@/api/mock/data'
import { fetchRecommendations, type RecommendationCard } from '@/api/dashboard'

const impactColor = (v: string) =>
  v === 'High' ? 'critical' : v === 'Medium' ? 'medium' : 'low'

const effortColor = (v: string) =>
  v === 'High' ? 'high' : v === 'Medium' ? 'medium' : 'teal'

type Status = 'all' | 'pending' | 'accepted'

// ── Simulation data per recommendation ──────────────────────────────────────
const SIM_DATA: Record<string, { projections: { period: string; value: number; label: string }[]; summary: string }> = {
  '1': {
    projections: [
      { period: '30 days', value: 35, label: '₹35.7L ARR retained' },
      { period: '60 days', value: 71, label: '₹71.4L ARR retained' },
      { period: '90 days', value: 357, label: '₹3.57Cr ARR protected' },
    ],
    summary: 'Launching outreach within 7 days is projected to retain 85% of at-risk ARR. Delay beyond 14 days reduces success probability by 40%.',
  },
  '2': {
    projections: [
      { period: '7 days', value: 35, label: '+₹35.7L recovered' },
      { period: '14 days', value: 76, label: '+₹76.5L recovered' },
      { period: '30 days', value: 153, label: '+₹1.53Cr/mo restored' },
    ],
    summary: 'Restoring paid search budget has a 5–7 day ramp-up period. By day 30, monthly revenue is projected to return to pre-cut levels with 82% confidence.',
  },
  '3': {
    projections: [
      { period: '2 weeks', value: 15, label: '−15% support tickets' },
      { period: '1 month', value: 28, label: '−28% support tickets' },
      { period: '3 months', value: 38, label: '−38% support tickets' },
    ],
    summary: 'Documentation improvements typically show ticket reduction within 2 weeks of launch. Full impact realized by 90 days, freeing ~1.4 FTE of support capacity.',
  },
  '4': {
    projections: [
      { period: '30 days', value: 22, label: '₹22L potential close' },
      { period: '45 days', value: 44, label: '₹44L potential close' },
      { period: '60 days', value: 66, label: '₹66.3L total revenue' },
    ],
    summary: 'Acceleration of these 3 deals can pull in ₹66.3L by day 60 vs day 90+ without intervention. Executive sponsorship reduces deal slippage risk by 35%.',
  },
}

function SimulationPanel({ recId, onClose }: { recId: string; onClose: () => void }) {
  const [running, setRunning] = useState(true)
  const data = SIM_DATA[recId]

  // Simulate a quick "running" state
  useState(() => {
    const t = setTimeout(() => setRunning(false), 1200)
    return () => clearTimeout(t)
  })

  return (
    <div style={{
      marginTop: 14, padding: '16px', borderRadius: 8,
      background: 'var(--color-surface-muted)',
      border: '1px solid var(--color-border-muted)',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: running ? 16 : 12 }}>
        <BarChart2 size={14} style={{ color: 'var(--color-primary)' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {running ? 'Running simulation…' : 'Simulation Results'}
        </span>
        <button className="icon-btn" style={{ marginLeft: 'auto', width: 24, height: 24 }} onClick={onClose}><X size={14} /></button>
      </div>

      {running ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['Initialising model parameters…', 'Loading historical cohort data…', 'Projecting impact curves…'].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--color-primary)',
                animation: `pulse 1s ease ${i * 0.2}s infinite`,
              }} />
              {s}
            </div>
          ))}
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data.projections} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-muted)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(_: number, __: string, props: { payload?: { label?: string } }) => [props.payload?.label ?? '', 'Impact']}
                contentStyle={{ border: '1px solid var(--color-border-muted)', borderRadius: 6, fontSize: 12 }}
              />
              {data.projections.map((_, i) => null)}
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Impact">
                {data.projections.map((_, i) => (
                  <Cell key={i} fill={i === data.projections.length - 1 ? 'var(--color-success)' : 'var(--color-primary)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div style={{ display: 'flex', gap: 8, margin: '12px 0', flexWrap: 'wrap' }}>
            {data.projections.map((p) => (
              <div key={p.period} style={{ flex: 1, minWidth: 100, padding: '8px 12px', background: 'var(--color-surface)', borderRadius: 6, border: '1px solid var(--color-border-muted)' }}>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{p.period}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-success)' }}>{p.label}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, padding: '10px 12px', background: 'var(--color-surface)', borderRadius: 6, border: '1px solid var(--color-border-muted)' }}>
            <TrendingUp size={12} style={{ display: 'inline', marginRight: 6, color: 'var(--color-success)' }} />
            {data.summary}
          </div>
        </>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
    </div>
  )
}

export default function Recommendations() {
  const [filter, setFilter] = useState<Status>('all')
  const [accepted, setAccepted] = useState<Set<string>>(new Set())
  const [simulating, setSimulating] = useState<string | null>(null)
  const [recs, setRecs] = useState(mockRecommendations)

  // Load real recommendations on mount
  useEffect(() => {
    fetchRecommendations().then((data: RecommendationCard[]) => {
      if (data.length > 0) {
        // Map API data to the shape the UI expects
        const mapped = data.map((r) => ({
          id: r.id,
          title: r.title,
          objective: r.impact + ' Impact',
          impact: r.impact,
          effort: r.effort,
          risk: 'Low',
          expectedROI: r.expectedROI,
          confidence: 85,
          owner: 'Team Lead',
          dueDate: 'This month',
          status: r.status,
          desc: r.description ?? '',
          timeToImpact: r.timeToImpact,
          evidenceCount: 5,
        }))
        setRecs(mapped)
        setAccepted(new Set(mapped.filter((r) => r.status === 'accepted').map((r) => r.id)))
      }
    }).catch(() => { /* keep mock data */ })
  }, [])

  const visible = recs.filter(
    (r) => filter === 'all' || (filter === 'accepted' ? accepted.has(r.id) : !accepted.has(r.id))
  )

  const accept = (id: string) => setAccepted((prev) => new Set([...prev, id]))
  const reject = (id: string) => setAccepted((prev) => { const n = new Set(prev); n.delete(id); return n })

  return (
    <div className="page-enter">
      <div className="analytics-header">
        <div>
          <h1 className="page-title">Recommendation Center</h1>
          <p className="page-subtitle">Evidence-backed actions ranked by impact and effort</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['all', 'pending', 'accepted'] as Status[]).map((s) => (
            <button key={s} className={`date-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)} style={{ textTransform: 'capitalize' }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="kpi-grid section-gap" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { label: 'Pending Recommendations', value: mockRecommendations.filter((r) => !accepted.has(r.id)).length.toString(), icon: Lightbulb, color: 'var(--color-primary)' },
          { label: 'Accepted Actions', value: accepted.size.toString(), icon: CheckCircle, color: 'var(--color-success)' },
          { label: 'Est. Total Impact', value: '+₹4.38Cr', icon: Filter, color: 'var(--color-teal)' },
        ].map((s) => (
          <div key={s.label} className="kpi-card" style={{ display: 'flex', gap: 16, alignItems: 'center', flexDirection: 'row' }}>
            <div style={{ width: 44, height: 44, background: 'var(--color-surface-muted)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={20} style={{ color: s.color }} />
            </div>
            <div>
              <div className="kpi-card__value" style={{ fontSize: 22 }}>{s.value}</div>
              <div className="kpi-card__label" style={{ marginBottom: 0 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendation cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.map((rec) => {
          const isAccepted = accepted.has(rec.id)
          const isSimulating = simulating === rec.id
          return (
            <div key={rec.id} className="rec-card" style={{ opacity: isAccepted ? 0.85 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span className={`badge badge--${impactColor(rec.impact)}`}>{rec.impact} impact</span>
                    <span className={`badge badge--${effortColor(rec.effort)}`}>{rec.effort} effort</span>
                    <span className="badge badge--muted">{rec.objective}</span>
                    {isAccepted && <span className="badge badge--teal">✓ Accepted</span>}
                  </div>
                  <div className="rec-card__title">{rec.title}</div>
                  <div className="rec-card__desc">{rec.desc}</div>
                </div>
              </div>

              <div className="rec-card__metrics">
                <div className="rec-metric"><div className="rec-metric__label">Expected ROI</div><div className="rec-metric__value" style={{ color: 'var(--color-success)' }}>{rec.expectedROI}</div></div>
                <div className="rec-metric"><div className="rec-metric__label">Confidence</div><div className="rec-metric__value">{rec.confidence}%</div></div>
                <div className="rec-metric"><div className="rec-metric__label">Time to Impact</div><div className="rec-metric__value">{rec.timeToImpact}</div></div>
                <div className="rec-metric"><div className="rec-metric__label">Owner</div><div className="rec-metric__value">{rec.owner}</div></div>
                <div className="rec-metric"><div className="rec-metric__label">Due Date</div><div className="rec-metric__value">{rec.dueDate}</div></div>
              </div>

              <div className="rec-card__actions">
                {!isAccepted ? (
                  <button className="btn btn--primary btn--sm" onClick={() => accept(rec.id)}>
                    <CheckCircle size={13} /> Accept
                  </button>
                ) : (
                  <button className="btn btn--secondary btn--sm" onClick={() => reject(rec.id)}>
                    <XCircle size={13} /> Undo
                  </button>
                )}
                <button
                  className={`btn btn--sm ${isSimulating ? 'btn--secondary' : 'btn--secondary'}`}
                  onClick={() => setSimulating(isSimulating ? null : rec.id)}
                  style={{ gap: 5 }}
                >
                  <BarChart2 size={12} /> {isSimulating ? 'Hide Simulation' : 'Simulate'}
                </button>
                <span className="text-caption text-muted" style={{ marginLeft: 'auto', lineHeight: '30px' }}>{rec.evidenceCount} evidence sources</span>
              </div>

              {/* Inline Simulation Panel */}
              {isSimulating && (
                <SimulationPanel recId={rec.id} onClose={() => setSimulating(null)} />
              )}
            </div>
          )
        })}
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}
