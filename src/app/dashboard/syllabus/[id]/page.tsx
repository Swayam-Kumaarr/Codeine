'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Circle, Plus, X, Loader2, ChevronLeft, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Subject {
  id: string
  name: string
  code: string
  color: string
  bg_color: string
  topics: string[]
  topics_done: number[]
}

interface Homework {
  id: string
  title: string
  description: string | null
  due_date: string | null
  done: boolean
}

export default function SubjectPage() {
  const params = useParams()
  const id = params.id as string

  const [subject, setSubject] = useState<Subject | null>(null)
  const [homework, setHomework] = useState<Homework[]>([])
  const [loading, setLoading] = useState(true)
  const [addHwOpen, setAddHwOpen] = useState(false)

  const [hwTitle, setHwTitle] = useState('')
  const [hwDesc, setHwDesc] = useState('')
  const [hwDue, setHwDue] = useState('')
  const [hwSaving, setHwSaving] = useState(false)

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: sub }, { data: hw }] = await Promise.all([
      supabase.from('subjects').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('homework').select('*').eq('subject_id', id).eq('user_id', user.id).order('due_date', { ascending: true, nullsFirst: false }),
    ])

    setSubject(sub ? { ...sub, topics_done: sub.topics_done ?? [] } : null)
    setHomework(hw ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function toggleTopic(idx: number) {
    if (!subject) return
    const supabase = createClient()
    const already = subject.topics_done.includes(idx)
    const next = already
      ? subject.topics_done.filter(i => i !== idx)
      : [...subject.topics_done, idx]
    setSubject({ ...subject, topics_done: next })
    await supabase.from('subjects').update({ topics_done: next }).eq('id', id)
  }

  async function toggleHW(hwId: string, done: boolean) {
    const supabase = createClient()
    await supabase.from('homework').update({ done: !done, done_at: !done ? new Date().toISOString() : null }).eq('id', hwId)
    setHomework(prev => prev.map(h => h.id === hwId ? { ...h, done: !done } : h))
  }

  async function addHomework() {
    if (!hwTitle.trim()) return
    setHwSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setHwSaving(false); return }
    const { error } = await supabase.from('homework').insert({
      user_id: user.id, subject_id: id,
      title: hwTitle.trim(), description: hwDesc.trim() || null, due_date: hwDue || null,
    })
    setHwSaving(false)
    if (!error) { setHwTitle(''); setHwDesc(''); setHwDue(''); setAddHwOpen(false); load() }
  }

  async function deleteHW(hwId: string) {
    const supabase = createClient()
    await supabase.from('homework').delete().eq('id', hwId)
    setHomework(prev => prev.filter(h => h.id !== hwId))
  }

  if (loading) return (
    <div style={{ padding: '40px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ink-3)' }}>
      <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /><span>Loading subject…</span>
    </div>
  )

  if (!subject) return (
    <div style={{ padding: '40px' }}>
      <p style={{ color: 'var(--ink-3)' }}>Subject not found.</p>
      <Link href="/dashboard/syllabus" style={{ color: 'var(--ink)', fontSize: '14px' }}>← Back to Subjects</Link>
    </div>
  )

  const pendingHW = homework.filter(h => !h.done)
  const doneHW = homework.filter(h => h.done)
  const donePct = subject.topics.length > 0 ? Math.round((subject.topics_done.length / subject.topics.length) * 100) : 0

  function formatDate(d: string | null) {
    if (!d) return null
    const date = new Date(d + 'T00:00:00')
    const today = new Date(); today.setHours(0,0,0,0)
    const diff = Math.floor((date.getTime() - today.getTime()) / 86400000)
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, overdue: true }
    if (diff === 0) return { label: 'Due today', overdue: false }
    if (diff === 1) return { label: 'Due tomorrow', overdue: false }
    return { label: `Due in ${diff}d`, overdue: false }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '860px' }}>
      <Link href="/dashboard/syllabus" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--ink-3)', textDecoration: 'none', marginBottom: '28px', fontFamily: 'var(--font-body)' }}>
        <ChevronLeft size={14} /> Subjects
      </Link>

      {/* Subject header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: subject.color }} />
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '32px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1 }}>{subject.name}</h1>
          {subject.code && <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', padding: '3px 12px', borderRadius: '999px', background: subject.bg_color, color: subject.color }}>{subject.code}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>{subject.topics_done.length}/{subject.topics.length} topics done · {pendingHW.length} homework pending</p>
          {subject.topics.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '80px', height: '3px', background: 'var(--line-strong)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${donePct}%`, background: subject.color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>{donePct}%</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>

        {/* Left: Topics */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Syllabus Topics</h2>
            <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>{subject.topics.length}</span>
          </div>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            {subject.topics.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: '13px' }}>No topics added yet.</div>
            ) : (
              subject.topics.map((topic, i) => {
                const done = subject.topics_done.includes(i)
                return (
                  <div
                    key={i}
                    onClick={() => toggleTopic(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 16px', cursor: 'pointer',
                      borderBottom: i < subject.topics.length - 1 ? '1px solid var(--line)' : 'none',
                      background: done ? subject.bg_color : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    {done
                      ? <CheckCircle2 size={15} color={subject.color} style={{ flexShrink: 0 }} />
                      : <Circle size={15} color="var(--line-strong)" style={{ flexShrink: 0 }} />}
                    <span style={{ fontSize: '13px', color: done ? subject.color : 'var(--ink)', flex: 1, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.8 : 1 }}>{topic}</span>
                    <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>#{i + 1}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right: Homework */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Homework</h2>
            <button onClick={() => setAddHwOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--r)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <Plus size={12} /> Add
            </button>
          </div>

          {addHwOpen && (
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', padding: '16px', marginBottom: '12px' }}>
              <input autoFocus type="text" value={hwTitle} onChange={e => setHwTitle(e.target.value)} placeholder="Homework title"
                style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }} />
              <input type="text" value={hwDesc} onChange={e => setHwDesc(e.target.value)} placeholder="Description (optional)"
                style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                <Calendar size={14} color="var(--ink-3)" />
                <input type="date" value={hwDue} onChange={e => setHwDue(e.target.value)}
                  style={{ flex: 1, padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setAddHwOpen(false); setHwTitle(''); setHwDesc(''); setHwDue('') }}
                  style={{ flex: 1, padding: '9px', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
                <button onClick={addHomework} disabled={!hwTitle.trim() || hwSaving}
                  style={{ flex: 1, padding: '9px', background: hwTitle.trim() ? 'var(--ink)' : 'var(--line-strong)', color: hwTitle.trim() ? 'var(--bg)' : 'var(--ink-3)', border: 'none', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 500, cursor: hwTitle.trim() ? 'pointer' : 'default', fontFamily: 'var(--font-body)' }}>
                  {hwSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}

          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            {homework.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: '13px' }}>No homework yet.</div>
            ) : (
              <>
                {pendingHW.map((hw, i) => {
                  const due = formatDate(hw.due_date)
                  return (
                    <div key={hw.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', borderBottom: (i < pendingHW.length - 1 || doneHW.length > 0) ? '1px solid var(--line)' : 'none' }}>
                      <button onClick={() => toggleHW(hw.id, hw.done)} style={{ background: 'none', border: 'none', color: 'var(--line-strong)', cursor: 'pointer', marginTop: '1px', padding: 0, flexShrink: 0 }}>
                        <Circle size={16} />
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500, marginBottom: hw.description || due ? '3px' : 0 }}>{hw.title}</p>
                        {hw.description && <p style={{ fontSize: '12px', color: 'var(--ink-3)' }}>{hw.description}</p>}
                        {due && <p style={{ fontSize: '11px', fontWeight: 500, color: due.overdue ? '#c0392b' : 'var(--ink-3)', marginTop: '3px' }}>{due.label}</p>}
                      </div>
                      <button onClick={() => deleteHW(hw.id)} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 0, opacity: 0.5, flexShrink: 0 }}><X size={13} /></button>
                    </div>
                  )
                })}
                {doneHW.length > 0 && (
                  <div style={{ padding: '10px 16px', borderTop: pendingHW.length > 0 ? '1px solid var(--line)' : 'none' }}>
                    <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>Done</p>
                    {doneHW.map(hw => (
                      <div key={hw.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', opacity: 0.55 }}>
                        <button onClick={() => toggleHW(hw.id, hw.done)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                          <CheckCircle2 size={16} color="var(--java-ink)" />
                        </button>
                        <span style={{ fontSize: '13px', color: 'var(--ink-2)', textDecoration: 'line-through', flex: 1 }}>{hw.title}</span>
                        <button onClick={() => deleteHW(hw.id)} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
