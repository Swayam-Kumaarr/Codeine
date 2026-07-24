'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlErrorCode = searchParams.get('error')

  function friendlyUrlError(code: string) {
    if (code === 'auth_callback_failed') return 'Sign-in failed. Please try again.'
    if (code === 'no_code') return 'Invalid sign-in link. Please try again.'
    return 'Something went wrong. Please try again.'
  }

  function friendlyError(msg: string) {
    if (msg.includes('Invalid login credentials')) return 'Wrong email or password. Please try again.'
    if (msg.includes('Email not confirmed')) return 'Please confirm your email before signing in.'
    if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts. Please wait a few minutes and try again.'
    return msg
  }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(urlErrorCode ? friendlyUrlError(urlErrorCode) : '')
  const [loading, setLoading] = useState(false)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(friendlyError(error.message)); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  async function resendVerification() {
    if (!email) { setError('Enter your email above first.'); return }
    setResendState('sending')
    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email })
    setResendState('sent')
  }

  return (
    <div style={{ width: '100%', maxWidth: '400px' }}>
      <div style={{ marginBottom: '48px' }}>
        <Link href="/" style={{ fontSize: '12px', color: 'var(--ink-3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>← Home</Link>
        <p style={{ fontFamily: 'var(--font-head)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>Codeine</p>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '36px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>
          Welcome back
        </h1>
        <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--ink-2)' }}>Pick up where you left off.</p>
      </div>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--r)',
              padding: '12px 14px',
              fontSize: '14px',
              color: 'var(--ink)',
              outline: 'none',
              width: '100%',
              fontFamily: 'var(--font-body)',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Password</label>
            <Link href="/forgot-password" style={{ fontSize: '12px', color: 'var(--ink-3)', textDecoration: 'none' }}>Forgot password?</Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--line-strong)',
              borderRadius: 'var(--r)',
              padding: '12px 14px',
              fontSize: '14px',
              color: 'var(--ink)',
              outline: 'none',
              width: '100%',
              fontFamily: 'var(--font-body)',
            }}
          />
        </div>

        {error && (
          <div style={{ fontSize: '13px', color: '#c0392b', background: '#fdf0f0', border: '1px solid #f5c6cb', borderRadius: 'var(--r)', padding: '10px 12px' }}>
            <p>{error}</p>
            {error.includes('confirm your email') && (
              <button
                type="button"
                onClick={resendVerification}
                disabled={resendState !== 'idle'}
                style={{ marginTop: '8px', fontSize: '12px', fontWeight: 500, color: '#c0392b', background: 'none', border: 'none', padding: 0, cursor: resendState === 'idle' ? 'pointer' : 'default', textDecoration: resendState === 'idle' ? 'underline' : 'none', fontFamily: 'var(--font-body)' }}
              >
                {resendState === 'sent' ? '✓ Verification email sent' : resendState === 'sending' ? 'Sending…' : 'Resend verification email →'}
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: 'var(--ink)',
            color: 'var(--bg)',
            border: 'none',
            borderRadius: 'var(--r)',
            padding: '13px 24px',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
            marginTop: '4px',
          }}
        >
          {loading ? 'Signing in…' : 'Sign in →'}
        </button>
      </form>

      <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--ink-2)', textAlign: 'center' }}>
        No account?{' '}
        <Link href="/signup" style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'none', borderBottom: '1px solid var(--ink)' }}>
          Sign up
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
