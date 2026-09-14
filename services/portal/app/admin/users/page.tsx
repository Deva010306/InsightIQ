import { Plus, MoreHorizontal } from 'lucide-react'
import { mockUsers } from '../@/api/mock/data'

const roleColor = (r: string) =>
  r === 'admin' ? 'critical' : r === 'analyst' ? 'primary' : r === 'manager' ? 'teal' : 'muted'

export default function AdminUsers() {
  return (
    <div className="page-enter">
      <div className="analytics-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage workspace members, roles, and access</p>
        </div>
        <button className="btn btn--primary btn--sm"><Plus size={13} /> Invite User</button>
      </div>

      <div className="card">
        <div className="card__header">
          <div className="card__title">Workspace Members</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{mockUsers.length} members</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--color-primary), var(--color-ai))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>
                      {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <span style={{ fontWeight: 500 }}>{user.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>{user.email}</td>
                <td><span className={`badge badge--${roleColor(user.role)}`} style={{ textTransform: 'capitalize' }}>{user.role}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className={`status-dot status-dot--${user.status === 'active' ? 'healthy' : 'warning'}`} />
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{user.status}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{user.lastActive}</td>
                <td><button className="icon-btn" aria-label="More options"><MoreHorizontal size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Roles reference */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__header"><div className="card__title">Role Permissions Overview</div></div>
        <table className="data-table">
          <thead>
            <tr><th>Role</th><th>View Dashboards</th><th>Ask AI</th><th>Accept Recommendations</th><th>Manage Data Sources</th><th>Admin Access</th></tr>
          </thead>
          <tbody>
            {[
              { role: 'admin', view: '✓', ai: '✓', rec: '✓', data: '✓', admin: '✓' },
              { role: 'manager', view: '✓', ai: '✓', rec: '✓', data: '—', admin: '—' },
              { role: 'analyst', view: '✓', ai: '✓', rec: '—', data: '—', admin: '—' },
              { role: 'viewer', view: '✓', ai: '—', rec: '—', data: '—', admin: '—' },
            ].map((r) => (
              <tr key={r.role}>
                <td><span className={`badge badge--${roleColor(r.role)}`} style={{ textTransform: 'capitalize' }}>{r.role}</span></td>
                {[r.view, r.ai, r.rec, r.data, r.admin].map((v, i) => (
                  <td key={i} style={{ color: v === '✓' ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: v === '✓' ? 600 : 400 }}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
