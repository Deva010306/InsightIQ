import { useState, FormEvent } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, BarChart2, Brain } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

export default function Login() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('admin@acmecorp.com')
  const [password, setPassword] = useState('password')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch {
      setError('Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Left — Brand hero */}
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand__mark">
            <Sparkles size={20} color="white" />
          </div>
          <span className="login-brand__name">InsightIQ</span>
        </div>

        <div className="login-hero">
          <h1 className="login-hero__headline">
            Your AI<br /><span>Business Advisor</span><br />is ready.
          </h1>
          <p className="login-hero__sub">
            Evidence-backed insights, root cause analysis, and strategic recommendations — all in plain language, for every decision-maker.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 40 }}>
            {[
              { icon: Brain, text: 'AI agents that explain what changed and why' },
              { icon: BarChart2, text: 'Real-time KPIs across every business domain' },
              { icon: ShieldCheck, text: 'Enterprise-grade security and data isolation' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={16} color="rgba(255,255,255,0.8)" />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="login-stats">
          {[
            { value: '412', label: 'Active companies' },
            { value: '98.7%', label: 'Uptime SLA' },
            { value: '2.4s', label: 'Avg. insight time' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="login-stat__value">{value}</div>
              <div className="login-stat__label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Login form */}
      <div className="login-right">
        <div className="login-form-wrap">
          <h1>Welcome back</h1>
          <p>Sign in to your InsightIQ workspace</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Work email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', border: 'none', background: 'none',
                  }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', background: 'var(--color-danger-light)',
                border: '1px solid rgba(220, 38, 38, 0.2)', borderRadius: 6,
                color: 'var(--color-danger)', fontSize: 13, marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn--primary btn--lg"
              disabled={loading}
              style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: 'white', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    display: 'inline-block',
                  }} />
                  Signing in…
                </>
              ) : (
                <>Sign in <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p style={{
            textAlign: 'center', marginTop: 24, fontSize: 12,
            color: 'var(--color-text-muted)', lineHeight: 1.5
          }}>
            Protected by enterprise SSO.<br />
            <span style={{ color: 'var(--color-primary)', cursor: 'pointer' }}>Forgot password?</span>
          </p>

          {/* Dev note */}
          <div style={{
            marginTop: 24, padding: 12, background: 'var(--color-surface-muted)',
            border: '1px solid var(--color-border-muted)', borderRadius: 6,
            fontSize: 12, color: 'var(--color-text-muted)',
          }}>
            <strong style={{ color: 'var(--color-warning)' }}>Dev mode:</strong>{' '}
            Any credentials work. Using <code style={{ fontFamily: 'monospace' }}>dev-token</code> bypass.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
