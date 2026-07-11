'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { invalidateProfileCache } from '@/lib/hooks/useProfile'
import { Calendar, CheckCircle2, Circle, Loader2, Zap } from 'lucide-react'

interface Task {
  id: string
  title: string
  roadmap_id: string | null
  scheduled_date: string
  done: boolean
  xp_value: number
}

interface Group {
  label: string
  dateStr: string
  isNextWeek: boolean
  tasks: Task[]
}

const ROADMAP_COLOR: Record<string, { bg: string; ink: string }> = {
  dsa:   { bg: 'var(--dsa-bg)',   ink: 'var(--dsa-ink)' },
  java:  { bg: 'var(--java-bg)',  ink: 'var(--java-ink)' },
  rdbms: { bg: 'var(--rdbms-bg)', ink: 'var(--rdbms-ink)' },
}

function formatGroupLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.floor((date.getTime() - now.getTime()) / 86400000)

  if (diff === 1) return 'Tomorrow'
  if (diff <= 6) return date.toLocaleDateString('en-IN', { weekday: 'long' })
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatSub(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isNextWeek(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.floor((date.getTime() - now.getTime()) / 86400000)
  return diff > 7
}

export default function UpcomingPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('done', false)
      .gt('scheduled_date', today)
      .order('scheduled_date', { ascending: true })
      .limit(50)

    setTasks(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function markDone(taskId: string) {
    setMarking(taskId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMarking(null); return }
    const task = tasks.find(t => t.id === taskId)
    await supabase.from('tasks').update({ done: true, done_at: new Date().toISOString() }).eq('id', taskId)
    if (task) {
      await supabase.rpc('award_xp', { p_user_id: user.id, p_xp: task.xp_value, p_reason: `Completed: ${task.title}` }).maybeSingle()
      await supabase.rpc('update_streak', { p_user_id: user.id }).maybeSingle()
      invalidateProfileCache()
    }
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setMarking(null)
  }

  // Group by date
  const groups: Group[] = []
  const seen = new Set<string>()
  for (const task of tasks) {
    if (!seen.has(task.scheduled_date)) {
      seen.add(task.scheduled_date)
      groups.push({
        label: formatGroupLabel(task.scheduled_date),
        dateStr: task.scheduled_date,
        isNextWeek: isNextWeek(task.scheduled_date),
        tasks: [],
      })
    }
    groups.find(g => g.dateStr === task.scheduled_date)?.tasks.push(task)
  }

  const thisWeek = groups.filter(g => !g.isNextWeek)
  const laterGroups = groups.filter(g => g.isNextWeek)

  return (
    <div style={{ padding: '40px', maxWidth: '860px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '32px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>
          Upcoming
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginTop: '6px' }}>
          {loading ? 'Loading…' : tasks.length === 0
            ? 'No upcoming tasks in your schedule'
            : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} coming up across ${groups.length} day${groups.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ink-3)', padding: '20px 0' }}>
          <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '14px' }}>Loading upcoming tasks…</span>
        </div>
      ) : tasks.length === 0 ? (
        <div style={{
          border: '2px dashed var(--line-strong)', borderRadius: 'var(--r)',
          padding: '56px 32px', textAlign: 'center',
        }}>
          <Calendar size={32} color="var(--ink-3)" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'var(--font-head)', fontSize: '20px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>Nothing scheduled yet</p>
          <p style={{ fontSize: '14px', color: 'var(--ink-3)' }}>Roadmap tasks appear on the Today page each day — add custom tasks with a future date from there to see them here.</p>
        </div>
      ) : (
        <>
          {/* This week */}
          {thisWeek.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '12px' }}>
                This week
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {thisWeek.map(group => (
                  <DayGroup key={group.dateStr} group={group} isFirst={group === thisWeek[0]} marking={marking} onMarkDone={markDone} />
                ))}
              </div>
            </div>
          )}

          {/* Later */}
          {laterGroups.length > 0 && (
            <div>
              <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '12px' }}>
                Later
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {laterGroups.map(group => (
                  <DayGroup key={group.dateStr} group={group} isFirst={false} marking={marking} onMarkDone={markDone} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function DayGroup({ group, isFirst, marking, onMarkDone }: { group: Group; isFirst: boolean; marking: string | null; onMarkDone: (id: string) => void }) {
  return (
    <div style={{
      background: 'var(--bg-panel)', border: '1px solid var(--line)',
      borderRadius: 'var(--r)', overflow: 'hidden',
    }}>
      {/* Date header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 18px',
        borderBottom: '1px solid var(--line)',
        background: isFirst ? 'var(--dsa-bg)' : 'transparent',
      }}>
        <Calendar size={13} color={isFirst ? 'var(--dsa-ink)' : 'var(--ink-3)'} />
        <span style={{
          fontFamily: 'var(--font-head)', fontSize: '15px', fontWeight: 600,
          color: isFirst ? 'var(--dsa-ink)' : 'var(--ink)',
        }}>
          {group.label}
        </span>
        <span style={{ fontSize: '12px', color: isFirst ? 'var(--dsa-ink)' : 'var(--ink-3)', opacity: 0.7, marginLeft: '2px' }}>
          {formatSub(group.dateStr)}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: isFirst ? 'var(--dsa-ink)' : 'var(--ink-3)', fontWeight: 500 }}>
          {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tasks */}
      {group.tasks.map((task, i) => {
        const colors = ROADMAP_COLOR[task.roadmap_id ?? ''] ?? { bg: 'var(--rev-bg)', ink: 'var(--rev-ink)' }
        const isMarking = marking === task.id
        return (
          <div
            key={task.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 18px',
              borderBottom: i < group.tasks.length - 1 ? '1px solid var(--line)' : 'none',
              opacity: isMarking ? 0.5 : 1, transition: 'opacity 0.2s',
            }}
          >
            <span style={{ flex: 1, fontSize: '14px', color: 'var(--ink)', lineHeight: 1.4 }}>{task.title}</span>
            {task.roadmap_id && (
              <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '999px', background: colors.bg, color: colors.ink, flexShrink: 0 }}>
                {task.roadmap_id.toUpperCase()}
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <Zap size={11} color="var(--ink-3)" />
              <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>+{task.xp_value}</span>
            </div>
            <button
              onClick={() => onMarkDone(task.id)}
              disabled={!!marking}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%', border: '1.5px solid var(--line-strong)', background: 'transparent', cursor: marking ? 'default' : 'pointer', flexShrink: 0 }}
              title="Mark done"
            >
              {isMarking
                ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--ink-3)' }} />
                : <Circle size={12} color="var(--ink-3)" />}
            </button>
          </div>
        )
      })}
    </div>
  )
}
