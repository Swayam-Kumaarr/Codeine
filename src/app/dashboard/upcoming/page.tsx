'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ALL_ROADMAPS, getCurrentTopic } from '@/data/roadmaps'
import { Calendar, CheckCircle2, Circle, Loader2, Zap, BookOpen } from 'lucide-react'

interface Journey {
  roadmap_id: string
  started_at: string
  paused_at: string | null
  days_paused: number
}

interface DBTask {
  id: string
  title: string
  roadmap_id: string | null
  scheduled_date: string
  done: boolean
  xp_value: number
}

interface DayEntry {
  dateStr: string
  label: string
  isToday: boolean
  isMissed: boolean
  projected: { roadmap_id: string; roadmapName: string; topicName: string; activity: string; dayNum: number }[]
  manual: DBTask[]
}

const ROADMAP_COLOR: Record<string, { bg: string; ink: string }> = {
  dsa:   { bg: 'var(--dsa-bg)',   ink: 'var(--dsa-ink)' },
  java:  { bg: 'var(--java-bg)',  ink: 'var(--java-ink)' },
  rdbms: { bg: 'var(--rdbms-bg)', ink: 'var(--rdbms-ink)' },
  coa:   { bg: '#F2E8E8',         ink: '#7A2020' },
}

function dayLabel(dateStr: string, todayStr: string): string {
  const diff = Math.round((new Date(dateStr + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0) return `${Math.abs(diff)}d ago`
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
}

function getDayNumForDate(journey: Journey, targetStr: string): number {
  const start = new Date(journey.started_at); start.setHours(0, 0, 0, 0)
  const target = new Date(targetStr + 'T00:00:00'); target.setHours(0, 0, 0, 0)
  const raw = Math.floor((target.getTime() - start.getTime()) / 86400000) + 1
  return Math.max(1, raw - (journey.days_paused ?? 0))
}

export default function UpcomingPage() {
  const [days, setDays] = useState<DayEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }

      const todayStr = new Date().toISOString().split('T')[0]

      // Look back 3 days for missed + forward 14 days
      const dates: string[] = []
      for (let i = -3; i <= 14; i++) {
        const d = new Date(todayStr + 'T00:00:00')
        d.setDate(d.getDate() + i)
        dates.push(d.toISOString().split('T')[0])
      }
      const fromStr = dates[0]
      const toStr = dates[dates.length - 1]

      const [{ data: journeys }, { data: dbTasks }] = await Promise.all([
        supabase.from('journeys').select('roadmap_id,started_at,paused_at,days_paused').eq('user_id', user.id),
        supabase.from('tasks')
          .select('id,title,roadmap_id,scheduled_date,done,xp_value')
          .eq('user_id', user.id)
          .gte('scheduled_date', fromStr)
          .lte('scheduled_date', toStr)
          .order('scheduled_date', { ascending: true }),
      ])

      const activeJourneys = (journeys ?? []).filter((j: Journey) => !j.paused_at)

      const result: DayEntry[] = dates.map(dateStr => {
        const isMissed = dateStr < todayStr
        const isToday = dateStr === todayStr

        // Project roadmap tasks for this date
        const projected = activeJourneys.flatMap((j: Journey) => {
          const roadmap = ALL_ROADMAPS.find(r => r.id === j.roadmap_id)
          if (!roadmap) return []
          const dayNum = getDayNumForDate(j, dateStr)
          if (dayNum < 1 || dayNum > roadmap.totalDays) return []
          const { topic, dayWithinTopic } = getCurrentTopic(roadmap, dayNum)
          const normalized = (s: string) => s.replace('–', '-')
          const schedEntry = topic.schedule.find(s => {
            const n = normalized(s.days)
            if (!n.includes('-')) return Number(n) === dayWithinTopic
            const [a, b] = n.split('-').map(Number)
            return dayWithinTopic >= a && dayWithinTopic <= b
          })
          return [{
            roadmap_id: j.roadmap_id,
            roadmapName: roadmap.name,
            topicName: topic.name,
            activity: schedEntry?.activity ?? 'Study',
            dayNum,
          }]
        })

        // DB tasks manually added (roadmap_id is null = custom, or any task not matching a projected roadmap)
        const allDay = (dbTasks ?? []).filter((t: DBTask) => t.scheduled_date === dateStr)
        const manual = allDay.filter((t: DBTask) => !t.roadmap_id || !activeJourneys.some((j: Journey) => j.roadmap_id === t.roadmap_id))

        return {
          dateStr,
          label: dayLabel(dateStr, todayStr),
          isToday,
          isMissed,
          projected,
          manual,
        }
      }).filter(d => d.projected.length > 0 || d.manual.length > 0)

      setDays(result)
      setLoading(false)
    })
  }, [])

  async function markDone(taskId: string) {
    setMarking(taskId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMarking(null); return }
    await supabase.from('tasks').update({ done: true, done_at: new Date().toISOString() }).eq('id', taskId)
    await supabase.rpc('award_xp', { p_user_id: user.id, p_xp: 30, p_reason: 'Task completed from upcoming' }).maybeSingle()
    setDays(prev => prev.map(d => ({
      ...d,
      manual: d.manual.map(t => t.id === taskId ? { ...t, done: true } : t),
    })))
    setMarking(null)
  }

  const missed = days.filter(d => d.isMissed)
  const today = days.filter(d => d.isToday)
  const upcoming = days.filter(d => !d.isMissed && !d.isToday)

  if (loading) return (
    <div style={{ padding: 40, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-3)', fontSize: 14 }}>
      <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
      Building your schedule…
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding: '40px', maxWidth: '760px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '32px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>
          Schedule
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginTop: '6px' }}>
          Projected roadmap tasks + manually added tasks across the next 14 days.
        </p>
      </div>

      {days.length === 0 && (
        <div style={{ border: '2px dashed var(--line-strong)', borderRadius: 'var(--r)', padding: '56px 32px', textAlign: 'center' }}>
          <Calendar size={32} color="var(--ink-3)" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'var(--font-head)', fontSize: '20px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>No active journeys</p>
          <p style={{ fontSize: '14px', color: 'var(--ink-3)' }}>Start a roadmap journey to see your projected schedule here.</p>
        </div>
      )}

      {/* Missed */}
      {missed.length > 0 && (
        <Section title={`Missed — ${missed.reduce((s, d) => s + d.projected.length + d.manual.length, 0)} tasks`} accent="#c0392b">
          {missed.map(d => <DayCard key={d.dateStr} day={d} marking={marking} onMarkDone={markDone} />)}
        </Section>
      )}

      {/* Today */}
      {today.map(d => (
        <Section key={d.dateStr} title="Today" accent="var(--dsa-ink)">
          <DayCard day={d} marking={marking} onMarkDone={markDone} />
        </Section>
      ))}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Section title="Coming up">
          {upcoming.map(d => <DayCard key={d.dateStr} day={d} marking={marking} onMarkDone={markDone} />)}
        </Section>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function Section({ title, accent, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent ?? 'var(--ink-3)', marginBottom: '12px' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {children}
      </div>
    </div>
  )
}

function DayCard({ day, marking, onMarkDone }: { day: DayEntry; marking: string | null; onMarkDone: (id: string) => void }) {
  const dateLabel = new Date(day.dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <div style={{ background: 'var(--bg-panel)', border: `1px solid ${day.isMissed ? '#f5c6cb' : 'var(--line)'}`, borderRadius: 'var(--r)', overflow: 'hidden' }}>
      {/* Date header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', background: day.isToday ? 'var(--dsa-bg)' : day.isMissed ? '#FDF0F0' : 'transparent', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Calendar size={12} color={day.isToday ? 'var(--dsa-ink)' : day.isMissed ? '#c0392b' : 'var(--ink-3)'} />
        <span style={{ fontFamily: 'var(--font-head)', fontSize: '14px', fontWeight: 600, color: day.isToday ? 'var(--dsa-ink)' : day.isMissed ? '#c0392b' : 'var(--ink)' }}>
          {day.label}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--ink-3)', opacity: 0.7 }}>{dateLabel}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--ink-3)' }}>
          {day.projected.length + day.manual.length} task{day.projected.length + day.manual.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Projected roadmap rows */}
      {day.projected.map((p, i) => {
        const colors = ROADMAP_COLOR[p.roadmap_id] ?? { bg: 'var(--rev-bg)', ink: 'var(--rev-ink)' }
        const isLast = i === day.projected.length - 1 && day.manual.length === 0
        return (
          <div key={p.roadmap_id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', borderBottom: !isLast ? '1px solid var(--line)' : 'none' }}>
            <BookOpen size={13} color={colors.ink} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', lineHeight: 1.4 }}>{p.activity}</p>
              <p style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: 2 }}>{p.topicName} · Day {p.dayNum}</p>
            </div>
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '999px', background: colors.bg, color: colors.ink, flexShrink: 0 }}>
              {p.roadmap_id.toUpperCase()}
            </span>
          </div>
        )
      })}

      {/* Manual / DB tasks */}
      {day.manual.map((t, i) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < day.manual.length - 1 ? '1px solid var(--line)' : 'none', opacity: marking === t.id ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          <span style={{ flex: 1, fontSize: '13px', color: t.done ? 'var(--ink-3)' : 'var(--ink)', textDecoration: t.done ? 'line-through' : 'none', lineHeight: 1.4 }}>{t.title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <Zap size={10} color="var(--ink-3)" />
            <span style={{ fontSize: '10px', color: 'var(--ink-3)' }}>+{t.xp_value}</span>
          </div>
          {!t.done && (
            <button
              onClick={() => onMarkDone(t.id)}
              disabled={!!marking}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--line-strong)', background: 'transparent', cursor: marking ? 'default' : 'pointer', flexShrink: 0 }}
              title="Mark done"
            >
              {marking === t.id
                ? <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--ink-3)' }} />
                : <Circle size={11} color="var(--ink-3)" />}
            </button>
          )}
          {t.done && <CheckCircle2 size={16} color="#2db55d" style={{ flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  )
}
