'use client'
import { CheckCircle2, Circle, Flame, Zap, TrendingUp, AlertCircle, ChevronDown, ChevronUp, CalendarDays, Plus, X, Loader2 } from 'lucide-react'
import { useTodaysTasks } from '@/lib/hooks/useTodaysTasks'
import { useProfile } from '@/lib/hooks/useProfile'
import { ALL_ROADMAPS, getDayNumber, getCurrentTopic } from '@/data/roadmaps'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Journey { roadmap_id: string; started_at: string }

export default function TodayPage() {
  const { tasks, loading: tasksLoading, markDone, reload: reloadTasks } = useTodaysTasks()
  const { profile, loading: profileLoading } = useProfile()
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [addingTask, setAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [savingTask, setSavingTask] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('journeys').select('roadmap_id,started_at').eq('user_id', user.id).then(({ data }) => {
        setJourneys(data ?? [])
      })
    })
  }, [])

  const done = tasks.filter(t => t.done).length
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayXP = tasks.filter(t => t.done).reduce((sum, t) => sum + t.xp_value, 0)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const roadmapProgress = journeys.map(j => {
    const roadmap = ALL_ROADMAPS.find(r => r.id === j.roadmap_id)
    if (!roadmap) return null
    const dayNum = getDayNumber(j.started_at)
    const result = getCurrentTopic(roadmap, dayNum)
    const pct = Math.round((dayNum / roadmap.totalDays) * 100)
    return {
      name: roadmap.name,
      pct: Math.min(pct, 100),
      dayNum,
      next: result ? result.topic.name : 'Completed!',
      color: j.roadmap_id === 'dsa' ? 'var(--dsa-ink)' : 'var(--java-ink)',
    }
  }).filter(Boolean) as { name: string; pct: number; dayNum: number; next: string; color: string }[]

  function getTopicDetail(roadmapId: string | null) {
    if (!roadmapId) return null
    const journey = journeys.find(j => j.roadmap_id === roadmapId)
    if (!journey) return null
    const roadmap = ALL_ROADMAPS.find(r => r.id === roadmapId)
    if (!roadmap) return null
    const dayNum = getDayNumber(journey.started_at)
    const result = getCurrentTopic(roadmap, dayNum)
    if (!result) return null
    return { dayNum, topic: result.topic, dayWithinTopic: result.dayWithinTopic }
  }

  async function addCustomTask() {
    if (!newTaskTitle.trim()) return
    setSavingTask(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingTask(false); return }
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('tasks').insert({ user_id: user.id, title: newTaskTitle.trim(), scheduled_date: today, xp_value: 10 })
    setNewTaskTitle('')
    setAddingTask(false)
    setSavingTask(false)
    reloadTasks()
  }

  const loading = tasksLoading || profileLoading

  return (
    <div style={{ padding: '40px', maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <p style={{ fontSize: '12px', color: 'var(--ink-3)', marginBottom: '6px', letterSpacing: '0.04em' }}>{today}</p>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '36px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>
          {profile ? `${greeting}, ${profile.name.split(' ')[0]}` : greeting}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginTop: '6px' }}>
          {loading ? 'Loading your tasks…' : `${tasks.length - done} task${tasks.length - done !== 1 ? 's' : ''} remaining · 🔥 ${profile?.streak ?? 0} task · 📅 ${profile?.login_streak ?? 0} login`}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        {[
          { label: 'Completed', value: `${done}/${tasks.length}`, icon: <CheckCircle2 size={14} />, color: 'var(--java-ink)' },
          { label: 'Login streak', value: `${profile?.login_streak ?? 0}d`, icon: <CalendarDays size={14} />, color: 'var(--ink-2)', desc: 'daily visits' },
          { label: 'Task streak', value: `${profile?.streak ?? 0}d`, icon: <Flame size={14} />, color: '#e07b00', desc: 'all tasks done' },
          { label: 'XP today', value: `+${todayXP}`, icon: <Zap size={14} />, color: 'var(--dsa-ink)' },
          { label: 'Total XP', value: `${profile?.xp ?? 0}`, icon: <TrendingUp size={14} />, color: 'var(--ink-2)' },
        ].map(({ label, value, icon, color, desc }) => (
          <div key={label} style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color }}>
              {icon}
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{label}</span>
            </div>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: '24px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
            {desc && <p style={{ fontSize: '10px', color: 'var(--ink-3)', marginTop: '3px' }}>{desc}</p>}
          </div>
        ))}
      </div>

      {/* Today's tasks */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Today&apos;s Tasks</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>{done} of {tasks.length} done</span>
            <button
              onClick={() => setAddingTask(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: addingTask ? 'var(--bg-hover)' : 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '12px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
            >
              {addingTask ? <X size={12} /> : <Plus size={12} />} {addingTask ? 'Cancel' : 'Add task'}
            </button>
          </div>
        </div>

        {/* Inline add task form */}
        {addingTask && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: '8px' }}>
            <input
              autoFocus
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCustomTask(); if (e.key === 'Escape') { setAddingTask(false); setNewTaskTitle('') } }}
              placeholder="Task title…"
              style={{ flex: 1, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
            />
            <button
              onClick={addCustomTask}
              disabled={!newTaskTitle.trim() || savingTask}
              style={{ padding: '8px 16px', background: newTaskTitle.trim() ? 'var(--ink)' : 'var(--line-strong)', color: newTaskTitle.trim() ? 'var(--bg)' : 'var(--ink-3)', border: 'none', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 500, cursor: newTaskTitle.trim() ? 'pointer' : 'default', fontFamily: 'var(--font-body)' }}
            >
              {savingTask ? 'Adding…' : 'Add'}
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--ink-3)', fontSize: '14px' }}>
            <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
            Generating today&apos;s tasks…
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ink-3)', fontSize: '14px' }}>
            No tasks yet.{' '}
            <a href="/onboarding" style={{ color: 'var(--ink)', borderBottom: '1px solid var(--ink)', textDecoration: 'none' }}>Start a journey →</a>
          </div>
        ) : (
          tasks.map((task, i) => {
            const roadmapColor = task.roadmap_id === 'dsa' ? { bg: 'var(--dsa-bg)', ink: 'var(--dsa-ink)' }
              : task.roadmap_id === 'java' ? { bg: 'var(--java-bg)', ink: 'var(--java-ink)' }
              : { bg: 'var(--rev-bg)', ink: 'var(--rev-ink)' }
            const isExpanded = expanded === task.id
            const detail = isExpanded ? getTopicDetail(task.roadmap_id) : null

            return (
              <div key={task.id} style={{ borderBottom: i < tasks.length - 1 || isExpanded ? '1px solid var(--line)' : 'none' }}>
                {/* Task row */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', cursor: 'pointer' }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={e => { e.stopPropagation(); markDone(task.id) }}
                    aria-label={task.done ? 'Mark undone' : 'Mark done'}
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: '2px' }}
                  >
                    {task.done
                      ? <CheckCircle2 size={18} color="var(--java-ink)" />
                      : <Circle size={18} color="var(--line-strong)" />}
                  </button>

                  {/* Title — click to expand */}
                  <span
                    onClick={() => setExpanded(isExpanded ? null : task.id)}
                    style={{ flex: 1, fontSize: '14px', color: task.done ? 'var(--ink-3)' : 'var(--ink)', textDecoration: task.done ? 'line-through' : 'none', transition: 'color 0.2s' }}
                  >
                    {task.title}
                  </span>

                  <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '999px', background: roadmapColor.bg, color: roadmapColor.ink }}>
                    {task.roadmap_id?.toUpperCase() ?? 'CUSTOM'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>+{task.xp_value} XP</span>

                  {/* Expand toggle */}
                  {task.roadmap_id && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : task.id)}
                      aria-label={isExpanded ? 'Collapse task detail' : 'Expand task detail'}
                      style={{ background: 'none', border: 'none', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', flexShrink: 0, padding: '0 2px' }}
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  )}
                </div>

                {/* Expandable syllabus panel */}
                {isExpanded && detail && (
                  <div style={{
                    margin: '0 20px 16px',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r)',
                    overflow: 'hidden',
                  }}>
                    {/* Topic header */}
                    <div style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid var(--line)',
                      background: roadmapColor.bg,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: roadmapColor.ink, opacity: 0.7, marginBottom: '2px' }}>
                          Topic {detail.topic.number}
                        </p>
                        <p style={{ fontFamily: 'var(--font-head)', fontSize: '16px', fontWeight: 600, color: roadmapColor.ink }}>
                          {detail.topic.name}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', color: roadmapColor.ink, opacity: 0.7 }}>Overall Day</p>
                        <p style={{ fontFamily: 'var(--font-head)', fontSize: '20px', fontWeight: 700, color: roadmapColor.ink }}>{detail.dayNum}</p>
                      </div>
                    </div>

                    {/* Today's schedule */}
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
                      <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '10px' }}>
                        Today&apos;s Schedule
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {detail.topic.schedule.map((s, idx) => {
                          const isToday = (() => {
                            if (!s.days.includes('–') && !s.days.includes('-')) return true
                            const sep = s.days.includes('–') ? '–' : '-'
                            const [startStr, endStr] = s.days.split(sep)
                            const start = parseInt(startStr.replace(/\D/g, ''))
                            const end = parseInt(endStr.replace(/\D/g, ''))
                            return detail.dayWithinTopic >= start && detail.dayWithinTopic <= end
                          })()
                          return (
                            <div key={idx} style={{
                              display: 'flex', gap: '12px', alignItems: 'flex-start',
                              opacity: isToday ? 1 : 0.45,
                            }}>
                              <span style={{
                                fontSize: '11px', fontWeight: 600, color: isToday ? roadmapColor.ink : 'var(--ink-3)',
                                background: isToday ? roadmapColor.bg : 'transparent',
                                padding: '2px 8px', borderRadius: '999px',
                                border: `1px solid ${isToday ? roadmapColor.ink : 'var(--line)'}`,
                                whiteSpace: 'nowrap', flexShrink: 0, marginTop: '1px',
                              }}>
                                {s.days}
                              </span>
                              <span style={{ fontSize: '13px', color: isToday ? 'var(--ink)' : 'var(--ink-2)', lineHeight: 1.5 }}>
                                {s.activity}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Subtopics */}
                    <div style={{ padding: '14px 18px' }}>
                      <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '10px' }}>
                        Subtopics in this section
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {detail.topic.subtopics.map((sub, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <span style={{ color: roadmapColor.ink, marginTop: '3px', flexShrink: 0, fontSize: '10px' }}>▸</span>
                            <span style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: 1.5 }}>{sub}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Roadmap progress */}
      {roadmapProgress.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${roadmapProgress.length}, 1fr)`, gap: '12px' }}>
          {roadmapProgress.map(rp => (
            <div key={rp.name} style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{rp.name}</span>
                <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>Day {rp.dayNum}</span>
              </div>
              <div style={{ height: '3px', background: 'var(--line-strong)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', width: `${rp.pct}%`, background: rp.color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <AlertCircle size={11} color="var(--ink-3)" />
                <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Up next: {rp.next}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
