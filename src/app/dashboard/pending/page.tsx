'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { invalidateProfileCache } from '@/lib/hooks/useProfile'
import { CheckCircle2, Circle, AlertTriangle, Clock, Loader2 } from 'lucide-react'

interface Task {
  id: string
  title: string
  roadmap_id: string | null
  scheduled_date: string
  done: boolean
  xp_value: number
}

const ROADMAP_COLOR: Record<string, { bg: string; ink: string }> = {
  dsa:  { bg: 'var(--dsa-bg)',  ink: 'var(--dsa-ink)' },
  java: { bg: 'var(--java-bg)', ink: 'var(--java-ink)' },
}

function dateDiff(dateStr: string): { label: string; overdue: boolean; days: number } {
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const days = Math.floor((target.getTime() - now.getTime()) / 86400000)
  if (days < -1) return { label: `${Math.abs(days)} days ago`, overdue: true, days }
  if (days === -1) return { label: 'Yesterday', overdue: true, days }
  if (days === 0) return { label: 'Today', overdue: false, days }
  return { label: `${Math.abs(days)} days ago`, overdue: true, days }
}

export default function PendingPage() {
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
      .lte('scheduled_date', today)
      .order('scheduled_date', { ascending: true })

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
      await supabase.from('streak_log').upsert({
        user_id: user.id, log_date: task.scheduled_date, tasks_done: 1,
      }, { onConflict: 'user_id,log_date' })
      await supabase.rpc('update_streak', { p_user_id: user.id }).maybeSingle()
      invalidateProfileCache()
    }

    setTasks(prev => prev.filter(t => t.id !== taskId))
    setMarking(null)
  }

  const overdueTasks = tasks.filter(t => {
    const today = new Date().toISOString().split('T')[0]
    return t.scheduled_date < today
  })

  return (
    <div style={{ padding: '40px', maxWidth: '860px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '32px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>
          Pending
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginTop: '6px' }}>
          {loading ? 'Loading…' : tasks.length === 0 ? "You're all caught up 🎉" : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} waiting · ${overdueTasks.length} overdue`}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ink-3)', padding: '20px 0' }}>
          <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '14px' }}>Loading pending tasks…</span>
        </div>
      ) : tasks.length === 0 ? (
        <div style={{
          border: '2px dashed var(--line-strong)', borderRadius: 'var(--r)',
          padding: '56px 32px', textAlign: 'center',
        }}>
          <CheckCircle2 size={32} color="var(--java-ink)" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'var(--font-head)', fontSize: '20px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>All caught up</p>
          <p style={{ fontSize: '14px', color: 'var(--ink-3)' }}>No pending tasks. Great work keeping up!</p>
        </div>
      ) : (
        <>
          {/* Overdue warning */}
          {overdueTasks.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 16px',
              background: '#FEF2F2',
              border: '1px solid rgba(192,57,43,0.2)',
              borderRadius: 'var(--r)', marginBottom: '20px',
            }}>
              <AlertTriangle size={15} color="#c0392b" />
              <span style={{ fontSize: '13px', color: '#c0392b', fontWeight: 500 }}>
                {overdueTasks.length} task{overdueTasks.length !== 1 ? 's are' : ' is'} overdue — clear these first.
              </span>
            </div>
          )}

          {/* Task list */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            {tasks.map((task, i) => {
              const diff = dateDiff(task.scheduled_date)
              const colors = ROADMAP_COLOR[task.roadmap_id ?? ''] ?? { bg: 'var(--rev-bg)', ink: 'var(--rev-ink)' }
              const isMarking = marking === task.id

              return (
                <div
                  key={task.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '14px 20px',
                    borderBottom: i < tasks.length - 1 ? '1px solid var(--line)' : 'none',
                    opacity: isMarking ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {/* Urgency dot */}
                  <div style={{
                    width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                    background: diff.overdue ? '#c0392b' : '#e07b00',
                  }} />

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', color: 'var(--ink)', marginBottom: '3px', lineHeight: 1.4 }}>{task.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={11} color="var(--ink-3)" />
                      <span style={{ fontSize: '12px', color: diff.overdue ? '#c0392b' : 'var(--ink-3)', fontWeight: diff.overdue ? 500 : 400 }}>
                        {diff.label}
                      </span>
                    </div>
                  </div>

                  {/* Tag */}
                  {task.roadmap_id && (
                    <span style={{
                      fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                      padding: '3px 10px', borderRadius: '999px',
                      background: colors.bg, color: colors.ink, flexShrink: 0,
                    }}>
                      {task.roadmap_id.toUpperCase()}
                    </span>
                  )}

                  {/* XP */}
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)', flexShrink: 0 }}>+{task.xp_value} XP</span>

                  {/* Mark done */}
                  <button
                    onClick={() => markDone(task.id)}
                    disabled={!!marking}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px', borderRadius: '50%',
                      border: '1.5px solid var(--line-strong)',
                      background: 'transparent', cursor: marking ? 'default' : 'pointer', flexShrink: 0,
                      transition: 'all 0.2s',
                    }}
                    title="Mark done"
                  >
                    {isMarking
                      ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--ink-3)' }} />
                      : <Circle size={13} color="var(--ink-3)" />
                    }
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
