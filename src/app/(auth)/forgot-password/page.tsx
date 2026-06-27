'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/reset`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
  }

  if (done) return (
    <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
      <div style={{ width: '48px', height: '48px', background: 'var(--ink)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20,6 9,17 4,12" />
        </svg>
      </div>
      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: '8px' }}>Check your inbox</h2>
      <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: '24px' }}>
        If an account exists for <strong>{email}</strong>, you&apos;ll get a reset link shortly.
      </p>
      <Link href="/login" style={{ fontSize: '13px', color: 'var(--ink)', borderBottom: '1px solid var(--ink)', textDecoration: 'none' }}>Back to sign in</Link>
    </div>
  )

  return (
    <div style={{ width: '100%', maxWidth: '400px' }}>
      <div style={{ marginBottom: '48px' }}>
        <Link href="/login" style={{ fontSize: '12px', color: 'var(--ink-3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>← Back to sign in</Link>
        <p style={{ fontFamily: 'var(--font-head)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>Codeine</p>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '36px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>Reset password</h1>
        <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--ink-2)' }}>Enter your email and we&apos;ll send you a reset link.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            placeholder="you@example.com"
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
          {loading ? 'Sending…' : 'Send reset link →'}
        </button>
      </form>
    </div>
  )
}
