import { useAuthStore } from '@/store/auth'
import { User, Database, BellRing, ShieldCheck, Palette, ChevronRight } from 'lucide-react'

const SETTINGS_SECTIONS = [
  {
    title: 'Account',
    icon: User,
    items: [
      { label: 'Profile & Display Name', desc: 'Update your name, email, and avatar' },
      { label: 'Password & Security', desc: 'Change password, 2FA, and active sessions' },
    ],
  },
  {
    title: 'Workspace',
    icon: Database,
    items: [
      { label: 'General Settings', desc: 'Workspace name, timezone, and fiscal year' },
      { label: 'Data Sources', desc: 'Manage connected integrations and sync schedules', href: '/data-sources' },
      { label: 'AI Model Preferences', desc: 'Configure AI response style and verbosity' },
    ],
  },
  {
    title: 'Notifications',
    icon: BellRing,
    items: [
      { label: 'Alert Thresholds', desc: 'Set metric thresholds that trigger alerts' },
      { label: 'Email & Slack Delivery', desc: 'Configure where alerts and reports are delivered' },
      { label: 'Report Schedule', desc: 'Automated weekly and monthly report delivery' },
    ],
  },
  {
    title: 'Security & Compliance',
    icon: ShieldCheck,
    items: [
      { label: 'Role & Permissions', desc: 'Manage user roles and feature access', href: '/admin/users' },
      { label: 'Audit Log', desc: 'View all user actions and system events', href: '/admin/audit' },
      { label: 'SSO & Identity Provider', desc: 'Configure SAML/OIDC SSO for your organization' },
      { label: 'Data Retention', desc: 'Manage how long insights and logs are retained' },
    ],
  },
  {
    title: 'Appearance',
    icon: Palette,
    items: [
      { label: 'Theme', desc: 'Light mode (Dark mode coming in v2)' },
      { label: 'Dashboard Density', desc: 'Choose between compact and comfortable layouts' },
    ],
  },
]

export default function Settings() {
  const user = useAuthStore((s) => s.user)
  const workspace = useAuthStore((s) => s.workspace)

  return (
    <div className="page-enter">
      <div className="analytics-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account, workspace, and preferences</p>
        </div>
      </div>

      {/* Profile summary */}
      <div className="card section-gap" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-ai))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: 'white', flexShrink: 0,
        }}>
          {user?.initials ?? 'U'}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>{user?.name ?? '—'}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{user?.email ?? '—'}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <span className="badge badge--primary" style={{ textTransform: 'capitalize' }}>{user?.role ?? 'viewer'}</span>
            <span className="badge badge--muted">{workspace?.name ?? 'No workspace'}</span>
          </div>
        </div>
        <button className="btn btn--secondary btn--sm" style={{ marginLeft: 'auto' }}>Edit Profile</button>
      </div>

      {/* Settings sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {SETTINGS_SECTIONS.map((section) => (
          <div key={section.title} className="card">
            <div className="card__header" style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <section.icon size={16} style={{ color: 'var(--color-primary)' }} />
                <div className="card__title">{section.title}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {section.items.map((item, idx) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 0',
                    borderTop: idx > 0 ? '1px solid var(--color-border-muted)' : 'none',
                    cursor: 'pointer',
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.desc}</div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="card" style={{ borderColor: 'rgba(220,38,38,0.2)', marginTop: 20 }}>
        <div className="card__header">
          <div className="card__title" style={{ color: 'var(--color-danger)' }}>Danger Zone</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 }}>Delete Workspace</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Permanently delete this workspace and all data. This cannot be undone.</div>
          </div>
          <button className="btn btn--sm" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)', border: '1px solid rgba(220,38,38,0.2)', flexShrink: 0 }}>
            Delete Workspace
          </button>
        </div>
      </div>
    </div>
  )
}
