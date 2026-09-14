import { Plus, RefreshCw } from 'lucide-react'
import { mockDataSources } from '@/api/mock/data'

export default function DataSources() {
  return (
    <div className="page-enter">
      <div className="analytics-header">
        <div>
          <h1 className="page-title">Data Sources</h1>
          <p className="page-subtitle">Connected integrations, sync status, and data quality</p>
        </div>
        <button className="btn btn--primary btn--sm"><Plus size={13} /> Add Source</button>
      </div>

      {/* Summary row */}
      <div className="kpi-grid section-gap" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { label: 'Connected Sources', value: mockDataSources.length.toString() },
          { label: 'Data Quality Score', value: '91%' },
          { label: 'Last Full Sync', value: '4 min ago' },
        ].map((s) => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-card__label">{s.label}</div>
            <div className="kpi-card__value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="source-grid">
        {mockDataSources.map((src) => (
          <div key={src.id} className="source-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="source-card__icon" style={{ background: 'var(--color-surface-muted)' }}>{src.icon}</div>
              <span className={`badge badge--${src.status === 'healthy' ? 'teal' : src.status === 'error' ? 'critical' : src.status === 'syncing' ? 'primary' : 'high'}`}>
                {src.status}
              </span>
            </div>
            <div>
              <div className="source-card__name">{src.name}</div>
              <div className="source-card__type">{src.type}</div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Data Quality</span>
                <span style={{ fontWeight: 600, color: src.quality >= 90 ? 'var(--color-success)' : src.quality >= 75 ? 'var(--color-warning)' : 'var(--color-danger)' }}>{src.quality}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--color-surface-muted)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${src.quality}%`, background: src.quality >= 90 ? 'var(--color-success)' : src.quality >= 75 ? 'var(--color-warning)' : 'var(--color-danger)', borderRadius: 4 }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="source-card__status">
                <div className={`status-dot status-dot--${src.status === 'syncing' ? 'syncing' : src.status === 'healthy' ? 'healthy' : src.status === 'error' ? 'error' : 'warning'}`} />
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{src.lastSync}</span>
              </div>
              <button className="icon-btn" aria-label="Sync now"><RefreshCw size={13} /></button>
            </div>
          </div>
        ))}

        {/* Add source card */}
        <div className="source-card" style={{ border: '2px dashed var(--color-border-muted)', background: 'transparent', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 200 }}>
          <div style={{ width: 44, height: 44, background: 'var(--color-primary-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Plus size={20} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className="source-card__name" style={{ textAlign: 'center' }}>Connect Source</div>
          <div className="source-card__type" style={{ textAlign: 'center' }}>CRM · Finance · Analytics · Database</div>
        </div>
      </div>
    </div>
  )
}
