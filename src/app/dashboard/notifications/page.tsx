'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { GitBranch, Code2, Trophy, Dumbbell, Zap, Bell, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink, Clock } from 'lucide-react'

interface NotifPrefs {
  github_enabled: boolean
  github_inactive_days: number
  leetcode_daily: boolean
  leetcode_contests: boolean
  gym_reminder: boolean
  gym_reminder_time: string
  roadmap_daily: boolean
}

interface NotifLog {
  id: string
  type: string
  title: string
  body: string
  sent_at: string
}

interface LCContest {
  title: string
  startTime: number
  duration: number
}

const DEFAULT_PREFS: NotifPrefs = {
  github_enabled: true,
  github_inactive_days: 7,
  leetcode_daily: true,
  leetcode_contests: true,
  gym_reminder: true,
  gym_reminder_time: '07:00',
  roadmap_daily: true,
}

export default function NotificationsPage() {
  const { profile } = useProfile()
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)
  const [log, setLog] = useState<NotifLog[]>([])
  const [contests, setContests] = useState<LCContest[]>([])
  const [lcStatus, setLcStatus] = useState<{ solved?: number; submittedToday?: boolean } | null>(null)
  const [ghStatus, setGhStatus] = useState<{ lastCommit?: string; daysAgo?: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [testSent, setTestSent] = useState<string | null>(null)
  // 'checking' | 'unsupported' | 'denied' | 'not-subscribed' | 'subscribed'
  const [pushState, setPushState] = useState<'checking' | 'unsupported' | 'denied' | 'not-subscribed' | 'subscribed'>('checking')

  async function checkPushState() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushState('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setPushState('denied')
      return
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (!reg) { setPushState('not-subscribed'); return }
      const sub = await reg.pushManager.getSubscription()
      setPushState(sub ? 'subscribed' : 'not-subscribed')
    } catch {
      setPushState('not-subscribed')
    }
  }

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: p }, { data: l }] = await Promise.all([
      supabase.from('notification_prefs').select('*').eq('user_id', user.id).single(),
      supabase.from('notification_log').select('*').eq('user_id', user.id).order('sent_at', { ascending: false }).limit(20),
    ])
    if (p) setPrefs(p)
    setLog(l ?? [])
    await checkPushState()
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!profile) return

    if (profile.leetcode_username) {
      fetch('/api/leetcode').then(r => r.ok ? r.json() : null).then(d => {
        if (d?.solved) setLcStatus({ solved: d.solved.total, submittedToday: false })
      }).catch(() => {})

      fetch('/api/leetcode/contests').then(r => r.ok ? r.json() : null).then(d => {
        if (d?.contests) setContests(d.contests)
      }).catch(() => {})
    }

    if (profile.github_username) {
      fetch('/api/github/status').then(r => r.ok ? r.json() : null).then(d => {
        if (d) setGhStatus(d)
      }).catch(() => {})
    }
  }, [profile?.github_username, profile?.leetcode_username, profile])

  async function save(updates: Partial<NotifPrefs>) {
    const next = { ...prefs, ...updates }
    setPrefs(next)
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('notification_prefs').upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setSaving(false)
  }

  async function testPush(type: string) {
    setTestSent(type)
    await fetch('/api/push/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) })
    setTimeout(() => setTestSent(null), 3000)
  }

  async function enablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const permission = await Notification.requestPermission()
    if (permission === 'denied') { setPushState('denied'); return }
    if (permission !== 'granted') return
    const existing = await reg.pushManager.getSubscription()
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    })
    await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })
    setPushState('subscribed')
  }

  function formatContestTime(startTime: number) {
    const d = new Date(startTime * 1000)
    const now = Date.now()
    const diff = startTime * 1000 - now
    if (diff < 0) return 'ongoing'
    const h = Math.floor(diff / 3600000)
    if (h < 24) return `in ${h}h`
    return `in ${Math.floor(h / 24)}d`
  }

  return (
    <div style={{ padding: '40px', maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '32px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>
          Notifications
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginTop: '6px' }}>
          Manage alerts for GitHub, LeetCode, gym, and your roadmap.
        </p>
      </div>

      {/* Push status banner */}
      {pushState === 'not-subscribed' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
          padding: '14px 18px', background: '#FDF0D8', border: '1px solid rgba(122,72,0,0.25)',
          borderRadius: 'var(--r)', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={16} color="var(--lc-ink)" />
            <span style={{ fontSize: '14px', color: 'var(--lc-ink)', fontWeight: 500 }}>
              Push not set up — tap Enable to get alerts on this device.
            </span>
          </div>
          <button
            onClick={enablePush}
            style={{ padding: '9px 20px', background: 'var(--lc-ink)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}
          >
            Enable now
          </button>
        </div>
      )}
      {pushState === 'denied' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', background: '#FEF2F2', border: '1px solid rgba(192,57,43,0.2)',
          borderRadius: 'var(--r)', marginBottom: '24px',
        }}>
          <AlertTriangle size={15} color="#c0392b" />
          <div>
            <p style={{ fontSize: '13px', color: '#c0392b', fontWeight: 500 }}>Notifications blocked in your browser.</p>
            <p style={{ fontSize: '12px', color: '#c0392b', marginTop: '2px', opacity: 0.8 }}>
              Go to your browser&apos;s site settings and allow notifications for this site, then reload.
            </p>
          </div>
        </div>
      )}
      {pushState === 'unsupported' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', background: 'var(--bg-panel)', border: '1px solid var(--line)',
          borderRadius: 'var(--r)', marginBottom: '24px', fontSize: '13px', color: 'var(--ink-3)',
        }}>
          <Bell size={14} />
          Push notifications are not supported in this browser.
        </div>
      )}
      {pushState === 'subscribed' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 16px', background: 'var(--java-bg)', border: '1px solid rgba(26,74,60,0.15)',
          borderRadius: 'var(--r)', marginBottom: '24px', fontSize: '13px', color: 'var(--java-ink)',
        }}>
          <CheckCircle2 size={14} />
          Push notifications active on this device. Add to home screen on your phone for native alerts.
        </div>
      )}

      {/* Save indicator */}
      {saving && <p style={{ fontSize: '12px', color: 'var(--ink-3)', marginBottom: '16px' }}>Saving…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── GITHUB ──────────────────────────────────────────── */}
        <div style={{
          borderRadius: 'var(--r)', overflow: 'hidden',
          border: '1px solid #30363d',
          background: '#0d1117',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#21262d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GitBranch size={15} color="#58a6ff" />
              </div>
              <div>
                <p style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, color: '#e6edf3' }}>GitHub Activity</p>
                <p style={{ fontSize: '11px', color: '#8b949e', marginTop: '1px' }}>Weekly inactivity alert</p>
              </div>
            </div>
            <Toggle checked={prefs.github_enabled} onChange={v => save({ github_enabled: v })} activeColor="#58a6ff" />
          </div>
          <div style={{ padding: '16px 20px' }}>
            {/* Status */}
            {profile?.github_username ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: ghStatus?.daysAgo !== undefined && ghStatus.daysAgo > prefs.github_inactive_days ? '#f85149' : '#3fb950' }} />
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#8b949e' }}>
                    {ghStatus?.lastCommit ? `Last push: ${ghStatus.lastCommit}` : `@${profile.github_username}`}
                  </span>
                </div>
                <a
                  href={`https://github.com/${profile.github_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#58a6ff', textDecoration: 'none', fontFamily: 'monospace' }}
                >
                  github.com/{profile.github_username} <ExternalLink size={11} />
                </a>
              </div>
            ) : (
              <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#f85149', marginBottom: '14px' }}>
                ⚠ No GitHub username set — <a href="/dashboard/settings" style={{ color: '#58a6ff' }}>add in settings</a>
              </p>
            )}
            {/* Config row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#8b949e' }}>Alert if no commit for</span>
                <select
                  value={prefs.github_inactive_days}
                  onChange={e => save({ github_inactive_days: parseInt(e.target.value) })}
                  style={{ background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', fontFamily: 'monospace', cursor: 'pointer' }}
                >
                  {[3, 5, 7, 14].map(d => <option key={d} value={d}>{d} days</option>)}
                </select>
              </div>
              <button onClick={() => testPush('github')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#21262d', border: '1px solid #30363d', borderRadius: '4px', color: testSent === 'github' ? '#3fb950' : '#8b949e', fontSize: '11px', fontFamily: 'monospace', cursor: 'pointer' }}>
                {testSent === 'github' ? <CheckCircle2 size={11} /> : <RefreshCw size={11} />}
                {testSent === 'github' ? 'Sent!' : 'Test push'}
              </button>
            </div>
          </div>
        </div>

        {/* ── LEETCODE DAILY ─────────────────────────────────── */}
        <div style={{
          borderRadius: 'var(--r)', overflow: 'hidden',
          border: '1px solid rgba(122,72,0,0.25)',
          background: '#FDF8F0',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(122,72,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--lc-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Code2 size={15} color="var(--lc-ink)" />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--lc-ink)' }}>LeetCode Daily</p>
                <p style={{ fontSize: '11px', color: '#a0784a', marginTop: '1px' }}>Daily problem reminder + submission check</p>
              </div>
            </div>
            <Toggle checked={prefs.leetcode_daily} onChange={v => save({ leetcode_daily: v })} activeColor="var(--lc-ink)" />
          </div>
          <div style={{ padding: '16px 20px' }}>
            {profile?.leetcode_username ? (
              <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: lcStatus?.submittedToday ? '#3fb950' : 'var(--lc-ink)' }} />
                  <span style={{ fontSize: '12px', color: '#a0784a' }}>
                    {lcStatus?.submittedToday ? 'Solved today ✓' : lcStatus?.solved !== undefined ? `${lcStatus.solved} solved total` : `@${profile.leetcode_username}`}
                  </span>
                </div>
                <a
                  href={`https://leetcode.com/${profile.leetcode_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--lc-ink)', textDecoration: 'none' }}
                >
                  leetcode.com ↗
                </a>
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--lc-ink)', marginBottom: '14px' }}>
                ⚠ No LeetCode username — <a href="/dashboard/settings" style={{ color: 'var(--lc-ink)', fontWeight: 600 }}>add it in settings</a>
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <p style={{ fontSize: '11px', color: '#a0784a' }}>
                Fires at your study time · linked to today&apos;s roadmap task
              </p>
              <button onClick={() => testPush('leetcode_daily')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--lc-bg)', border: '1px solid rgba(122,72,0,0.25)', borderRadius: 'var(--r)', color: testSent === 'leetcode_daily' ? '#3a7a20' : 'var(--lc-ink)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                {testSent === 'leetcode_daily' ? <CheckCircle2 size={11} /> : <RefreshCw size={11} />}
                {testSent === 'leetcode_daily' ? 'Sent!' : 'Test push'}
              </button>
            </div>
          </div>
        </div>

        {/* ── LEETCODE CONTESTS ──────────────────────────────── */}
        <div style={{
          borderRadius: 'var(--r)', overflow: 'hidden',
          border: '1px solid rgba(61,31,138,0.25)',
          background: '#F6F2FE',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(61,31,138,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--dsa-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trophy size={15} color="var(--dsa-ink)" />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dsa-ink)' }}>Contest Alerts</p>
                <p style={{ fontSize: '11px', color: '#6650a4', marginTop: '1px' }}>LeetCode weekly + biweekly contest reminders</p>
              </div>
            </div>
            <Toggle checked={prefs.leetcode_contests} onChange={v => save({ leetcode_contests: v })} activeColor="var(--dsa-ink)" />
          </div>
          <div style={{ padding: '16px 20px' }}>
            {/* Upcoming contests */}
            {contests.length > 0 ? (
              <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {contests.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--dsa-bg)', borderRadius: 'var(--r)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={12} color="var(--dsa-ink)" />
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--dsa-ink)' }}>{c.title}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--dsa-ink)', fontWeight: 600 }}>{formatContestTime(c.startTime)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: '#6650a4', marginBottom: '14px' }}>
                Alerts 1 hour before each contest starts. No upcoming contests found.
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => testPush('contest')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--dsa-bg)', border: '1px solid rgba(61,31,138,0.25)', borderRadius: 'var(--r)', color: testSent === 'contest' ? '#3a7a20' : 'var(--dsa-ink)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                {testSent === 'contest' ? <CheckCircle2 size={11} /> : <RefreshCw size={11} />}
                {testSent === 'contest' ? 'Sent!' : 'Test push'}
              </button>
            </div>
          </div>
        </div>

        {/* ── GYM ─────────────────────────────────────────────── */}
        <div style={{
          borderRadius: 'var(--r)', overflow: 'hidden',
          border: '1px solid rgba(122,32,32,0.25)',
          background: '#FFF5F5',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(122,32,32,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--rev-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Dumbbell size={15} color="var(--rev-ink)" />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--rev-ink)' }}>Gym Reminder</p>
                <p style={{ fontSize: '11px', color: '#a03030', marginTop: '1px' }}>Morning nudge based on your split</p>
              </div>
            </div>
            <Toggle checked={prefs.gym_reminder} onChange={v => save({ gym_reminder: v })} activeColor="var(--rev-ink)" />
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#a03030' }}>Remind me at</span>
                <input
                  type="time"
                  value={prefs.gym_reminder_time}
                  onChange={e => save({ gym_reminder_time: e.target.value })}
                  style={{ padding: '5px 10px', background: 'var(--rev-bg)', border: '1px solid rgba(122,32,32,0.25)', borderRadius: 'var(--r)', color: 'var(--rev-ink)', fontSize: '13px', fontFamily: 'var(--font-body)', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href="/dashboard/gym" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'var(--rev-bg)', border: '1px solid rgba(122,32,32,0.25)', borderRadius: 'var(--r)', color: 'var(--rev-ink)', fontSize: '11px', textDecoration: 'none' }}>
                  Edit split ↗
                </a>
                <button onClick={() => testPush('gym')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--rev-bg)', border: '1px solid rgba(122,32,32,0.25)', borderRadius: 'var(--r)', color: testSent === 'gym' ? '#3a7a20' : 'var(--rev-ink)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  {testSent === 'gym' ? <CheckCircle2 size={11} /> : <RefreshCw size={11} />}
                  {testSent === 'gym' ? 'Sent!' : 'Test push'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── ROADMAP DAILY ──────────────────────────────────── */}
        <div style={{
          borderRadius: 'var(--r)', overflow: 'hidden',
          border: '1px solid var(--line-strong)',
          background: 'var(--bg-panel)',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={15} color="var(--ink)" />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>Daily Digest</p>
                <p style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '1px' }}>Today&apos;s roadmap tasks at your study time</p>
              </div>
            </div>
            <Toggle checked={prefs.roadmap_daily} onChange={v => save({ roadmap_daily: v })} activeColor="var(--ink)" />
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '12px', color: 'var(--ink-3)' }}>Fires at your onboarding study time · includes today&apos;s tasks</p>
              <button onClick={() => testPush('roadmap')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--bg-hover)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', color: testSent === 'roadmap' ? 'var(--java-ink)' : 'var(--ink-2)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                {testSent === 'roadmap' ? <CheckCircle2 size={11} /> : <RefreshCw size={11} />}
                {testSent === 'roadmap' ? 'Sent!' : 'Test push'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Recent notification log */}
      <div style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            Recent Notifications Sent
          </h2>
          <button
            onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '11px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
        {log.length > 0 ? (
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            {log.map((entry, i) => (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px',
                padding: '12px 18px',
                borderBottom: i < log.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: TYPE_BG[entry.type] ?? 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>
                  {TYPE_ICON[entry.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{entry.title}</p>
                  <p style={{ fontSize: '12px', color: 'var(--ink-3)', marginTop: '2px' }}>{entry.body}</p>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--ink-3)', whiteSpace: 'nowrap', marginTop: '2px' }}>
                  {new Date(entry.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--ink-3)', padding: '16px 0' }}>No notifications sent yet.</p>
        )}
      </div>
    </div>
  )
}

const TYPE_BG: Record<string, string> = {
  github: '#21262d',
  leetcode_daily: 'var(--lc-bg)',
  leetcode_contest: 'var(--dsa-bg)',
  gym: 'var(--rev-bg)',
  roadmap: 'var(--bg-hover)',
}
const TYPE_ICON: Record<string, React.ReactNode> = {
  github: <GitBranch size={13} color="#58a6ff" />,
  leetcode_daily: <Code2 size={13} color="var(--lc-ink)" />,
  leetcode_contest: <Trophy size={13} color="var(--dsa-ink)" />,
  gym: <Dumbbell size={13} color="var(--rev-ink)" />,
  roadmap: <Zap size={13} color="var(--ink)" />,
}

function Toggle({ checked, onChange, activeColor }: { checked: boolean; onChange: (v: boolean) => void; activeColor: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '40px', height: '22px',
        borderRadius: '11px',
        border: 'none', cursor: 'pointer',
        background: checked ? activeColor : 'var(--line-strong)',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: '3px',
        left: checked ? '21px' : '3px',
        width: '16px', height: '16px',
        borderRadius: '50%',
        background: checked ? '#fff' : 'var(--ink-3)',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}
