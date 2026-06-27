'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Dumbbell, Loader2, Pencil, Check, X } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SPLIT_PRESETS = ['Rest', 'Push', 'Pull', 'Legs', 'Chest', 'Back', 'Shoulders', 'Arms', 'Cardio', 'Full Body', 'Upper', 'Lower']

interface GymSplit {
  day_of_week: number
  label: string
  exercises: string[]
  notes: string | null
}

interface GymLog {
  id: string
  log_date: string
  split_label: string
  notes: string | null
  done: boolean
}

export default function GymPage() {
  const [split, setSplit] = useState<GymSplit[]>([])
  const [todayLog, setTodayLog] = useState<GymLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingDay, setEditingDay] = useState<number | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editExercises, setEditExercises] = useState('')
  const [saving, setSaving] = useState(false)
  const [markingDone, setMarkingDone] = useState(false)

  const today = new Date()
  const todayDow = today.getDay()
  const todayStr = today.toISOString().split('T')[0]

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: s }, { data: l }] = await Promise.all([
      supabase.from('gym_split').select('*').eq('user_id', user.id).order('day_of_week', { ascending: true }),
      supabase.from('gym_logs').select('*').eq('user_id', user.id).eq('log_date', todayStr).single(),
    ])

    // Fill in missing days with defaults
    const filled: GymSplit[] = DAYS.map((_, i) => {
      const existing = s?.find(x => x.day_of_week === i)
      return existing ?? { day_of_week: i, label: 'Rest', exercises: [], notes: null }
    })
    setSplit(filled)
    setTodayLog(l ?? null)
    setLoading(false)
  }, [todayStr])

  useEffect(() => { load() }, [load])

  function startEdit(dow: number) {
    const day = split.find(d => d.day_of_week === dow)
    setEditingDay(dow)
    setEditLabel(day?.label ?? 'Rest')
    setEditExercises((day?.exercises ?? []).join('\n'))
  }

  async function saveEdit() {
    if (editingDay === null) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const exercises = editExercises.split('\n').map(e => e.trim()).filter(Boolean)
    await supabase.from('gym_split').upsert({
      user_id: user.id,
      day_of_week: editingDay,
      label: editLabel,
      exercises,
    }, { onConflict: 'user_id,day_of_week' })

    setSplit(prev => prev.map(d => d.day_of_week === editingDay ? { ...d, label: editLabel, exercises } : d))
    setEditingDay(null)
    setSaving(false)
  }

  async function markTodayDone() {
    setMarkingDone(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMarkingDone(false); return }

    const todayDay = split.find(d => d.day_of_week === todayDow)
    const label = todayDay?.label ?? 'Workout'

    const { data } = await supabase.from('gym_logs').upsert({
      user_id: user.id,
      log_date: todayStr,
      split_label: label,
      done: true,
      done_at: new Date().toISOString(),
    }, { onConflict: 'user_id,log_date' }).select().single()

    setTodayLog(data ?? { id: '', log_date: todayStr, split_label: label, notes: null, done: true })
    setMarkingDone(false)
  }

  const todaySplit = split.find(d => d.day_of_week === todayDow)
  const isRest = todaySplit?.label === 'Rest'

  if (loading) {
    return (
      <div style={{ padding: '40px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ink-3)' }}>
        <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
        <span>Loading gym split…</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', maxWidth: '860px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '32px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>
          Gym
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginTop: '6px' }}>
          Your weekly split and daily workout log.
        </p>
      </div>

      {/* Today's workout hero */}
      <div style={{
        background: isRest ? 'var(--bg-panel)' : 'var(--rev-bg)',
        border: `1px solid ${isRest ? 'var(--line)' : 'rgba(122,32,32,0.2)'}`,
        borderRadius: 'var(--r)',
        padding: '24px',
        marginBottom: '32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: 'var(--r)',
            background: isRest ? 'var(--bg-hover)' : 'var(--rev-ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Dumbbell size={22} color={isRest ? 'var(--ink-3)' : '#fff'} />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: isRest ? 'var(--ink-3)' : 'var(--rev-ink)', marginBottom: '4px' }}>
              {DAYS[todayDow]}
            </p>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', color: isRest ? 'var(--ink-3)' : 'var(--rev-ink)', lineHeight: 1 }}>
              {todaySplit?.label ?? 'Rest'}
            </p>
            {!isRest && todaySplit?.exercises && todaySplit.exercises.length > 0 && (
              <p style={{ fontSize: '12px', color: 'var(--rev-ink)', opacity: 0.7, marginTop: '4px' }}>
                {todaySplit.exercises.slice(0, 3).join(' · ')}{todaySplit.exercises.length > 3 ? ` +${todaySplit.exercises.length - 3} more` : ''}
              </p>
            )}
          </div>
        </div>
        {!isRest && (
          <button
            onClick={markTodayDone}
            disabled={!!todayLog?.done || markingDone}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 22px',
              background: todayLog?.done ? 'rgba(122,32,32,0.12)' : 'var(--rev-ink)',
              color: todayLog?.done ? 'var(--rev-ink)' : '#fff',
              border: todayLog?.done ? '1px solid rgba(122,32,32,0.25)' : 'none',
              borderRadius: 'var(--r)', fontSize: '14px', fontWeight: 500,
              cursor: todayLog?.done ? 'default' : 'pointer',
              fontFamily: 'var(--font-body)', flexShrink: 0,
            }}
          >
            {markingDone
              ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
              : todayLog?.done
                ? <><CheckCircle2 size={15} /> Done!</>
                : <><Check size={15} /> Mark done</>
            }
          </button>
        )}
      </div>

      {/* Weekly split grid */}
      <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '14px' }}>
        Weekly Split
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '32px' }}>
        {split.map(day => {
          const isToday = day.day_of_week === todayDow
          const isEditing = editingDay === day.day_of_week
          const isRest = day.label === 'Rest'

          if (isEditing) {
            return (
              <div key={day.day_of_week} style={{
                gridColumn: 'span 2',
                background: 'var(--bg-panel)', border: '2px solid var(--ink)',
                borderRadius: 'var(--r)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px',
              }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {DAYS[day.day_of_week]}
                </p>
                {/* Preset buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {SPLIT_PRESETS.map(p => (
                    <button
                      key={p}
                      onClick={() => setEditLabel(p)}
                      style={{
                        padding: '3px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: 500,
                        border: editLabel === p ? '1.5px solid var(--ink)' : '1.5px solid var(--line-strong)',
                        background: editLabel === p ? 'var(--ink)' : 'transparent',
                        color: editLabel === p ? 'var(--bg)' : 'var(--ink-2)',
                        cursor: 'pointer', fontFamily: 'var(--font-body)',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {/* Custom label */}
                <input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  placeholder="or type custom…"
                  style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
                />
                {/* Exercises */}
                <textarea
                  value={editExercises}
                  onChange={e => setEditExercises(e.target.value)}
                  placeholder={'Exercises (one per line)\nBench Press\nIncline DB\n...'}
                  rows={4}
                  style={{ padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setEditingDay(null)} aria-label="Cancel edit" style={{ flex: 1, padding: '7px', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '12px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    <X size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </button>
                  <button onClick={saveEdit} disabled={saving} style={{ flex: 3, padding: '7px', background: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', fontSize: '12px', color: 'var(--bg)', fontWeight: 500, cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-body)' }}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            )
          }

          return (
            <div
              key={day.day_of_week}
              onClick={() => startEdit(day.day_of_week)}
              style={{
                background: isToday ? (isRest ? 'var(--bg-panel)' : 'var(--rev-bg)') : 'var(--bg-panel)',
                border: isToday ? `2px solid ${isRest ? 'var(--ink-3)' : 'var(--rev-ink)'}` : '1px solid var(--line)',
                borderRadius: 'var(--r)', padding: '12px 10px',
                cursor: 'pointer', transition: 'background 0.15s',
                display: 'flex', flexDirection: 'column', gap: '6px',
                minHeight: '90px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: isToday ? (isRest ? 'var(--ink-3)' : 'var(--rev-ink)') : 'var(--ink-3)' }}>
                  {DAY_SHORT[day.day_of_week]}
                </span>
                {isToday && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isRest ? 'var(--ink-3)' : 'var(--rev-ink)' }} />}
              </div>
              <p style={{
                fontFamily: 'var(--font-head)', fontSize: '14px', fontWeight: 600, letterSpacing: '-0.01em',
                color: isToday ? (isRest ? 'var(--ink-3)' : 'var(--rev-ink)') : isRest ? 'var(--ink-3)' : 'var(--ink)',
                lineHeight: 1.2, flex: 1,
              }}>
                {day.label}
              </p>
              {!isRest && day.exercises.length > 0 && (
                <p style={{ fontSize: '10px', color: 'var(--ink-3)', lineHeight: 1.4 }}>
                  {day.exercises.slice(0, 2).join(', ')}{day.exercises.length > 2 ? '…' : ''}
                </p>
              )}
              <Pencil size={10} color="var(--ink-3)" style={{ opacity: 0.4, alignSelf: 'flex-end' }} />
            </div>
          )
        })}
      </div>

      {/* Tip */}
      <p style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
        Click any day to edit your split. Gym reminders fire at your configured time on non-rest days.{' '}
        <a href="/dashboard/notifications" style={{ color: 'var(--ink)', borderBottom: '1px solid var(--line-strong)', textDecoration: 'none' }}>Configure in Notifications →</a>
      </p>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
