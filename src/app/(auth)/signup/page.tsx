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
  const [confirmPassword, setConfirmPassword] = useState('')
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
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Re-enter password" style={inputStyle} />
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

      <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--ink-2)', textAlign: 'center' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'none', borderBottom: '1px solid var(--ink)' }}>Sign in</Link>
      </p>
    </div>
  )
}
