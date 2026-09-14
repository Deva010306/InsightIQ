import { useState } from 'react'
import { Download, Filter } from 'lucide-react'
import { mockAuditLogs } from '../@/api/mock/data'

const actionColor = (action: string) => {
  if (action.includes('Login')) return 'primary'
  if (action.includes('Created') || action.includes('Connected')) return 'teal'
  if (action.includes('Accepted') || action.includes('Exported')) return 'medium'
  return 'muted'
}

export default function AuditLogs() {
  const [search, setSearch] = useState('')

  const logs = mockAuditLogs.filter(
    (l) =>
      !search ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actor.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-enter">
      <div className="analytics-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">All user actions and system events — immutable record</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--secondary btn--sm"><Filter size={13} /> Filter</button>
          <button className="btn btn--secondary btn--sm"><Download size={13} /> Export</button>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <div className="card__title">Event Log</div>
          <input
            type="text"
            className="form-input"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220, padding: '6px 12px', fontSize: 13 }}
          />
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Actor</th>
              <th>Resource</th>
              <th>Timestamp</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>
                  <span className={`badge badge--${actionColor(log.action)}`}>{log.action}</span>
                </td>
                <td style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{log.actor}</td>
                <td style={{ color: 'var(--color-text-primary)', fontSize: 13 }}>{log.resource}</td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{log.timestamp}</td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'monospace' }}>{log.ip}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>No events match your search</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
