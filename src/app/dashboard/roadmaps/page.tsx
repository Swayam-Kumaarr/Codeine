'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ALL_ROADMAPS, getDayNumber, getCurrentTopic,
  type Roadmap, type Topic,
} from '@/data/roadmaps'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Journey {
  roadmap_id: string
  started_at: string
  paused_at: string | null
  days_paused: number
}

interface CustomTopic {
  id: string
  name: string
  duration_days: number
  position: number
  notes: string | null
}

interface CustomRoadmap {
  id: string
  name: string
  description: string | null
  topics: CustomTopic[]
}

interface CustomJourney {
  custom_roadmap_id: string
  started_at: string
  paused_at: string | null
  days_paused: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getActiveDayNumber(startISO: string, daysPaused: number, pausedAt: string | null): number {
  if (pausedAt) {
    const start = new Date(startISO); start.setHours(0, 0, 0, 0)
    const paused = new Date(pausedAt); paused.setHours(0, 0, 0, 0)
    const diff = Math.floor((paused.getTime() - start.getTime()) / 86_400_000)
    return Math.max(1, diff + 1 - daysPaused)
  }
  return getDayNumber(startISO, daysPaused)
}

function customTotalDays(topics: CustomTopic[]) {
  return topics.reduce((s, t) => s + t.duration_days, 0)
}

function getCustomCurrentTopic(topics: CustomTopic[], dayNumber: number) {
  const sorted = [...topics].sort((a, b) => a.position - b.position)
  let cum = 0
  for (const topic of sorted) {
    cum += topic.duration_days
    if (dayNumber <= cum) {
      return { topic, dayWithinTopic: dayNumber - (cum - topic.duration_days) }
    }
  }
  const last = sorted[sorted.length - 1]
  return { topic: last, dayWithinTopic: last?.duration_days ?? 1 }
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page: { padding: '40px 48px 80px', maxWidth: 1100, fontFamily: 'var(--font-body, Inter, sans-serif)' } as React.CSSProperties,
  pageHeader: { marginBottom: 48, borderBottom: '1px solid var(--line)', paddingBottom: 32 } as React.CSSProperties,
  h1: { fontFamily: 'var(--font-head)', fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: 'var(--ink)', marginBottom: 8 } as React.CSSProperties,
  sub: { fontSize: 14, color: 'var(--ink-2)' } as React.CSSProperties,
  sectionLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--ink-3)', marginBottom: 16 } as React.CSSProperties,
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 1 } as React.CSSProperties,
  card: { background: 'var(--bg)', padding: '40px 40px 36px' } as React.CSSProperties,
  cardName: { fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink)', marginBottom: 4 } as React.CSSProperties,
  cardTagline: { fontSize: 13, color: 'var(--ink-3)', marginBottom: 28 } as React.CSSProperties,
  metaRow: { display: 'flex', gap: 24, flexWrap: 'wrap' as const, marginBottom: 28 } as React.CSSProperties,
  metaItem: { display: 'flex', flexDirection: 'column' as const, gap: 3 },
  metaLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--ink-3)' } as React.CSSProperties,
  metaValue: { fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' } as React.CSSProperties,
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44, transition: 'opacity 150ms' } as React.CSSProperties,
  secondaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'transparent', color: 'var(--ink-3)', border: '1px solid var(--line-strong)', borderRadius: 3, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 } as React.CSSProperties,
  pauseBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'transparent', color: '#b45309', border: '1px solid rgba(180,83,9,0.35)', borderRadius: 3, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 } as React.CSSProperties,
  resumeBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#166534', color: '#fff', border: 'none', borderRadius: 3, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 } as React.CSSProperties,
  dangerBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'transparent', color: '#c0392b', border: '1px solid rgba(192,57,43,0.35)', borderRadius: 3, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 } as React.CSSProperties,
  btnRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' } as React.CSSProperties,
}

// ─── Preset roadmap components ──────────────────────────────────────────────────

function TodayFocus({ topic, dayWithinTopic, roadmap }: { topic: Topic; dayWithinTopic: number; roadmap: Roadmap }) {
  const accent = roadmap.id === 'java' ? '#1A4A3C' : roadmap.id === 'rdbms' ? '#1A2F6A' : '#3D1F8A'
  const accentMuted = roadmap.id === 'java' ? '#E0EDEA' : roadmap.id === 'rdbms' ? '#E8EEF8' : '#EDE8F7'
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
  const accent = roadmap.id === 'java' ? '#1A4A3C' : roadmap.id === 'rdbms' ? '#1A2F6A' : '#3D1F8A'
  const accentMuted = roadmap.id === 'java' ? '#E0EDEA' : roadmap.id === 'rdbms' ? '#E8EEF8' : '#EDE8F7'
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
            return <PresetTopicRow key={topic.number} topic={topic} isDone={isDone} isCurrent={isCurrent} isLocked={isLocked} accent={accent} accentMuted={accentMuted} />
          })}
        </div>
      )}
    </div>
  )
}

function PresetTopicRow({ topic, isDone, isCurrent, isLocked, accent, accentMuted }: { topic: Topic; isDone: boolean; isCurrent: boolean; isLocked: boolean; accent: string; accentMuted: string }) {
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

function ActiveJourney({ roadmap, journey, onPause, onResume, onReset, confirmingReset, onCancelReset }: {
  roadmap: Roadmap
  journey: Journey
  onPause: () => void
  onResume: () => void
  onReset: () => void
  confirmingReset: boolean
  onCancelReset: () => void
}) {
  const isPaused = !!journey.paused_at
  const dayNum = getActiveDayNumber(journey.started_at, journey.days_paused, journey.paused_at)
  const isComplete = dayNum > roadmap.totalDays
  const clampedDay = Math.min(dayNum, roadmap.totalDays)
  const { topic, dayWithinTopic } = getCurrentTopic(roadmap, clampedDay)
  const pct = Math.round((clampedDay / roadmap.totalDays) * 100)
  const topicsCompleted = roadmap.topics.filter(t => clampedDay > t.endDay).length
  const startDate = new Date(journey.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const accent = roadmap.id === 'java' ? '#1A4A3C' : roadmap.id === 'rdbms' ? '#1A2F6A' : '#3D1F8A'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={S.metaRow}>
        <div style={S.metaItem}><span style={S.metaLabel}>Started</span><span style={{ ...S.metaValue, fontSize: 16 }}>{startDate}</span></div>
        <div style={S.metaItem}><span style={S.metaLabel}>Day</span><span style={S.metaValue}>{clampedDay}<span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 400 }}>/{roadmap.totalDays}</span></span></div>
        <div style={S.metaItem}><span style={S.metaLabel}>Topics done</span><span style={S.metaValue}>{topicsCompleted}<span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 400 }}>/{roadmap.topics.length}</span></span></div>
        <div style={S.metaItem}><span style={S.metaLabel}>Progress</span><span style={S.metaValue}>{pct}%</span></div>
        {isPaused && <div style={S.metaItem}><span style={S.metaLabel}>Status</span><span style={{ ...S.metaValue, fontSize: 13, color: '#b45309', border: '1px solid rgba(180,83,9,0.3)', padding: '4px 10px', borderRadius: 99 }}>PAUSED</span></div>}
      </div>

      <div style={{ height: 2, background: 'var(--line-strong)', marginBottom: 28, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: isPaused ? '#b45309' : accent, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)', opacity: isPaused ? 0.6 : 1 }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
      </div>

      {!isComplete && !isPaused && <TodayFocus topic={topic} dayWithinTopic={dayWithinTopic} roadmap={roadmap} />}
      {isPaused && (
        <div style={{ padding: '20px 24px', background: '#FFFBEB', border: '1px solid rgba(180,83,9,0.25)', borderRadius: 3, marginBottom: 28 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Journey paused</p>
          <p style={{ fontSize: 13, color: '#b45309' }}>Paused on {new Date(journey.paused_at!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Resume to continue from Day {clampedDay}.</p>
        </div>
      )}
      {isComplete && !isPaused && (
        <div style={{ padding: '20px 24px', background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 3, marginBottom: 28 }}>
          <p style={{ fontSize: 20, fontFamily: 'var(--font-head)', fontWeight: 600 }}>Journey complete 🎉</p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>You finished {roadmap.name} in {dayNum} days.</p>
        </div>
      )}

      {confirmingReset ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#FEF2F2', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 3 }}>
          <span style={{ fontSize: 13, color: '#c0392b', flex: 1 }}>Reset {roadmap.name}? This cannot be undone.</span>
          <button onClick={onReset} style={S.dangerBtn}>Confirm</button>
          <button onClick={onCancelReset} style={S.secondaryBtn}>Cancel</button>
        </div>
      ) : (
        <div style={S.btnRow}>
          {isPaused
            ? <button style={S.resumeBtn} onClick={onResume}>▶ Resume journey</button>
            : <button style={S.pauseBtn} onClick={onPause}>⏸ Pause journey</button>
          }
          <button style={S.secondaryBtn} onClick={onReset}>↺ Reset</button>
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
      <button style={S.primaryBtn} onClick={onStart}>Start today →</button>
    </div>
  )
}

function RoadmapPanel({ roadmap, journey, onStart, onPause, onResume, onReset, confirmingReset, onCancelReset }: {
  roadmap: Roadmap
  journey: Journey | undefined
  onStart: (id: string) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
  onReset: (id: string) => void
  confirmingReset: boolean
  onCancelReset: () => void
}) {
  const [timelineOpen, setTimelineOpen] = useState(false)
  const currentDay = journey ? getActiveDayNumber(journey.started_at, journey.days_paused, journey.paused_at) : 0

  return (
    <div style={S.card}>
      <div style={S.cardName}>{roadmap.name}</div>
      <div style={S.cardTagline}>{roadmap.tagline}</div>

      {journey ? (
        <ActiveJourney
          roadmap={roadmap}
          journey={journey}
          onPause={() => onPause(roadmap.id)}
          onResume={() => onResume(roadmap.id)}
          onReset={() => onReset(roadmap.id)}
          confirmingReset={confirmingReset}
          onCancelReset={onCancelReset}
        />
      ) : (
        <NotStarted roadmap={roadmap} onStart={() => onStart(roadmap.id)} />
      )}

      <TopicTimeline roadmap={roadmap} currentDay={currentDay} expanded={timelineOpen} onToggle={() => setTimelineOpen(o => !o)} />
    </div>
  )
}

// ─── Custom roadmap components ──────────────────────────────────────────────────

function CustomTopicTimeline({ topics, currentDay, expanded, onToggle }: { topics: CustomTopic[]; currentDay: number; expanded: boolean; onToggle: () => void }) {
  const sorted = [...topics].sort((a, b) => a.position - b.position)
  const accent = '#2563EB'
  let cum = 0
  const rows = sorted.map(t => {
    const start = cum + 1
    cum += t.duration_days
    const end = cum
    const isDone = currentDay > end
    const isCurrent = currentDay >= start && currentDay <= end
    const isLocked = currentDay < start
    return { topic: t, start, end, isDone, isCurrent, isLocked }
  })

  return (
    <div>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', background: 'transparent', border: 'none', borderTop: '1px solid var(--line)', cursor: 'pointer', fontFamily: 'inherit' }} aria-expanded={expanded}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-2)' }}>Topics — {sorted.length}</span>
        <span style={{ fontSize: 18, color: 'var(--ink-3)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>↓</span>
      </button>
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {rows.map(({ topic, start, end, isDone, isCurrent, isLocked }) => (
            <div key={topic.id} style={{ background: isCurrent ? '#EFF6FF' : 'var(--bg)', padding: '14px 20px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5, background: isDone ? '#22c55e' : isCurrent ? accent : 'var(--line-strong)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: topic.notes ? 4 : 0 }}>
                  <span style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 500, color: isLocked ? 'var(--ink-3)' : 'var(--ink)', textDecoration: isDone ? 'line-through' : 'none' }}>{topic.name}</span>
                  {isCurrent && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: accent, color: '#fff', letterSpacing: '0.06em' }}>ACTIVE</span>}
                  {isDone && <span style={{ fontSize: 11, color: '#22c55e' }}>✓</span>}
                </div>
                {topic.notes && <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>{topic.notes}</p>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Day {start}–{end}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{topic.duration_days}d</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CustomActiveJourney({ roadmap, journey, onPause, onResume, onReset, onDelete, confirmingReset, onCancelReset }: {
  roadmap: CustomRoadmap
  journey: CustomJourney
  onPause: () => void
  onResume: () => void
  onReset: () => void
  onDelete: () => void
  confirmingReset: boolean
  onCancelReset: () => void
}) {
  const isPaused = !!journey.paused_at
  const totalDays = customTotalDays(roadmap.topics)
  const dayNum = getActiveDayNumber(journey.started_at, journey.days_paused, journey.paused_at)
  const isComplete = dayNum > totalDays
  const clampedDay = Math.min(dayNum, totalDays)
  const { topic: currentTopic, dayWithinTopic } = getCustomCurrentTopic(roadmap.topics, clampedDay)
  const pct = totalDays > 0 ? Math.round((clampedDay / totalDays) * 100) : 0
  const topicsDone = (() => {
    const sorted = [...roadmap.topics].sort((a, b) => a.position - b.position)
    let cum = 0, done = 0
    for (const t of sorted) { cum += t.duration_days; if (clampedDay > cum) done++ }
    return done
  })()
  const startDate = new Date(journey.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const accent = '#2563EB'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={S.metaRow}>
        <div style={S.metaItem}><span style={S.metaLabel}>Started</span><span style={{ ...S.metaValue, fontSize: 16 }}>{startDate}</span></div>
        <div style={S.metaItem}><span style={S.metaLabel}>Day</span><span style={S.metaValue}>{clampedDay}<span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 400 }}>/{totalDays}</span></span></div>
        <div style={S.metaItem}><span style={S.metaLabel}>Topics done</span><span style={S.metaValue}>{topicsDone}<span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 400 }}>/{roadmap.topics.length}</span></span></div>
        <div style={S.metaItem}><span style={S.metaLabel}>Progress</span><span style={S.metaValue}>{pct}%</span></div>
        {isPaused && <div style={S.metaItem}><span style={S.metaLabel}>Status</span><span style={{ ...S.metaValue, fontSize: 13, color: '#b45309', border: '1px solid rgba(180,83,9,0.3)', padding: '4px 10px', borderRadius: 99 }}>PAUSED</span></div>}
      </div>

      <div style={{ height: 2, background: 'var(--line-strong)', marginBottom: 28, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: isPaused ? '#b45309' : accent, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)', opacity: isPaused ? 0.6 : 1 }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
      </div>

      {!isComplete && !isPaused && currentTopic && (
        <div style={{ border: '1px solid var(--line)', borderLeft: `3px solid ${accent}`, borderRadius: 3, padding: '16px 20px', marginBottom: 28, background: '#EFF6FF' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent, marginBottom: 4 }}>TODAY — Day {dayWithinTopic} of {currentTopic.duration_days}</div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{currentTopic.name}</div>
          {currentTopic.notes && <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6 }}>{currentTopic.notes}</p>}
        </div>
      )}
      {isPaused && (
        <div style={{ padding: '20px 24px', background: '#FFFBEB', border: '1px solid rgba(180,83,9,0.25)', borderRadius: 3, marginBottom: 28 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Journey paused</p>
          <p style={{ fontSize: 13, color: '#b45309' }}>Paused on {new Date(journey.paused_at!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Resume to continue from Day {clampedDay}.</p>
        </div>
      )}
      {isComplete && !isPaused && (
        <div style={{ padding: '20px 24px', background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 3, marginBottom: 28 }}>
          <p style={{ fontSize: 20, fontFamily: 'var(--font-head)', fontWeight: 600 }}>Journey complete 🎉</p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>You finished {roadmap.name} in {dayNum} days.</p>
        </div>
      )}

      {confirmingReset ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#FEF2F2', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 3 }}>
          <span style={{ fontSize: 13, color: '#c0392b', flex: 1 }}>Reset journey? This cannot be undone.</span>
          <button onClick={onReset} style={S.dangerBtn}>Confirm reset</button>
          <button onClick={onDelete} style={{ ...S.dangerBtn, borderColor: 'rgba(192,57,43,0.6)' }}>Delete roadmap</button>
          <button onClick={onCancelReset} style={S.secondaryBtn}>Cancel</button>
        </div>
      ) : (
        <div style={S.btnRow}>
          {isPaused
            ? <button style={S.resumeBtn} onClick={onResume}>▶ Resume journey</button>
            : <button style={S.pauseBtn} onClick={onPause}>⏸ Pause journey</button>
          }
          <button style={S.secondaryBtn} onClick={onReset}>↺ Reset / Delete</button>
        </div>
      )}
    </div>
  )
}

function CustomNotStarted({ roadmap, onStart, onDelete }: { roadmap: CustomRoadmap; onStart: () => void; onDelete: () => void }) {
  const totalDays = customTotalDays(roadmap.topics)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={S.metaRow}>
        <div style={S.metaItem}><span style={S.metaLabel}>Topics</span><span style={S.metaValue}>{roadmap.topics.length}</span></div>
        <div style={S.metaItem}><span style={S.metaLabel}>Total days</span><span style={S.metaValue}>{totalDays}</span></div>
      </div>
      {roadmap.description && (
        <div style={{ padding: '16px 20px', background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 3, marginBottom: 28 }}>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7 }}>{roadmap.description}</p>
        </div>
      )}
      <div style={S.btnRow}>
        <button style={S.primaryBtn} onClick={onStart}>Start today →</button>
        <button style={S.secondaryBtn} onClick={onDelete} aria-label={`Delete ${roadmap.name}`}>Delete</button>
      </div>
    </div>
  )
}

function CustomRoadmapPanel({ roadmap, journey, onStart, onPause, onResume, onReset, onDelete, confirmingReset, onCancelReset }: {
  roadmap: CustomRoadmap
  journey: CustomJourney | undefined
  onStart: (id: string) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
  onReset: (id: string) => void
  onDelete: (id: string) => void
  confirmingReset: boolean
  onCancelReset: () => void
}) {
  const [timelineOpen, setTimelineOpen] = useState(false)
  const currentDay = journey ? getActiveDayNumber(journey.started_at, journey.days_paused, journey.paused_at) : 0

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
        <div style={S.cardName}>{roadmap.name}</div>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 99, background: '#DBEAFE', color: '#1D4ED8', marginTop: 8, flexShrink: 0 }}>CUSTOM</span>
      </div>
      <div style={{ ...S.cardTagline, marginBottom: roadmap.description ? 8 : 28 }}>{roadmap.topics.length} topics · {customTotalDays(roadmap.topics)} days</div>

      {journey ? (
        <CustomActiveJourney
          roadmap={roadmap}
          journey={journey}
          onPause={() => onPause(roadmap.id)}
          onResume={() => onResume(roadmap.id)}
          onReset={() => onReset(roadmap.id)}
          onDelete={() => onDelete(roadmap.id)}
          confirmingReset={confirmingReset}
          onCancelReset={onCancelReset}
        />
      ) : (
        <CustomNotStarted roadmap={roadmap} onStart={() => onStart(roadmap.id)} onDelete={() => onDelete(roadmap.id)} />
      )}

      <CustomTopicTimeline topics={roadmap.topics} currentDay={currentDay} expanded={timelineOpen} onToggle={() => setTimelineOpen(o => !o)} />
    </div>
  )
}

// ─── Create roadmap modal ───────────────────────────────────────────────────────

interface DraftTopic { name: string; duration_days: string; notes: string }

function CreateRoadmapModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [topics, setTopics] = useState<DraftTopic[]>([{ name: '', duration_days: '7', notes: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addTopic() {
    setTopics(t => [...t, { name: '', duration_days: '7', notes: '' }])
  }
  function removeTopic(i: number) {
    setTopics(t => t.filter((_, idx) => idx !== i))
  }
  function updateTopic(i: number, field: keyof DraftTopic, val: string) {
    setTopics(t => t.map((topic, idx) => idx === i ? { ...topic, [field]: val } : topic))
  }

  async function save() {
    if (!name.trim()) { setError('Give your roadmap a name.'); return }
    const validTopics = topics.filter(t => t.name.trim())
    if (validTopics.length === 0) { setError('Add at least one topic.'); return }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data: rm, error: rmErr } = await supabase.from('custom_roadmaps').insert({
      user_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
    }).select('id').single()

    if (rmErr || !rm) { setError('Failed to create roadmap.'); setSaving(false); return }

    const topicRows = validTopics.map((t, i) => ({
      roadmap_id: rm.id,
      name: t.name.trim(),
      duration_days: Math.max(1, parseInt(t.duration_days) || 7),
      position: i,
      notes: t.notes.trim() || null,
    }))
    const { error: topErr } = await supabase.from('custom_roadmap_topics').insert(topicRows)
    if (topErr) { setError('Roadmap created but topics failed — try again.'); setSaving(false); return }

    setSaving(false)
    onCreate()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 3, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '28px 32px 0', borderBottom: '1px solid var(--line)', paddingBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>New roadmap</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }} aria-label="Close modal">✕</button>
        </div>

        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Roadmap name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. System Design, React Mastery"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--line-strong)', borderRadius: 3, fontSize: 14, fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }}
              autoFocus
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Description <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this roadmap for?"
              rows={2}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--line-strong)', borderRadius: 3, fontSize: 14, fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--ink)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Topics *</label>
              <button onClick={addTopic} style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, padding: '2px 0' }}>+ Add topic</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topics.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', paddingTop: 12, flexShrink: 0, minWidth: 20, textAlign: 'right' }}>{i + 1}.</div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={t.name}
                        onChange={e => updateTopic(i, 'name', e.target.value)}
                        placeholder="Topic name"
                        style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--line-strong)', borderRadius: 3, fontSize: 13, fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--ink)', outline: 'none' }}
                      />
                      <input
                        value={t.duration_days}
                        onChange={e => updateTopic(i, 'duration_days', e.target.value)}
                        placeholder="Days"
                        type="number"
                        min="1"
                        style={{ width: 72, padding: '9px 12px', border: '1px solid var(--line-strong)', borderRadius: 3, fontSize: 13, fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--ink)', outline: 'none' }}
                      />
                    </div>
                    <input
                      value={t.notes}
                      onChange={e => updateTopic(i, 'notes', e.target.value)}
                      placeholder="Notes / resources (optional)"
                      style={{ width: '100%', padding: '7px 12px', border: '1px solid var(--line-strong)', borderRadius: 3, fontSize: 12, fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  {topics.length > 1 && (
                    <button onClick={() => removeTopic(i)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--ink-3)', padding: '8px 4px', flexShrink: 0 }} aria-label={`Remove topic ${i + 1}`}>✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p style={{ fontSize: 13, color: '#c0392b', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button onClick={onClose} style={S.secondaryBtn}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ ...S.primaryBtn, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Creating…' : 'Create roadmap →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function RoadmapsPage() {
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [customRoadmaps, setCustomRoadmaps] = useState<CustomRoadmap[]>([])
  const [customJourneys, setCustomJourneys] = useState<CustomJourney[]>([])
  const [loading, setLoading] = useState(true)
  const [resetConfirm, setResetConfirm] = useState<string | null>(null)
  const [customResetConfirm, setCustomResetConfirm] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [{ data: jData }, { data: crData }, { data: cjData }] = await Promise.all([
      supabase.from('journeys').select('roadmap_id,started_at,paused_at,days_paused').eq('user_id', user.id),
      supabase.from('custom_roadmaps').select('id,name,description').eq('user_id', user.id).order('created_at'),
      supabase.from('custom_journeys').select('custom_roadmap_id,started_at,paused_at,days_paused').eq('user_id', user.id),
    ])

    const roadmapIds = (crData ?? []).map(r => r.id)
    let topicsMap: Record<string, CustomTopic[]> = {}
    if (roadmapIds.length > 0) {
      const { data: tData } = await supabase
        .from('custom_roadmap_topics')
        .select('id,roadmap_id,name,duration_days,position,notes')
        .in('roadmap_id', roadmapIds)
        .order('position')
      for (const t of tData ?? []) {
        if (!topicsMap[t.roadmap_id]) topicsMap[t.roadmap_id] = []
        topicsMap[t.roadmap_id].push(t)
      }
    }

    setJourneys((jData ?? []) as Journey[])
    setCustomRoadmaps((crData ?? []).map(r => ({ ...r, topics: topicsMap[r.id] ?? [] })))
    setCustomJourneys((cjData ?? []) as CustomJourney[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleStart(roadmapId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('journeys').upsert({ user_id: user.id, roadmap_id: roadmapId, started_at: today, paused_at: null, days_paused: 0 }, { onConflict: 'user_id,roadmap_id' })
    if (error) {
      console.error(error)
      const { error: fallbackError } = await supabase.from('journeys').upsert({ user_id: user.id, roadmap_id: roadmapId, started_at: today }, { onConflict: 'user_id,roadmap_id' })
      if (fallbackError) console.error(fallbackError)
    }
    await load()
  }

  async function handlePause(roadmapId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('journeys').update({ paused_at: today }).eq('user_id', user.id).eq('roadmap_id', roadmapId)
    await load()
  }

  async function handleResume(roadmapId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const journey = journeys.find(j => j.roadmap_id === roadmapId)
    if (!journey?.paused_at) return
    const pausedAt = new Date(journey.paused_at); pausedAt.setHours(0, 0, 0, 0)
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const extraDays = Math.floor((now.getTime() - pausedAt.getTime()) / 86_400_000)
    await supabase.from('journeys').update({ paused_at: null, days_paused: journey.days_paused + extraDays }).eq('user_id', user.id).eq('roadmap_id', roadmapId)
    await load()
  }

  async function handleReset(roadmapId: string) {
    if (resetConfirm !== roadmapId) { setResetConfirm(roadmapId); return }
    setResetConfirm(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('journeys').delete().eq('user_id', user.id).eq('roadmap_id', roadmapId)
    await load()
  }

  async function handleCustomStart(roadmapId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('custom_journeys').upsert({ user_id: user.id, custom_roadmap_id: roadmapId, started_at: today, paused_at: null, days_paused: 0 }, { onConflict: 'user_id,custom_roadmap_id' })
    if (error) {
      console.error(error)
      const { error: fallbackError } = await supabase.from('custom_journeys').upsert({ user_id: user.id, custom_roadmap_id: roadmapId, started_at: today }, { onConflict: 'user_id,custom_roadmap_id' })
      if (fallbackError) console.error(fallbackError)
    }
    await load()
  }

  async function handleCustomPause(roadmapId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('custom_journeys').update({ paused_at: today }).eq('user_id', user.id).eq('custom_roadmap_id', roadmapId)
    await load()
  }

  async function handleCustomResume(roadmapId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const journey = customJourneys.find(j => j.custom_roadmap_id === roadmapId)
    if (!journey?.paused_at) return
    const pausedAt = new Date(journey.paused_at); pausedAt.setHours(0, 0, 0, 0)
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const extraDays = Math.floor((now.getTime() - pausedAt.getTime()) / 86_400_000)
    await supabase.from('custom_journeys').update({ paused_at: null, days_paused: journey.days_paused + extraDays }).eq('user_id', user.id).eq('custom_roadmap_id', roadmapId)
    await load()
  }

  async function handleCustomReset(roadmapId: string) {
    if (customResetConfirm !== roadmapId) { setCustomResetConfirm(roadmapId); return }
    setCustomResetConfirm(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('custom_journeys').delete().eq('user_id', user.id).eq('custom_roadmap_id', roadmapId)
    await load()
  }

  async function handleCustomDelete(roadmapId: string) {
    setCustomResetConfirm(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('custom_roadmaps').delete().eq('id', roadmapId).eq('user_id', user.id)
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

      <div style={{ marginBottom: 48 }}>
        <p style={S.sectionLabel}>Preset roadmaps</p>
        <div style={S.grid}>
          {ALL_ROADMAPS.map(rm => (
            <RoadmapPanel
              key={rm.id}
              roadmap={rm}
              journey={journeys.find(j => j.roadmap_id === rm.id)}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onReset={handleReset}
              confirmingReset={resetConfirm === rm.id}
              onCancelReset={() => setResetConfirm(null)}
            />
          ))}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ ...S.sectionLabel, marginBottom: 0 }}>Custom roadmaps</p>
          <button onClick={() => setShowCreate(true)} style={{ ...S.primaryBtn, padding: '8px 16px', fontSize: 12 }}>+ New roadmap</button>
        </div>

        {customRoadmaps.length === 0 ? (
          <div style={{ border: '1px dashed var(--line-strong)', borderRadius: 3, padding: '48px 32px', textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>No custom roadmaps yet</p>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 24 }}>Build your own learning path — add topics, set durations, and track them day by day.</p>
            <button onClick={() => setShowCreate(true)} style={S.primaryBtn}>Create your first roadmap →</button>
          </div>
        ) : (
          <div style={S.grid}>
            {customRoadmaps.map(rm => (
              <CustomRoadmapPanel
                key={rm.id}
                roadmap={rm}
                journey={customJourneys.find(j => j.custom_roadmap_id === rm.id)}
                onStart={handleCustomStart}
                onPause={handleCustomPause}
                onResume={handleCustomResume}
                onReset={handleCustomReset}
                onDelete={handleCustomDelete}
                confirmingReset={customResetConfirm === rm.id}
                onCancelReset={() => setCustomResetConfirm(null)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateRoadmapModal
          onClose={() => setShowCreate(false)}
          onCreate={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )
}
