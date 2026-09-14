import { useState, useRef, useEffect } from 'react'
import { Search, Bell, HelpCircle, Sparkles } from 'lucide-react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '../../store/auth'
import { mockKPIs, mockReports, mockAlerts, mockRecommendations } from '../../api/mock/data'

interface TopBarProps {
  title?: string
}

// ── Searchable items index ───────────────────────────────────────────────────
const SEARCH_INDEX = [
  { label: 'Decision Center', type: 'Page', path: '/dashboard' },
  { label: 'AI Advisor', type: 'Page', path: '/advisor' },
  { label: 'Recommendations', type: 'Page', path: '/recommendations' },
  { label: 'Forecasting', type: 'Page', path: '/forecasting' },
  { label: 'Alerts', type: 'Page', path: '/alerts' },
  { label: 'Reports', type: 'Page', path: '/reports' },
  { label: 'Data Sources', type: 'Page', path: '/data-sources' },
  { label: 'Revenue Analytics', type: 'Page', path: '/analytics/revenue' },
  { label: 'Customer Analytics', type: 'Page', path: '/analytics/customer' },
  { label: 'Sales Analytics', type: 'Page', path: '/analytics/sales' },
  { label: 'Marketing Analytics', type: 'Page', path: '/analytics/marketing' },
  { label: 'Settings', type: 'Page', path: '/settings' },
  ...mockKPIs.map((k) => ({ label: k.label, type: 'Metric', path: `/analytics/${k.id}` })),
  ...mockReports.map((r) => ({ label: r.title, type: 'Report', path: '/reports' })),
  ...mockAlerts.map((a) => ({ label: a.title, type: 'Alert', path: '/alerts' })),
  ...mockRecommendations.map((r) => ({ label: r.title, type: 'Recommendation', path: '/recommendations' })),
]

const TYPE_COLOR: Record<string, string> = {
  Page: 'var(--color-primary)',
  Metric: 'var(--color-teal)',
  Report: 'var(--color-ai)',
  Alert: 'var(--color-warning)',
  Recommendation: 'var(--color-success)',
}

export default function TopBar({ title }: TopBarProps) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const results = query.trim().length > 0
    ? SEARCH_INDEX.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : []

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(path: string) {
    router.push(path)
    setQuery('')
    setOpen(false)
  }

  return (
    <header className="topbar" role="banner">
      {title && <span className="topbar__title">{title}</span>}
      {!title && <span style={{ flex: 1 }} />}

      {/* Search */}
      <div
        ref={wrapRef}
        className="topbar__search"
        style={{ flex: title ? 'unset' : 1, position: 'relative' }}
      >
        <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        <input
          placeholder="Search metrics, insights, reports…"
          aria-label="Global search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); setQuery('') }
            if (e.key === 'Enter' && results.length > 0) handleSelect(results[0].path)
          }}
        />
        {!query && (
          <kbd style={{
            fontSize: '11px', color: 'var(--color-text-muted)',
            background: 'var(--color-surface-muted)', border: '1px solid var(--color-border-muted)',
            borderRadius: 3, padding: '1px 5px', fontFamily: 'inherit',
          }}>⌘K</kbd>
        )}

        {/* Dropdown */}
        {open && results.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            zIndex: 1000, overflow: 'hidden',
          }}>
            {results.map((item, i) => (
              <div
                key={i}
                onClick={() => handleSelect(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px', cursor: 'pointer',
                  borderBottom: i < results.length - 1 ? '1px solid var(--color-border-muted)' : 'none',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-muted)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px',
                  borderRadius: 4, background: TYPE_COLOR[item.type] + '22',
                  color: TYPE_COLOR[item.type], whiteSpace: 'nowrap',
                }}>{item.type}</span>
                <span style={{ fontSize: 13, color: 'var(--color-text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="topbar__actions">
        {/* AI Advisor quick launch */}
        <button
          className="btn btn--ai btn--sm"
          onClick={() => router.push('/advisor')}
          style={{ gap: 6 }}
        >
          <Sparkles size={13} />
          Ask AI
        </button>

        {/* Help */}
        <button className="icon-btn" aria-label="Help">
          <HelpCircle size={18} />
        </button>

        {/* Alerts */}
        <button className="icon-btn" aria-label="Notifications" onClick={() => router.push('/alerts')}>
          <Bell size={18} />
          <span className="dot" />
        </button>

        {/* User */}
        <div
          className="user-avatar"
          role="button"
          tabIndex={0}
          title={user?.name}
          onClick={logout}
          style={{ cursor: 'pointer' }}
        >
          {user?.initials ?? 'U'}
        </div>
      </div>
    </header>
  )
}
