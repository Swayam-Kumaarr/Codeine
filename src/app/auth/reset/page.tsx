'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Supabase sends the token in the URL hash — the client SDK handles it automatically
    // Just verify the user has a valid session from the reset link
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/forgot-password')
      }
    })
  }, [router])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' }}>
    <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
      <div style={{ width: '48px', height: '48px', background: 'var(--ink)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20,6 9,17 4,12" />
        </svg>
      </div>
      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: '8px' }}>Password updated</h2>
      <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>Redirecting you to the dashboard…</p>
    </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ marginBottom: '48px' }}>
          <p style={{ fontFamily: 'var(--font-head)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>Codeine</p>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '36px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>Set new password</h1>
          <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--ink-2)' }}>Choose a password you haven&apos;t used before.</p>
        </div>

        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>New password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
              placeholder="Min. 8 characters"
              style={{ background: 'var(--bg-panel)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', padding: '12px 14px', fontSize: '14px', color: 'var(--ink)', outline: 'none', width: '100%', fontFamily: 'var(--font-body)' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              placeholder="••••••••"
              style={{ background: 'var(--bg-panel)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', padding: '12px 14px', fontSize: '14px', color: 'var(--ink)', outline: 'none', width: '100%', fontFamily: 'var(--font-body)' }}
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: '#c0392b', background: '#fdf0f0', border: '1px solid #f5c6cb', borderRadius: 'var(--r)', padding: '10px 12px' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--r)', padding: '13px 24px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: '4px' }}
          >
            {loading ? 'Updating…' : 'Update password →'}
          </button>
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--ink-3)' }}>
          <Link href="/login" style={{ color: 'var(--ink)', textDecoration: 'none', borderBottom: '1px solid var(--ink)' }}>Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
