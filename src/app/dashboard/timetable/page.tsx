'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Clock, Trash2, Loader2, X, AlertCircle } from 'lucide-react'

interface Block {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  label: string
  subject_code: string
  room: string
  batch: string
}

// 0=Mon … 5=Sat (matches DB convention)
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const COLORS = [
  { bg: 'var(--dsa-bg)',  ink: 'var(--dsa-ink)' },
  { bg: 'var(--java-bg)', ink: 'var(--java-ink)' },
  { bg: 'var(--lc-bg)',   ink: 'var(--lc-ink)' },
  { bg: 'var(--rev-bg)',  ink: 'var(--rev-ink)' },
]

function colorForLabel(label: string) {
  let hash = 0
  for (const c of label) hash = (hash * 31 + c.charCodeAt(0)) & 0xfffff
  return COLORS[hash % COLORS.length]
}

// Convert JS getDay() (0=Sun … 6=Sat) → our convention (0=Mon … 5=Sat)
function jsDayToOur(jsDay: number): number {
  return jsDay === 0 ? -1 : jsDay - 1  // -1 = Sunday (not shown)
}

function emptyBlock(day: number): Omit<Block, 'id'> {
  return { day_of_week: day, start_time: '09:00', end_time: '10:00', label: '', subject_code: '', room: '', batch: '' }
}

export default function TimetablePage() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyBlock(0))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data, error: dbErr } = await supabase
      .from('timetable_blocks')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week')
      .order('start_time')
    if (dbErr) { setError(dbErr.message); setLoading(false); return }
    setBlocks((data ?? []) as Block[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function startAdd(day: number) {
    setForm(emptyBlock(day))
    setEditingId(null)
    setSaveError(null)
    setShowForm(true)
  }

  function startEdit(b: Block) {
    setForm({ day_of_week: b.day_of_week, start_time: b.start_time, end_time: b.end_time, label: b.label, subject_code: b.subject_code, room: b.room, batch: b.batch })
    setEditingId(b.id)
    setSaveError(null)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setSaveError(null)
  }

  async function save() {
    if (!form.label.trim()) return
    // Basic time validation
    if (form.start_time >= form.end_time) {
      setSaveError('Start time must be before end time.')
      return
    }
    setSaving(true)
    setSaveError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    let dbErr
    if (editingId) {
      const { error } = await supabase.from('timetable_blocks').update({ ...form, user_id: user.id }).eq('id', editingId).eq('user_id', user.id)
      dbErr = error
    } else {
      const { error } = await supabase.from('timetable_blocks').insert({ ...form, user_id: user.id })
      dbErr = error
    }

    if (dbErr) { setSaveError(dbErr.message); setSaving(false); return }
    setSaving(false)
    cancelForm()
    await load()
  }

  async function del(id: string, label: string) {
    if (!window.confirm(`Delete "${label}" slot? This cannot be undone.`)) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: dbErr } = await supabase.from('timetable_blocks').delete().eq('id', id).eq('user_id', user.id)
    if (dbErr) { setError(dbErr.message); return }
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  const todayDay = jsDayToOur(new Date().getDay())

  return (
    <div style={{ padding: '40px', maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Clock size={20} color="var(--dsa-ink)" />
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '32px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>College Timetable</h1>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>Weekly class schedule</p>
        </div>
        {!showForm && (
          <button
            onClick={() => startAdd(todayDay >= 0 ? todayDay : 0)}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 500, color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            <Plus size={14} /> Add slot
          </button>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'var(--rev-bg)', border: '1px solid var(--rev-ink)', borderRadius: 'var(--r)', marginBottom: '16px', fontSize: '13px', color: 'var(--rev-ink)' }}>
          <AlertCircle size={14} /> {error}
          <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rev-ink)', fontSize: '12px', fontFamily: 'var(--font-body)', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{editingId ? 'Edit slot' : 'New slot'}</p>
            <button onClick={cancelForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}><X size={16} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: '5px' }}>Day</label>
              <select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: parseInt(e.target.value) }))}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: '5px' }}>Start time</label>
              <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: '5px' }}>End time</label>
              <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Subject name', key: 'label', placeholder: 'Data Structures' },
              { label: 'Subject code', key: 'subject_code', placeholder: 'CS301' },
              { label: 'Room', key: 'room', placeholder: 'LT-2' },
              { label: 'Batch', key: 'batch', placeholder: 'A1 / Morning' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: '5px' }}>{label}</label>
                <input placeholder={placeholder} value={(form as Record<string, unknown>)[key] as string}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>

          {saveError && (
            <div style={{ padding: '10px 14px', background: 'var(--rev-bg)', border: '1px solid var(--rev-ink)', borderRadius: 'var(--r)', fontSize: '12px', color: 'var(--rev-ink)', marginBottom: '14px' }}>
              {saveError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={save} disabled={!form.label.trim() || saving}
              style={{ padding: '9px 22px', background: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 500, color: 'var(--bg)', cursor: !form.label.trim() || saving ? 'default' : 'pointer', opacity: !form.label.trim() ? 0.4 : 1, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {saving ? <><Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} />Saving…</> : 'Save slot'}
            </button>
            <button onClick={cancelForm} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ink-3)' }}>
          <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '14px' }}>Loading timetable…</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {DAYS.map((day, dayIdx) => {
            const dayBlocks = blocks.filter(b => b.day_of_week === dayIdx).sort((a, b) => a.start_time.localeCompare(b.start_time))
            const isToday = dayIdx === todayDay
            return (
              <div key={day} style={{ background: 'var(--bg-panel)', border: `1px solid ${isToday ? 'var(--dsa-ink)' : 'var(--line)'}`, borderRadius: 'var(--r)', overflow: 'hidden' }}>
                {/* Day header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 18px', borderBottom: dayBlocks.length > 0 ? '1px solid var(--line)' : 'none', background: isToday ? 'var(--dsa-bg)' : 'transparent' }}>
                  <span style={{ fontFamily: 'var(--font-head)', fontSize: '14px', fontWeight: 600, color: isToday ? 'var(--dsa-ink)' : 'var(--ink)', flex: 1 }}>
                    {day}{isToday ? ' · Today' : ''}
                  </span>
                  <span style={{ fontSize: '11px', color: isToday ? 'var(--dsa-ink)' : 'var(--ink-3)' }}>
                    {dayBlocks.length} {dayBlocks.length === 1 ? 'class' : 'classes'}
                  </span>
                  <button
                    onClick={() => startAdd(dayIdx)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '11px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                  >
                    <Plus size={10} /> Add
                  </button>
                </div>

                {/* Blocks */}
                {dayBlocks.length === 0 ? (
                  <div style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--ink-3)' }}>No classes</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {dayBlocks.map((b, i) => {
                      const c = colorForLabel(b.label)
                      return (
                        <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 18px', borderBottom: i < dayBlocks.length - 1 ? '1px solid var(--line)' : 'none' }}>
                          <span style={{ fontSize: '12px', color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums', minWidth: '90px', flexShrink: 0 }}>
                            {b.start_time} – {b.end_time}
                          </span>
                          <span style={{ padding: '3px 10px', background: c.bg, color: c.ink, borderRadius: 'var(--r)', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
                            {b.subject_code || DAY_SHORT[b.day_of_week]}
                          </span>
                          <span style={{ flex: 1, fontSize: '13px', color: 'var(--ink)' }}>{b.label}</span>
                          {b.room && <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>{b.room}</span>}
                          {b.batch && <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>{b.batch}</span>}
                          <button onClick={() => startEdit(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: '11px', fontFamily: 'var(--font-body)', padding: '3px 8px' }}>Edit</button>
                          <button onClick={() => del(b.id, b.label)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}><Trash2 size={12} /></button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
