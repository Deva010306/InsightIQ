import { useRouter, usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, MessageSquare, BarChart2, Lightbulb,
  TrendingUp, BellRing, FileText, Database, Settings,
  GitBranch, Users, ChevronDown, Zap
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Decision Center' },
  { to: '/advisor', icon: MessageSquare, label: 'AI Advisor', badge: null },
  { divider: true, label: 'Analytics' },
  { to: '/analytics/revenue', icon: BarChart2, label: 'Revenue' },
  { to: '/analytics/customer', icon: Users, label: 'Customer' },
  { to: '/analytics/sales', icon: TrendingUp, label: 'Sales' },
  { to: '/analytics/marketing', icon: Zap, label: 'Marketing' },
  { divider: true, label: 'Intelligence' },
  { to: '/recommendations', icon: Lightbulb, label: 'Recommendations' },
  { to: '/forecasting', icon: TrendingUp, label: 'Forecasting' },
  { to: '/alerts', icon: BellRing, label: 'Alerts', badge: 3 },
  { divider: true, label: 'Workspace' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/data-sources', icon: Database, label: 'Data Sources' },
  { to: '/admin/users', icon: GitBranch, label: 'Admin' },
]

export default function Sidebar() {
  const workspace = useAuthStore((s) => s.workspace)

  return (
    <nav className="sidebar" aria-label="Main navigation">
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div className="sidebar__logo-text">InsightIQ</div>
          <div className="sidebar__logo-sub">AI Intelligence</div>
        </div>
      </div>

      {/* Workspace Switcher */}
      {workspace && (
        <div className="sidebar__workspace">
          <div className="workspace-pill" role="button" tabIndex={0}>
            <div className="workspace-avatar">{workspace.abbrev}</div>
            <span className="workspace-name">{workspace.name}</span>
            <ChevronDown size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="sidebar__nav">
        {NAV_ITEMS.map((item, i) => {
          if ('divider' in item && item.divider) {
            return <div key={i} className="sidebar__section-label">{item.label}</div>
          }
          if (!item.to) return null
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon && <item.icon size={17} className="nav-icon" />}
              {item.label}
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </NavLink>
          )
        })}
      </div>

      {/* Footer */}
      <div className="sidebar__footer">
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={17} className="nav-icon" />
          Settings
        </NavLink>
      </div>
    </nav>
  )
}
