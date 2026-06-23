'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ALL_ROADMAPS, getDayNumber, getCurrentTopic,
  type Roadmap, type Topic,
} from '@/data/roadmaps'

interface Journey { roadmap_id: string; started_at: string }

const S = {
  page: { padding: '40px 48px 80px', maxWidth: 1100, fontFamily: 'var(--font-body, Inter, sans-serif)' } as React.CSSProperties,
  pageHeader: { marginBottom: 48, borderBottom: '1px solid var(--line)', paddingBottom: 32 } as React.CSSProperties,
  h1: { fontFamily: 'var(--font-head)', fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--ink)', marginBottom: 8 } as React.CSSProperties,
  sub: { fontSize: 14, color: 'var(--ink-2)' } as React.CSSProperties,
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 1 } as React.CSSProperties,
  roadmapCard: { background: 'var(--bg)', padding: '40px 40px 36px' } as React.CSSProperties,
  roadmapName: { fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink)', marginBottom: 4 } as React.CSSProperties,
  roadmapTagline: { fontSize: 13, color: 'var(--ink-3)', marginBottom: 28 } as React.CSSProperties,
  metaRow: { display: 'flex', gap: 24, marginBottom: 28 } as React.CSSProperties,
  metaItem: { display: 'flex', flexDirection: 'column' as const, gap: 3 },
  metaLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--ink-3)' } as React.CSSProperties,
  metaValue: { fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' } as React.CSSProperties,
  startBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44, transition: 'opacity 150ms' } as React.CSSProperties,
  resetBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'transparent', color: 'var(--ink-3)', border: '1px solid var(--line-strong)', borderRadius: 3, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 } as React.CSSProperties,
}

function ActiveJourney({ roadmap, startISO, onReset }: { roadmap: Roadmap; startISO: string; onReset: () => void }) {
  const dayNum = getDayNumber(startISO)
  const isComplete = dayNum > roadmap.totalDays
  const clampedDay = Math.min(dayNum, roadmap.totalDays)
  const { topic, dayWithinTopic } = getCurrentTopic(roadmap, clampedDay)
  const pct = Math.round((clampedDay / roadmap.totalDays) * 100)
  const topicsCompleted = roadmap.topics.filter(t => clampedDay > t.endDay).length
  const startDate = new Date(startISO).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={S.metaRow}>
        <div style={S.metaItem}><span style={S.metaLabel}>Started</span><span style={{ ...S.metaValue, fontSize: 16 }}>{startDate}</span></div>
        <div style={S.metaItem}><span style={S.metaLabel}>Day</span><span style={S.metaValue}>{clampedDay}<span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 400 }}>/{roadmap.totalDays}</span></span></div>
        <div style={S.metaItem}><span style={S.metaLabel}>Topics done</span><span style={S.metaValue}>{topicsCompleted}<span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 400 }}>/{roadmap.topics.length}</span></span></div>
        <div style={S.metaItem}><span style={S.metaLabel}>Progress</span><span style={S.metaValue}>{pct}%</span></div>
      </div>

      <div style={{ height: 2, background: 'var(--line-strong)', marginBottom: 28, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: roadmap.id === 'java' ? '#1A4A3C' : '#3D1F8A', transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
      </div>

      {!isComplete && <TodayFocus topic={topic} dayWithinTopic={dayWithinTopic} roadmap={roadmap} />}
      {isComplete && (
        <div style={{ padding: '20px 24px', background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 3, marginBottom: 28 }}>
          <p style={{ fontSize: 20, fontFamily: 'var(--font-head)', fontWeight: 600 }}>Journey complete 🎉</p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>You finished {roadmap.name} in {dayNum} days.</p>
        </div>
      )}

      <button style={S.resetBtn} onClick={onReset}>↺ Reset journey</button>
    </div>
  )
}

function TodayFocus({ topic, dayWithinTopic, roadmap }: { topic: Topic; dayWithinTopic: number; roadmap: Roadmap }) {
  const accent = roadmap.id === 'java' ? '#1A4A3C' : '#3D1F8A'
  const accentMuted = roadmap.id === 'java' ? '#E0EDEA' : '#EDE8F7'
  const todaySchedule = topic.schedule.find(s => {
    const m = s.days.match(/(\d+)(?:[–-](\d+))?/)
    if (!m) return false
    const from = parseInt(m[1])
    const to = m[2] ? parseInt(m[2]) : from
    return dayWithinTopic >= from && dayWithinTopic <= to
  }) ?? topic.schedule[topic.schedule.length - 1]

  return (
    <div style={{ border: '1px solid var(--line)', borderLeft: `3px solid ${accent}`, borderRadius: 3, overflow: 'hidden', marginBottom: 28 }}>
      <div style={{ padding: '16px 20px', background: accentMuted, borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent, marginBottom: 4 }}>TODAY — Day {dayWithinTopic} of {topic.durationDays}</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Topic {topic.number}: {topic.name}</div>
        </div>
        <div style={{ fontSize: 11, color: accent, border: `1px solid ${accent}`, borderRadius: 99, padding: '4px 10px', whiteSpace: 'nowrap', flexShrink: 0, opacity: 0.7 }}>Day {topic.startDay}–{topic.endDay}</div>
      </div>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>What to do today</div>
        <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>{todaySchedule.activity}</p>
      </div>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>Full schedule for this topic</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topic.schedule.map((s, i) => {
            const m = s.days.match(/(\d+)(?:[–-](\d+))?/)
            const from = m ? parseInt(m[1]) : 99
            const to = m && m[2] ? parseInt(m[2]) : from
            const isPast = dayWithinTopic > to
            const isCurrent = dayWithinTopic >= from && dayWithinTopic <= to
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, opacity: isPast ? 0.45 : 1 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: isCurrent ? accent : isPast ? 'var(--ink-3)' : 'var(--line-strong)' }} />
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: isCurrent ? accent : 'var(--ink-3)', marginRight: 8 }}>{s.days}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{s.activity}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TopicTimeline({ roadmap, currentDay, expanded, onToggle }: { roadmap: Roadmap; currentDay: number; expanded: boolean; onToggle: () => void }) {
  const accent = roadmap.id === 'java' ? '#1A4A3C' : '#3D1F8A'
  const accentMuted = roadmap.id === 'java' ? '#E0EDEA' : '#EDE8F7'
  return (
    <div>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', background: 'transparent', border: 'none', borderTop: '1px solid var(--line)', cursor: 'pointer', fontFamily: 'inherit' }} aria-expanded={expanded}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-2)' }}>Full roadmap — {roadmap.topics.length} topics</span>
        <span style={{ fontSize: 18, color: 'var(--ink-3)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>↓</span>
      </button>
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {roadmap.topics.map(topic => {
            const isDone = currentDay > topic.endDay
            const isCurrent = currentDay >= topic.startDay && currentDay <= topic.endDay
            const isLocked = currentDay < topic.startDay
            return <TopicRow key={topic.number} topic={topic} isDone={isDone} isCurrent={isCurrent} isLocked={isLocked} accent={accent} accentMuted={accentMuted} />
          })}
        </div>
      )}
    </div>
  )
}

function TopicRow({ topic, isDone, isCurrent, isLocked, accent, accentMuted }: { topic: Topic; isDone: boolean; isCurrent: boolean; isLocked: boolean; accent: string; accentMuted: string }) {
  const [open, setOpen] = useState(isCurrent)
  return (
    <div style={{ background: isCurrent ? accentMuted : 'var(--bg)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', background: 'transparent', border: 'none', cursor: isLocked ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'left' }} aria-expanded={open} disabled={isLocked && !open}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isDone ? '#22c55e' : isCurrent ? accent : 'var(--line-strong)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 500, color: isLocked ? 'var(--ink-3)' : 'var(--ink)', textDecoration: isDone ? 'line-through' : 'none' }}>T{topic.number}: {topic.name}</span>
            {isCurrent && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: accent, color: '#fff', letterSpacing: '0.06em' }}>ACTIVE</span>}
            {isDone && <span style={{ fontSize: 11, color: '#22c55e' }}>✓ Done</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>Day {topic.startDay}–{topic.endDay}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{topic.durationDays} days</div>
        </div>
        {!isLocked && <span style={{ fontSize: 14, color: 'var(--ink-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms', flexShrink: 0 }}>↓</span>}
      </button>
      {open && !isLocked && (
        <div style={{ padding: '0 20px 20px 44px', borderTop: '1px solid var(--line)' }}>
          <div style={{ marginBottom: 16, paddingTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>Schedule</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topic.schedule.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink-2)', minWidth: 72, flexShrink: 0 }}>{s.days}</span>
                  <span style={{ color: 'var(--ink-2)' }}>{s.activity}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>Subtopics ({topic.subtopics.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: topic.subtopics.length > 8 ? '1fr 1fr' : '1fr', gap: '4px 32px' }}>
              {topic.subtopics.map((sub, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5, paddingTop: 2 }}>
                  <span style={{ flexShrink: 0, marginTop: 5, width: 3, height: 3, borderRadius: '50%', background: 'var(--ink-3)' }} />
                  {sub}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NotStarted({ roadmap, onStart }: { roadmap: Roadmap; onStart: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={S.metaRow}>
        <div style={S.metaItem}><span style={S.metaLabel}>Topics</span><span style={S.metaValue}>{roadmap.topics.length}</span></div>
        <div style={S.metaItem}><span style={S.metaLabel}>Total days</span><span style={S.metaValue}>{roadmap.totalDays}</span></div>
        <div style={S.metaItem}><span style={S.metaLabel}>Duration</span><span style={{ ...S.metaValue, fontSize: 18 }}>{roadmap.durationLabel}</span></div>
      </div>
      <div style={{ padding: '24px', background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 3, marginBottom: 28 }}>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7 }}>
          Click <strong>Start today</strong> to begin the journey. From that day, the tracker will tell you exactly what to study each morning.
        </p>
      </div>
      <button style={S.startBtn} onClick={onStart}>Start today →</button>
    </div>
  )
}

function RoadmapPanel({ roadmap, journey, onStart, onReset }: {
  roadmap: Roadmap
  journey: Journey | undefined
  onStart: (id: string) => void
  onReset: (id: string) => void
}) {
  const [timelineOpen, setTimelineOpen] = useState(false)
  const currentDay = journey ? getDayNumber(journey.started_at) : 0

  return (
    <div style={S.roadmapCard}>
      <div style={S.roadmapName}>{roadmap.name}</div>
      <div style={S.roadmapTagline}>{roadmap.tagline}</div>

      {journey ? (
        <ActiveJourney roadmap={roadmap} startISO={journey.started_at} onReset={() => onReset(roadmap.id)} />
      ) : (
        <NotStarted roadmap={roadmap} onStart={() => onStart(roadmap.id)} />
      )}

      <TopicTimeline roadmap={roadmap} currentDay={currentDay} expanded={timelineOpen} onToggle={() => setTimelineOpen(o => !o)} />
    </div>
  )
}

export default function RoadmapsPage() {
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from('journeys').select('roadmap_id,started_at').eq('user_id', user.id)
    setJourneys(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleStart(roadmapId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('journeys').upsert({ user_id: user.id, roadmap_id: roadmapId, started_at: today }, { onConflict: 'user_id,roadmap_id' })
    await load()
  }

  async function handleReset(roadmapId: string) {
    if (!confirm(`Reset your ${roadmapId.toUpperCase()} journey? This cannot be undone.`)) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('journeys').delete().eq('user_id', user.id).eq('roadmap_id', roadmapId)
    await load()
  }

  if (loading) {
    return <div style={{ padding: '40px', color: 'var(--ink-3)', fontSize: 14 }}>Loading roadmaps…</div>
  }

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <h1 style={S.h1}>Roadmaps</h1>
        <p style={S.sub}>Start a journey. The tracker calculates your exact day and tells you what to study every morning.</p>
      </div>
      <div style={S.grid}>
        {ALL_ROADMAPS.map(rm => (
          <RoadmapPanel
            key={rm.id}
            roadmap={rm}
            journey={journeys.find(j => j.roadmap_id === rm.id)}
            onStart={handleStart}
            onReset={handleReset}
          />
        ))}
      </div>
    </div>
  )
}
