'use client'
import { CheckCircle2, Circle, Flame, Zap, TrendingUp, AlertCircle, ChevronDown, ChevronUp, CalendarDays, Plus, X, Loader2 } from 'lucide-react'
import { useTodaysTasks } from '@/lib/hooks/useTodaysTasks'
import { useProfile } from '@/lib/hooks/useProfile'
import { ALL_ROADMAPS, getDayNumber, getCurrentTopic } from '@/data/roadmaps'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Journey { roadmap_id: string; started_at: string; paused_at: string | null; days_paused: number }
interface WeekTask { id: string; title: string; roadmap_id: string | null; scheduled_date: string; done: boolean }

function getRoadmapColor(roadmapId: string | null) {
  if (roadmapId === 'dsa') return { bg: 'var(--dsa-bg)', ink: 'var(--dsa-ink)' }
  if (roadmapId === 'java') return { bg: 'var(--java-bg)', ink: 'var(--java-ink)' }
  if (roadmapId === 'rdbms') return { bg: 'var(--rdbms-bg)', ink: 'var(--rdbms-ink)' }
  if (roadmapId === 'coa') return { bg: '#F2E8E8', ink: '#7A2020' }
  return { bg: 'var(--rev-bg)', ink: 'var(--rev-ink)' }
}

function getWeekDates(): Date[] {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function TodayPage() {
  const { tasks, loading: tasksLoading, markDone, reload: reloadTasks } = useTodaysTasks()
  const { profile, loading: profileLoading } = useProfile()
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [addingTask, setAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDate, setNewTaskDate] = useState('')
  const [savingTask, setSavingTask] = useState(false)
  const [weekTasks, setWeekTasks] = useState<WeekTask[]>([])

  interface PendingHW { id: string; title: string; due_date: string | null; subject_name: string; subject_color: string }
  const [pendingHW, setPendingHW] = useState<PendingHW[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const todayStr = new Date().toISOString().split('T')[0]
      const weekDates = getWeekDates()
      const weekStart = toDateStr(weekDates[0])
      const weekEnd = toDateStr(weekDates[6])
      const [{ data: journeyData }, { data: hwData }, { data: weekData }] = await Promise.all([
        supabase.from('journeys').select('roadmap_id,started_at,paused_at,days_paused').eq('user_id', user.id),
        supabase.from('homework')
          .select('id, title, due_date, subject_id, subjects(name, color)')
          .eq('user_id', user.id)
          .eq('done', false)
          .not('due_date', 'is', null)
          .lte('due_date', todayStr)
          .order('due_date', { ascending: true }),
        supabase.from('tasks')
          .select('id, title, roadmap_id, scheduled_date, done')
          .eq('user_id', user.id)
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd),
      ])
      setJourneys(journeyData ?? [])
      setPendingHW(
        (hwData ?? []).map((h: { id: string; title: string; due_date: string | null; subject_id: string; subjects: { name: string; color: string }[] | { name: string; color: string } | null }) => ({
          id: h.id,
          title: h.title,
          due_date: h.due_date,
          subject_name: (Array.isArray(h.subjects) ? h.subjects[0]?.name : h.subjects?.name) ?? 'Unknown',
          subject_color: (Array.isArray(h.subjects) ? h.subjects[0]?.color : h.subjects?.color) ?? 'var(--ink-3)',
        }))
      )
      setWeekTasks(weekData ?? [])
      setNewTaskDate(todayStr)
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
    const isPaused = !!j.paused_at
    const dayNum = isPaused
      ? getDayNumber(j.paused_at!, j.days_paused)
      : getDayNumber(j.started_at, j.days_paused)
    const result = getCurrentTopic(roadmap, dayNum)
    const pct = Math.round((dayNum / roadmap.totalDays) * 100)
    return {
      name: roadmap.name,
      pct: Math.min(pct, 100),
      dayNum,
      next: result ? result.topic.name : 'Completed!',
      color: getRoadmapColor(j.roadmap_id).ink,
    }
  }).filter(Boolean) as { name: string; pct: number; dayNum: number; next: string; color: string }[]

  function getTopicDetail(roadmapId: string | null) {
    if (!roadmapId) return null
    const journey = journeys.find(j => j.roadmap_id === roadmapId)
    if (!journey) return null
    const roadmap = ALL_ROADMAPS.find(r => r.id === roadmapId)
    if (!roadmap) return null
    const isPaused = !!journey.paused_at
    const dayNum = isPaused
      ? getDayNumber(journey.paused_at!, journey.days_paused)
      : getDayNumber(journey.started_at, journey.days_paused)
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
    const todayStr = new Date().toISOString().split('T')[0]
    const scheduled = newTaskDate || todayStr
    const { data: newTask } = await supabase.from('tasks').insert({
      user_id: user.id, title: newTaskTitle.trim(), scheduled_date: scheduled, xp_value: 10,
    }).select('id, title, roadmap_id, scheduled_date, done').single()
    setNewTaskTitle('')
    setNewTaskDate(todayStr)
    setAddingTask(false)
    setSavingTask(false)
    // Refresh week calendar to show new task immediately
    if (newTask) {
      setWeekTasks(prev => [...prev, newTask as WeekTask])
    }
    reloadTasks()
  }

  async function dismissHW(hwId: string) {
    const supabase = createClient()
    await supabase.from('homework').update({ done: true, done_at: new Date().toISOString() }).eq('id', hwId)
    setPendingHW(prev => prev.filter(h => h.id !== hwId))
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
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              autoFocus
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCustomTask(); if (e.key === 'Escape') { setAddingTask(false); setNewTaskTitle('') } }}
              placeholder="Task title…"
              style={{ flex: 1, minWidth: 180, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
            />
            <input
              type="date"
              value={newTaskDate}
              onChange={e => setNewTaskDate(e.target.value)}
              style={{ padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
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
            <a href="/dashboard/roadmaps" style={{ color: 'var(--ink)', borderBottom: '1px solid var(--ink)', textDecoration: 'none' }}>Start a journey →</a>
          </div>
        ) : (
          tasks.map((task, i) => {
            const roadmapColor = getRoadmapColor(task.roadmap_id)
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

      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>This week</h2>
        </div>
        <div style={{ display: 'flex', overflowX: 'auto', maxHeight: '200px', padding: '16px 20px', gap: '4px' }}>
          {getWeekDates().map(date => {
            const dateStr = toDateStr(date)
            const isToday = dateStr === new Date().toISOString().split('T')[0]
            const dayTasks = weekTasks.filter(t => t.scheduled_date === dateStr)
            return (
              <div key={dateStr} style={{ flex: '1 0 100px', minWidth: '100px', padding: '8px 6px', borderRadius: 'var(--r)', background: isToday ? 'var(--bg-hover)' : 'transparent' }}>
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                    {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                  </div>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: '16px', fontWeight: 600, color: isToday ? 'var(--ink)' : 'var(--ink-2)' }}>
                    {date.getDate()}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '130px', overflowY: 'auto' }}>
                  {dayTasks.map(t => {
                    const colors = t.roadmap_id ? getRoadmapColor(t.roadmap_id) : null
                    return (
                      <div
                        key={t.id}
                        title={t.title}
                        style={{
                          fontSize: '10px', padding: '3px 7px', borderRadius: '999px',
                          background: colors ? colors.bg : 'var(--bg)',
                          color: colors ? colors.ink : 'var(--ink-3)',
                          border: colors ? 'none' : '1px solid var(--line-strong)',
                          textDecoration: t.done ? 'line-through' : 'none',
                          opacity: t.done ? 0.5 : 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {t.title}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Roadmap progress */}
      {roadmapProgress.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${roadmapProgress.length}, 1fr)`, gap: '12px', marginBottom: pendingHW.length > 0 ? '16px' : 0 }}>
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

      {/* Pending homework due today or overdue */}
      {pendingHW.length > 0 && (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c0392b' }}>
              Homework Due — {pendingHW.length} pending
            </h2>
          </div>
          {pendingHW.map((hw, i) => {
            const today = new Date().toISOString().split('T')[0]
            const overdue = hw.due_date && hw.due_date < today
            const daysAgo = hw.due_date ? Math.floor((new Date().getTime() - new Date(hw.due_date + 'T00:00:00').getTime()) / 86400000) : 0
            return (
              <div key={hw.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderBottom: i < pendingHW.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: hw.subject_color }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>{hw.title}</p>
                  <p style={{ fontSize: '11px', color: overdue ? '#c0392b' : 'var(--ink-3)', marginTop: 2 }}>
                    {hw.subject_name} · {overdue ? `${daysAgo}d overdue` : 'Due today'}
                  </p>
                </div>
                <button
                  onClick={() => dismissHW(hw.id)}
                  style={{ padding: '5px 12px', background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--r)', fontSize: '11px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
                >
                  Mark done
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
