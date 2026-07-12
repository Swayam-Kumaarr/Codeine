'use client'
import { useEffect, useState } from 'react'
import { useProfile } from '@/lib/hooks/useProfile'
import { ExternalLink, Code2, Flame, CalendarDays, Trophy } from 'lucide-react'

interface LCData {
  username: string
  solved: { total: number; easy: number; medium: number; hard: number }
  streak: number
  activeDays: number
}

export default function LeetCodePage() {
  const { profile } = useProfile()
  const [data, setData] = useState<LCData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/leetcode')
      .then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => Promise.reject(e.error)))
      .then(setData)
      .catch(e => setError(typeof e === 'string' ? e : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const username = profile?.leetcode_username

  return (
    <div style={{ padding: '32px 24px', maxWidth: '680px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Code2 size={20} color="var(--lc-ink)" />
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)' }}>LeetCode</h1>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>Your problem-solving stats and progress</p>
      </div>

      {!username && (
        <div style={{ padding: '20px', background: 'var(--lc-bg)', border: '1px solid rgba(122,72,0,0.2)', borderRadius: 'var(--r)', marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', color: 'var(--lc-ink)', fontWeight: 500, marginBottom: '6px' }}>No LeetCode username set</p>
          <p style={{ fontSize: '13px', color: 'var(--lc-ink)', opacity: 0.8, marginBottom: '12px' }}>Add your username in Settings to see your stats here.</p>
          <a href="/dashboard/settings" style={{ fontSize: '13px', color: 'var(--lc-ink)', fontWeight: 600, textDecoration: 'underline' }}>Go to Settings →</a>
        </div>
      )}

      {loading && username && (
        <p style={{ fontSize: '14px', color: 'var(--ink-3)' }}>Loading stats…</p>
      )}

      {error && (
        <div style={{ padding: '14px 16px', background: 'var(--rev-bg)', border: '1px solid var(--rev-ink)', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--rev-ink)', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Total Solved', value: data.solved.total, icon: Trophy, color: 'var(--lc-ink)' },
              { label: 'Streak', value: `${data.streak} days`, icon: Flame, color: 'var(--rev-ink)' },
              { label: 'Active Days', value: data.activeDays, icon: CalendarDays, color: 'var(--dsa-ink)' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Icon size={13} color={color} />
                  <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{label}</span>
                </div>
                <p style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.04em', color, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
              </div>
            ))}

            {/* Difficulty breakdown */}
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '18px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '12px' }}>By Difficulty</p>
              {[
                { label: 'Easy', count: data.solved.easy, color: '#2db55d' },
                { label: 'Med', count: data.solved.medium, color: '#ffa116' },
                { label: 'Hard', count: data.solved.hard, color: '#ef4743' },
              ].map(({ label, count, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-head)', fontSize: '16px', fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Open on LeetCode */}
          <a
            href={`https://leetcode.com/${data.username}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'var(--lc-bg)', border: '1px solid rgba(122,72,0,0.2)', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--lc-ink)', fontWeight: 500, textDecoration: 'none' }}
          >
            <ExternalLink size={13} />
            Open @{data.username} on LeetCode
          </a>
        </>
      )}
    </div>
  )
}
