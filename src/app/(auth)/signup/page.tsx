'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  function friendlyError(msg: string) {
    if (msg.includes('already registered') || msg.includes('already been registered')) return 'An account with this email already exists. Sign in instead.'
    if (msg.includes('Password should be') || msg.includes('password')) return 'Password must be at least 8 characters.'
    if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts. Please wait a few minutes and try again.'
    if (msg.includes('valid email') || msg.includes('email address')) return 'Please enter a valid email address.'
    return msg
  }

  async function recordConsent(userId: string) {
    const consents = [
      { type: 'terms_and_conditions' as const, accepted: true },
      { type: 'privacy_policy' as const, accepted: true },
      { type: 'marketing_emails' as const, accepted: marketingConsent },
    ]
    try {
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, email, consents }),
      })
    } catch {
      // Non-blocking — signup still proceeds
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!termsAccepted) {
      setError('You must accept the Terms & Conditions and Privacy Policy to create an account.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (signupError) { setError(friendlyError(signupError.message)); setLoading(false); return }
    if (data.user) await recordConsent(data.user.id)
    setDone(true)
    setLoading(false)
  }

  async function handleGoogle() {
    if (!termsAccepted) {
      setError('You must accept the Terms & Conditions and Privacy Policy before continuing.')
      return
    }
    // Store consent intent in sessionStorage; the callback route will pick it up
    sessionStorage.setItem('pending_marketing_consent', marketingConsent ? 'true' : 'false')
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?consent=1` },
    })
  }

  async function resendVerification() {
    setResendState('sending')
    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email })
    setResendState('sent')
  }

  if (done) return (
    <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
      <div style={{ width: '48px', height: '48px', background: 'var(--ink)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20,6 9,17 4,12" />
        </svg>
      </div>
      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: '8px' }}>Check your inbox</h2>
      <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6 }}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to sign in.</p>
      <button
        onClick={resendVerification}
        disabled={resendState !== 'idle'}
        style={{ marginTop: '20px', fontSize: '13px', color: resendState === 'sent' ? 'var(--ink-3)' : 'var(--ink)', background: 'none', border: 'none', padding: 0, cursor: resendState === 'idle' ? 'pointer' : 'default', textDecoration: resendState === 'idle' ? 'underline' : 'none', fontFamily: 'var(--font-body)' }}
      >
        {resendState === 'sent' ? '✓ Email resent' : resendState === 'sending' ? 'Sending…' : 'Didn\'t get it? Resend →'}
      </button>
    </div>
  )

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-panel)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)',
    padding: '12px 14px', fontSize: '14px', color: 'var(--ink)', outline: 'none',
    width: '100%', fontFamily: 'var(--font-body)', boxSizing: 'border-box',
  }

  return (
    <div style={{ width: '100%', maxWidth: '400px' }}>
      <div style={{ marginBottom: '48px' }}>
        <Link href="/" style={{ fontSize: '12px', color: 'var(--ink-3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>← Home</Link>
        <p style={{ fontFamily: 'var(--font-head)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>Codeine</p>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '36px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>Start your journey</h1>
        <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--ink-2)' }}>DSA. Java. Streaks. Every single day.</p>
      </div>

      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Swayam" style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="Min. 8 characters" style={inputStyle} />
        </div>

        {/* ── Consent checkboxes — DPDP compliant: separate, unchecked by default ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--bg-panel)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)' }}>
          {/* Required: T&C + Privacy Policy */}
          <label style={{ display: 'flex', gap: '12px', cursor: 'pointer', alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              style={{ marginTop: '2px', flexShrink: 0, accentColor: 'var(--ink)', width: 16, height: 16, cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
              I have read and agree to the{' '}
              <Link href="/terms" target="_blank" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>Terms & Conditions</Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>Privacy Policy</Link>
              .{' '}<span style={{ color: '#c0392b', fontWeight: 600 }}>Required</span>
            </span>
          </label>

          <div style={{ height: 1, background: 'var(--line)' }} />

          {/* Optional: marketing emails */}
          <label style={{ display: 'flex', gap: '12px', cursor: 'pointer', alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={e => setMarketingConsent(e.target.checked)}
              style={{ marginTop: '2px', flexShrink: 0, accentColor: 'var(--ink)', width: 16, height: 16, cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
              I agree to receive occasional updates and product news from Codeine by email.{' '}
              <span style={{ color: 'var(--ink-3)' }}>Optional — you can change this any time in Settings.</span>
            </span>
          </label>
        </div>

        {error && (
          <p style={{ fontSize: '13px', color: '#c0392b', background: '#fdf0f0', border: '1px solid #f5c6cb', borderRadius: 'var(--r)', padding: '10px 12px' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--r)', padding: '13px 24px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: '4px' }}
        >
          {loading ? 'Creating account…' : 'Create account →'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--line-strong)' }} />
        <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--line-strong)' }} />
      </div>

      <button
        onClick={handleGoogle}
        style={{ width: '100%', background: 'var(--bg-panel)', color: 'var(--ink)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', padding: '12px 24px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>
      <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.5 }}>
        By continuing with Google, you confirm you have read and accept our{' '}
        <Link href="/terms" target="_blank" style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>Terms</Link> and{' '}
        <Link href="/privacy" target="_blank" style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>Privacy Policy</Link>.
      </p>

      <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--ink-2)', textAlign: 'center' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'none', borderBottom: '1px solid var(--ink)' }}>Sign in</Link>
      </p>
    </div>
  )
}
