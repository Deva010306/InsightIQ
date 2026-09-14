import { useState } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, CheckCircle, Clock, BellOff, ChevronDown, ChevronUp, Sparkles, ArrowUpRight, Activity } from 'lucide-react'
import { mockAlerts } from '@/api/mock/data'

type Sev = 'all' | 'critical' | 'high' | 'medium'

const EXTRA_ALERTS = [
  { id: '4', severity: 'medium' as const, title: 'NPS survey response rate below 30%', desc: 'Current NPS survey response rate is 24%, below the 30% minimum for statistically significant results.', time: '5 hours ago', metric: 'NPS' },
  { id: '5', severity: 'low' as const, title: 'New data source connected: Google Analytics 4', desc: 'GA4 connector successfully configured and initial sync completed. 6 months of historical data imported.', time: '1 day ago', metric: 'Data Quality' },
]

const ALL_ALERTS = [...mockAlerts, ...EXTRA_ALERTS]

// ── Root cause investigation data per alert ──────────────────────────────────
const INVESTIGATION: Record<string, { rootCause: string; affected: string[]; steps: string[] }> = {
  '1': {
    rootCause: 'Enterprise renewal pipeline has 7 accounts with expired outreach windows. Primary driver is understaffing in the West region CSM team (2 positions unfilled since June).',
    affected: ['Monthly Revenue (−₹35.7L projected)', 'ARR Retention Rate (−3.2pp risk)', 'Q3 Forecast Accuracy'],
    steps: [
      'Assign interim CSMs from the East region to the 7 highest-risk accounts',
      'Schedule emergency QBRs with accounts showing health score < 60',
      'Escalate 3 accounts to VP Sales for executive-to-executive outreach',
    ],
  },
  '2': {
    rootCause: 'Salesforce OAuth token expired 6 hours ago. Automated refresh failed due to a misconfigured service account with insufficient API permissions.',
    affected: ['Pipeline Value (stale data)', 'Deal Stage Reporting', 'Forecasting Model Inputs'],
    steps: [
      'Regenerate Salesforce OAuth token in Data Sources settings',
      'Grant "API Enabled" permission to the integration service account',
      'Trigger a manual re-sync after credentials are updated',
    ],
  },
  '3': {
    rootCause: 'Churn model training data was last updated 43 days ago. 2 new enterprise segments added in July are not represented in the training set, reducing predictive confidence.',
    affected: ['Churn Prediction Accuracy', 'At-Risk Account Prioritization', 'Revenue Forecast'],
    steps: [
      'Trigger model retraining pipeline with July–August customer behaviour data',
      'Include new enterprise segments in the feature engineering step',
      'Validate retraining results against held-out validation set before deploying',
    ],
  },
  '4': {
    rootCause: 'NPS survey email open rate dropped to 18% following a deliverability issue with the bulk sending domain (listed on Spamhaus DBL on Jul 28).',
    affected: ['NPS Score Accuracy', 'Customer Sentiment Tracking'],
    steps: [
      'Submit domain delisting request to Spamhaus',
      'Re-send NPS survey from the primary transactional domain as a fallback',
      'Review and clean the email list to remove hard bounces',
    ],
  },
  '5': {
    rootCause: 'Scheduled import completed successfully. No action required.',
    affected: ['Marketing Attribution Data'],
    steps: ['Review imported GA4 data for completeness in the Data Sources tab'],
  },
}

export default function Alerts() {
  const router = useRouter()
  const [filter, setFilter] = useState<Sev>('all')
  const [resolved, setResolved] = useState<Set<string>>(new Set())
  const [investigating, setInvestigating] = useState<Set<string>>(new Set())

  const visible = ALL_ALERTS.filter(
    (a) => !resolved.has(a.id) && (filter === 'all' || a.severity === filter)
  )

  function toggleInvestigate(id: string) {
    setInvestigating((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  return (
    <div className="page-enter">
      <div className="analytics-header">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">{ALL_ALERTS.filter((a) => !resolved.has(a.id)).length} active alerts requiring attention</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['all', 'critical', 'high', 'medium'] as Sev[]).map((s) => (
            <button key={s} className={`date-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)} style={{ textTransform: 'capitalize' }}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={48} className="empty-state__icon" style={{ color: 'var(--color-success)' }} />
          <div className="empty-state__title">All clear!</div>
          <div className="empty-state__desc">No active alerts for this filter. Your business metrics are within expected ranges.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map((alert) => {
            const isInvestigating = investigating.has(alert.id)
            const inv = INVESTIGATION[alert.id]
            return (
              <div key={alert.id} className={`alert-card alert-card--${alert.severity}`} style={{ cursor: 'default', flexDirection: 'column', gap: 0 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="alert-card__icon">
                    <AlertTriangle size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div className="alert-card__title">{alert.title}</div>
                        <div className="alert-card__desc" style={{ marginTop: 4 }}>{alert.desc}</div>
                        <div className="alert-card__time">{alert.time} · {alert.metric}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <span className={`badge badge--${alert.severity}`} style={{ alignSelf: 'flex-start' }}>{alert.severity}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        className={`btn btn--sm ${isInvestigating ? 'btn--secondary' : 'btn--primary'}`}
                        onClick={() => toggleInvestigate(alert.id)}
                        style={{ gap: 5 }}
                      >
                        <Activity size={12} />
                        {isInvestigating ? 'Close' : 'Investigate'}
                        {isInvestigating ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      <button className="btn btn--secondary btn--sm" onClick={() => setResolved((p) => new Set([...p, alert.id]))}>
                        <BellOff size={12} /> Dismiss
                      </button>
                      <button className="btn btn--ghost btn--sm"><Clock size={12} /> Snooze</button>
                    </div>
                  </div>
                </div>

                {/* Inline Investigation Panel */}
                {isInvestigating && inv && (
                  <div style={{
                    marginTop: 14, padding: '16px', borderRadius: 8,
                    background: 'var(--color-surface-muted)',
                    border: '1px solid var(--color-border-muted)',
                    animation: 'fadeIn 0.2s ease',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Sparkles size={14} style={{ color: 'var(--color-ai)' }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>AI Root Cause Analysis</span>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', marginBottom: 6 }}>Root Cause</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>{inv.rootCause}</div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', marginBottom: 6 }}>Affected Metrics</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {inv.affected.map((m) => (
                          <span key={m} style={{ fontSize: 12, padding: '2px 10px', borderRadius: 20, background: 'var(--color-border-muted)', color: 'var(--color-text-secondary)' }}>{m}</span>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)', marginBottom: 6 }}>Recommended Actions</div>
                      <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {inv.steps.map((s, i) => (
                          <li key={i} style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{s}</li>
                        ))}
                      </ol>
                    </div>

                    <button
                      className="btn btn--ai btn--sm"
                      onClick={() => router.push('/advisor')}
                      style={{ gap: 6 }}
                    >
                      <Sparkles size={12} /> Deep dive in AI Advisor <ArrowUpRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}
