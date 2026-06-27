'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TimePicker from '@/components/TimePicker'

const STEPS = ['About you', 'Journeys', 'Schedule', 'GitHub', 'LeetCode']

export default function OnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase.from('profiles').select('onboarded').eq('id', user.id).single()
      if (data?.onboarded) router.replace('/dashboard')
    })
  }, [router])
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [journeys, setJourneys] = useState<string[]>([])
  const [studyTime, setStudyTime] = useState('09:00')
  const [github, setGithub] = useState('')
  const [leetcode, setLeetcode] = useState('')

  function toggleJourney(id: string) {
    setJourneys(prev =>
      prev.includes(id) ? prev.filter(j => j !== id) : [...prev, id]
    )
  }

  async function finish() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    await supabase.from('profiles').update({
      name: name || user.user_metadata.name || 'Coder',
      github_username: github || null,
      leetcode_username: leetcode || null,
      study_time: studyTime,
      onboarded: true,
    }).eq('id', user.id)

    for (const roadmap_id of journeys) {
      await supabase.from('journeys').upsert({
        user_id: user.id,
        roadmap_id,
        started_at: new Date().toISOString().split('T')[0],
      }, { onConflict: 'user_id,roadmap_id' })
    }

    router.push('/dashboard')
    router.refresh()
  }

  const canNext = () => {
    if (step === 0) return name.trim().length > 0
    if (step === 1) return journeys.length > 0
    return true
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else finish()
  }

  const pct = (step / (STEPS.length - 1)) * 100

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '2px', background: 'var(--line)' }}>
        <div style={{ height: '100%', background: 'var(--ink)', width: `${pct}%`, transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>

      {/* Logo */}
      <div style={{ position: 'fixed', top: '24px', left: '32px', fontFamily: 'var(--font-head)', fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
        Codeine
      </div>

      {/* Step counter */}
      <div style={{ position: 'fixed', top: '28px', right: '32px', fontSize: '12px', color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
        {step + 1} / {STEPS.length}
      </div>

      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Step label */}
        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '16px' }}>
          {STEPS[step]}
        </p>

        {/* Step 0: Name */}
        {step === 0 && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '40px', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '32px' }}>
              What should we call you?
            </h2>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canNext() && next()}
              placeholder="Your name"
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '2px solid var(--ink)', padding: '12px 0', fontSize: '24px', fontFamily: 'var(--font-head)', color: 'var(--ink)', outline: 'none', letterSpacing: '-0.02em' }}
            />
          </div>
        )}

        {/* Step 1: Journeys */}
        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '40px', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '12px' }}>
              Which journeys are you starting?
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginBottom: '32px' }}>You can track your progress day by day from today.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { id: 'dsa', label: 'DSA in C', sub: '118 days · 9 topics · Arrays → Sorting', color: 'var(--dsa-bg)', ink: 'var(--dsa-ink)' },
                { id: 'java', label: 'Java OOP', sub: '83 days · 9 topics · Syntax → Advanced', color: 'var(--java-bg)', ink: 'var(--java-ink)' },
              ].map(j => {
                const selected = journeys.includes(j.id)
                return (
                  <button
                    key={j.id}
                    onClick={() => toggleJourney(j.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '20px',
                      background: selected ? j.color : 'var(--bg-panel)',
                      border: selected ? `2px solid ${j.ink}` : '2px solid transparent',
                      borderRadius: 'var(--r)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      <p style={{ fontFamily: 'var(--font-head)', fontSize: '18px', fontWeight: 600, color: selected ? j.ink : 'var(--ink)', marginBottom: '4px' }}>{j.label}</p>
                      <p style={{ fontSize: '13px', color: selected ? j.ink : 'var(--ink-2)', opacity: 0.8 }}>{j.sub}</p>
                    </div>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${selected ? j.ink : 'var(--line-strong)'}`, background: selected ? j.ink : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Study time — custom scroll picker */}
        {step === 2 && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '40px', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '12px' }}>
              When do you usually study?
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginBottom: '36px' }}>We&apos;ll send your daily digest at this time.</p>

            <TimePicker value={studyTime} onChange={setStudyTime} />

            <p style={{ marginTop: '20px', fontSize: '13px', color: 'var(--ink-3)' }}>
              Selected: <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-head)' }}>
                {(() => {
                  const [h24Str, m] = studyTime.split(':')
                  const h24 = parseInt(h24Str)
                  const h12 = h24 % 12 || 12
                  const p = h24 >= 12 ? 'PM' : 'AM'
                  return `${h12}:${m} ${p}`
                })()}
              </strong>
            </p>
          </div>
        )}

        {/* Step 3: GitHub */}
        {step === 3 && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '40px', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '12px' }}>
              Connect GitHub
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginBottom: '28px' }}>
              We&apos;ll alert you if you haven&apos;t committed in 2 days. Optional.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0', borderBottom: '2px solid var(--ink)' }}>
              <span style={{ fontSize: '24px', fontFamily: 'var(--font-head)', color: 'var(--ink-3)', paddingBottom: '12px' }}>github.com/</span>
              <input
                autoFocus
                type="text"
                value={github}
                onChange={e => setGithub(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && next()}
                placeholder="username"
                style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px 4px', fontSize: '24px', fontFamily: 'var(--font-head)', color: 'var(--ink)', outline: 'none', letterSpacing: '-0.02em' }}
              />
            </div>
          </div>
        )}

        {/* Step 4: LeetCode */}
        {step === 4 && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '40px', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '12px' }}>
              Your LeetCode username
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginBottom: '32px' }}>We&apos;ll pull your solve stats to the dashboard. Optional.</p>
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--ink)' }}>
              <span style={{ fontSize: '24px', fontFamily: 'var(--font-head)', color: 'var(--ink-3)', paddingBottom: '12px' }}>leetcode.com/</span>
              <input
                autoFocus
                type="text"
                value={leetcode}
                onChange={e => setLeetcode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && next()}
                placeholder="username"
                style={{ flex: 1, background: 'transparent', border: 'none', padding: '12px 4px', fontSize: '24px', fontFamily: 'var(--font-head)', color: 'var(--ink)', outline: 'none', letterSpacing: '-0.02em' }}
              />
            </div>
          </div>
        )}

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '48px' }}>
          <button
            onClick={() => setStep(s => s - 1)}
            style={{ visibility: step === 0 ? 'hidden' : 'visible', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', padding: '12px 20px', fontSize: '14px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            ← Back
          </button>

          <button
            onClick={next}
            disabled={!canNext() || saving}
            style={{
              background: canNext() && !saving ? 'var(--ink)' : 'var(--line-strong)',
              color: canNext() && !saving ? 'var(--bg)' : 'var(--ink-3)',
              border: 'none',
              borderRadius: 'var(--r)',
              padding: '13px 32px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: canNext() && !saving ? 'pointer' : 'default',
              fontFamily: 'var(--font-body)',
              transition: 'all 0.2s ease',
            }}
          >
            {saving ? 'Setting up…' : step === STEPS.length - 1 ? "Let's go →" : 'Continue →'}
          </button>
        </div>

        {/* Skip on optional steps */}
        {(step === 3 || step === 4) && (
          <p style={{ textAlign: 'center', marginTop: '16px' }}>
            <button onClick={next} style={{ background: 'none', border: 'none', fontSize: '13px', color: 'var(--ink-3)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Skip for now
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
