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

      {/* Weekly split list */}
      <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '14px' }}>
        Weekly Split
      </h2>
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: '32px' }}>
        {split.map((day, idx) => {
          const isToday = day.day_of_week === todayDow
          const isEditing = editingDay === day.day_of_week
          const isRestDay = day.label === 'Rest'

          return (
            <div key={day.day_of_week} style={{ borderBottom: idx < split.length - 1 ? '1px solid var(--line)' : 'none' }}>
              {/* Main row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '14px 20px',
                background: isToday ? (isRestDay ? 'transparent' : 'rgba(122,32,32,0.04)') : 'transparent',
              }}>
                {/* Day name */}
                <div style={{ width: '96px', flexShrink: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--ink)' : 'var(--ink-2)' }}>
                    {DAYS[day.day_of_week]}
                  </p>
                  {isToday && <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--rev-ink)' }}>Today</span>}
                </div>

                {/* Quick dropdown */}
                <select
                  value={SPLIT_PRESETS.includes(day.label) ? day.label : 'Custom'}
                  onChange={async e => {
                    const val = e.target.value
                    if (val === 'Custom') return
                    const supabase = createClient()
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return
                    await supabase.from('gym_split').upsert({ user_id: user.id, day_of_week: day.day_of_week, label: val, exercises: day.exercises }, { onConflict: 'user_id,day_of_week' })
                    setSplit(prev => prev.map(d => d.day_of_week === day.day_of_week ? { ...d, label: val } : d))
                  }}
                  style={{
                    padding: '6px 12px', background: isRestDay ? 'var(--bg)' : 'var(--rev-bg)',
                    border: `1px solid ${isRestDay ? 'var(--line-strong)' : 'rgba(122,32,32,0.25)'}`,
                    borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 600,
                    color: isRestDay ? 'var(--ink-3)' : 'var(--rev-ink)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)', outline: 'none',
                  }}
                >
                  {SPLIT_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                  {!SPLIT_PRESETS.includes(day.label) && <option value="Custom">{day.label}</option>}
                </select>

                {/* Exercises preview */}
                <p style={{ flex: 1, fontSize: '12px', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {day.exercises.length > 0 ? day.exercises.join(' · ') : isRestDay ? '' : 'No exercises — click Edit'}
                </p>

                {/* Edit button */}
                <button
                  onClick={() => isEditing ? setEditingDay(null) : startEdit(day.day_of_week)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: isEditing ? 'var(--ink)' : 'transparent', border: `1px solid ${isEditing ? 'var(--ink)' : 'var(--line-strong)'}`, borderRadius: 'var(--r)', fontSize: '11px', color: isEditing ? 'var(--bg)' : 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0 }}
                >
                  <Pencil size={11} /> {isEditing ? 'Close' : 'Edit'}
                </button>
              </div>

              {/* Inline edit panel */}
              {isEditing && (
                <div style={{ padding: '16px 20px', background: 'var(--bg-hover)', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Preset pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {SPLIT_PRESETS.map(p => (
                      <button
                        key={p}
                        onClick={() => setEditLabel(p)}
                        style={{
                          padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 500,
                          border: editLabel === p ? '1.5px solid var(--ink)' : '1.5px solid var(--line-strong)',
                          background: editLabel === p ? 'var(--ink)' : 'var(--bg)',
                          color: editLabel === p ? 'var(--bg)' : 'var(--ink-2)',
                          cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
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
                    placeholder="Or type a custom label…"
                    style={{ width: '280px', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
                  />
                  {/* Exercises */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: '6px' }}>Exercises (one per line)</label>
                    <textarea
                      value={editExercises}
                      onChange={e => setEditExercises(e.target.value)}
                      placeholder={'Bench Press\nIncline DB Press\nCable Fly\n...'}
                      rows={4}
                      style={{ width: '100%', maxWidth: '480px', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={saveEdit} disabled={saving} style={{ padding: '8px 20px', background: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--bg)', fontWeight: 500, cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-body)' }}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingDay(null)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
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
