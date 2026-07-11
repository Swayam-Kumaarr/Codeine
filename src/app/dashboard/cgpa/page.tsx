'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, GraduationCap, Target, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

// In-memory subject has a stable _key for React list diffing (not persisted)
interface Subject { _key: string; name: string; credits: number; grade: number }
interface SubjectDB { name: string; credits: number; grade: number }

interface Semester {
  id: string
  sem_number: number
  subjects: Subject[]
  calculated_gpa: number | null
  _unsaved?: boolean
}

const GRADE_POINTS: { label: string; value: number }[] = [
  { label: 'O (10)', value: 10 },
  { label: 'A+ (9)', value: 9 },
  { label: 'A (8)', value: 8 },
  { label: 'B+ (7)', value: 7 },
  { label: 'B (6)', value: 6 },
  { label: 'C (5)', value: 5 },
  { label: 'P (4)', value: 4 },
  { label: 'F (0)', value: 0 },
]

let keyCounter = 0
function newKey() { return `k${++keyCounter}` }

function toMemSubject(s: SubjectDB): Subject {
  return { ...s, _key: newKey() }
}

function toDBSubject(s: Subject): SubjectDB {
  return { name: s.name, credits: s.credits, grade: s.grade }
}

function calcGPA(subjects: Subject[]): number {
  const totalCredits = subjects.reduce((s, sub) => s + sub.credits, 0)
  if (!totalCredits) return 0
  const totalPoints = subjects.reduce((s, sub) => s + sub.credits * sub.grade, 0)
  return Math.round((totalPoints / totalCredits) * 100) / 100
}

function calcCGPA(sems: Semester[]): number {
  return calcGPA(sems.flatMap(s => s.subjects))
}

export default function CGPAPage() {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [targetCGPA, setTargetCGPA] = useState('8.0')
  const [targetCredits, setTargetCredits] = useState('20')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data, error: dbErr } = await supabase
      .from('cgpa_semesters')
      .select('*')
      .eq('user_id', user.id)
      .order('sem_number', { ascending: true })

    if (dbErr) { setError(dbErr.message); setLoading(false); return }

    if (data && data.length > 0) {
      setSemesters(data.map(d => ({
        ...d,
        subjects: (d.subjects as SubjectDB[]).map(toMemSubject),
      })))
    } else {
      // Pre-fill with Swayam's known grades — marked as unsaved so the banner shows
      setSemesters([
        {
          id: 'new-1',
          sem_number: 1,
          calculated_gpa: 7.98,
          subjects: [toMemSubject({ name: 'Semester 1 Average', credits: 18, grade: 7.98 })],
          _unsaved: true,
        },
        {
          id: 'new-2',
          sem_number: 2,
          calculated_gpa: 7.33,
          subjects: [toMemSubject({ name: 'Semester 2 Average', credits: 22, grade: 7.33 })],
          _unsaved: true,
        },
      ])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveSem(sem: Semester) {
    setSaving(sem.id)
    setSaveError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(null); return }

    const gpa = calcGPA(sem.subjects)
    const payload = {
      user_id: user.id,
      sem_number: sem.sem_number,
      subjects: sem.subjects.map(toDBSubject),
      calculated_gpa: gpa,
    }

    if (sem.id.startsWith('new-')) {
      const { data, error: dbErr } = await supabase.from('cgpa_semesters').insert(payload).select().single()
      if (dbErr) { setSaveError(dbErr.message); setSaving(null); return }
      if (data) {
        setSemesters(prev => prev.map(s => s.id === sem.id
          ? { ...data, subjects: (data.subjects as SubjectDB[]).map(toMemSubject), _unsaved: false }
          : s
        ))
      }
    } else {
      const { error: dbErr } = await supabase.from('cgpa_semesters').update(payload).eq('id', sem.id).eq('user_id', user.id)
      if (dbErr) { setSaveError(dbErr.message); setSaving(null); return }
      setSemesters(prev => prev.map(s => s.id === sem.id ? { ...s, calculated_gpa: gpa, _unsaved: false } : s))
    }
    setSaving(null)
  }

  async function deleteSem(semId: string) {
    if (!window.confirm('Delete this semester and all its subjects? This cannot be undone.')) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (!semId.startsWith('new-')) {
      const { error: dbErr } = await supabase.from('cgpa_semesters').delete().eq('id', semId).eq('user_id', user.id)
      if (dbErr) { setError(dbErr.message); return }
    }
    setSemesters(prev => prev.filter(s => s.id !== semId))
    if (expanded === semId) setExpanded(null)
  }

  function addSemester() {
    const nextNum = semesters.length > 0 ? Math.max(...semesters.map(s => s.sem_number)) + 1 : 1
    const newSem: Semester = {
      id: `new-${Date.now()}`,
      sem_number: nextNum,
      subjects: [toMemSubject({ name: '', credits: 3, grade: 8 })],
      calculated_gpa: null,
      _unsaved: true,
    }
    setSemesters(prev => [...prev, newSem])
    setExpanded(newSem.id)
  }

  function updateSubject(semId: string, key: string, field: keyof SubjectDB, value: string | number) {
    setSemesters(prev => prev.map(s => {
      if (s.id !== semId) return s
      const subjects = s.subjects.map(sub => sub._key === key ? { ...sub, [field]: value } : sub)
      return { ...s, subjects, calculated_gpa: calcGPA(subjects), _unsaved: true }
    }))
  }

  function addSubject(semId: string) {
    setSemesters(prev => prev.map(s =>
      s.id === semId
        ? { ...s, subjects: [...s.subjects, toMemSubject({ name: '', credits: 3, grade: 8 })], _unsaved: true }
        : s
    ))
  }

  function removeSubject(semId: string, key: string) {
    setSemesters(prev => prev.map(s => {
      if (s.id !== semId) return s
      const subjects = s.subjects.filter(sub => sub._key !== key)
      return { ...s, subjects, calculated_gpa: calcGPA(subjects), _unsaved: true }
    }))
  }

  const cgpa = calcCGPA(semesters)
  const totalCredits = semesters.reduce((s, sem) => s + sem.subjects.reduce((a, sub) => a + sub.credits, 0), 0)
  const targetCGPANum = parseFloat(targetCGPA) || 0
  const targetCreditsNum = parseInt(targetCredits) || 0
  const hasUnsaved = semesters.some(s => s._unsaved)

  let neededGPA: number | null = null
  if (targetCGPANum > 0 && targetCreditsNum > 0 && totalCredits > 0) {
    const currentTotal = semesters.reduce((s, sem) =>
      s + sem.subjects.reduce((a, sub) => a + sub.credits * sub.grade, 0), 0)
    const needed = (targetCGPANum * (totalCredits + targetCreditsNum) - currentTotal) / targetCreditsNum
    neededGPA = Math.round(needed * 100) / 100
  }

  return (
    <div style={{ padding: '40px', maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <GraduationCap size={22} color="var(--dsa-ink)" />
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '32px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>
            CGPA Calculator
          </h1>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>Track your semester GPA and calculate cumulative CGPA</p>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'var(--rev-bg)', border: '1px solid var(--rev-ink)', borderRadius: 'var(--r)', marginBottom: '16px', fontSize: '13px', color: 'var(--rev-ink)' }}>
          <AlertCircle size={14} /> {error}
          <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rev-ink)', fontSize: '12px', fontFamily: 'var(--font-body)', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* Unsaved changes warning */}
      {hasUnsaved && !loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--lc-bg)', border: '1px solid var(--lc-ink)', borderRadius: 'var(--r)', marginBottom: '16px', fontSize: '13px', color: 'var(--lc-ink)' }}>
          <AlertCircle size={13} />
          You have unsaved semesters — hit <strong style={{ margin: '0 4px' }}>Save semester</strong> on each one to persist them.
        </div>
      )}

      {saveError && (
        <div style={{ padding: '10px 14px', background: 'var(--rev-bg)', border: '1px solid var(--rev-ink)', borderRadius: 'var(--r)', fontSize: '12px', color: 'var(--rev-ink)', marginBottom: '14px' }}>
          Save failed: {saveError}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ink-3)' }}>
          <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '14px' }}>Loading…</span>
        </div>
      ) : (
        <>
          {/* CGPA banner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '28px' }}>
            {[
              { label: 'Current CGPA', value: cgpa.toFixed(2), color: cgpa >= 8 ? 'var(--java-ink)' : cgpa >= 7 ? 'var(--dsa-ink)' : 'var(--ink)', note: hasUnsaved ? '(preview)' : null },
              { label: 'Total Credits', value: totalCredits.toString(), color: 'var(--ink)', note: null },
              { label: 'Semesters', value: semesters.length.toString(), color: 'var(--ink-2)', note: null },
            ].map(({ label, value, color, note }) => (
              <div key={label} style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>
                  {label} {note && <span style={{ fontSize: '9px', color: 'var(--lc-ink)', fontWeight: 700 }}>{note}</span>}
                </p>
                <p style={{ fontFamily: 'var(--font-head)', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.04em', color, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* What do I need? */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '20px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Target size={15} color="var(--dsa-ink)" />
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>What GPA do I need next semester?</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Target CGPA</label>
                <input
                  type="number" step="0.01" min="0" max="10"
                  value={targetCGPA}
                  onChange={e => setTargetCGPA(e.target.value)}
                  style={{ padding: '8px 12px', width: '100px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Credits next sem</label>
                <input
                  type="number" min="1"
                  value={targetCredits}
                  onChange={e => setTargetCredits(e.target.value)}
                  style={{ padding: '8px 12px', width: '100px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
                />
              </div>
              {neededGPA !== null && (
                <div style={{ padding: '8px 20px', background: neededGPA > 10 ? 'var(--rev-bg)' : neededGPA <= 0 ? 'var(--java-bg)' : 'var(--dsa-bg)', borderRadius: 'var(--r)', border: `1px solid ${neededGPA > 10 ? 'var(--rev-ink)' : neededGPA <= 0 ? 'var(--java-ink)' : 'var(--dsa-ink)'}` }}>
                  {neededGPA > 10 ? (
                    <p style={{ fontSize: '13px', color: 'var(--rev-ink)', fontWeight: 500 }}>Not achievable (would need {neededGPA.toFixed(2)} / 10)</p>
                  ) : neededGPA <= 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--java-ink)', fontWeight: 500 }}>Already achieved your target!</p>
                  ) : (
                    <p style={{ fontSize: '13px', color: 'var(--dsa-ink)', fontWeight: 500 }}>You need <strong>{neededGPA.toFixed(2)}</strong> next semester</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Semester list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            {semesters.map(sem => {
              const gpa = calcGPA(sem.subjects)
              const isExpanded = expanded === sem.id
              return (
                <div key={sem.id} style={{ background: 'var(--bg-panel)', border: `1px solid ${sem._unsaved ? 'var(--lc-ink)' : 'var(--line)'}`, borderRadius: 'var(--r)', overflow: 'hidden' }}>
                  {/* Sem header */}
                  <div
                    onClick={() => setExpanded(isExpanded ? null : sem.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--line)' : 'none' }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', minWidth: '60px' }}>Sem {sem.sem_number}</span>
                    <span style={{ flex: 1, fontSize: '14px', color: 'var(--ink)' }}>
                      {sem.subjects.length} subject{sem.subjects.length !== 1 ? 's' : ''} · {sem.subjects.reduce((a, s) => a + s.credits, 0)} credits
                    </span>
                    {sem._unsaved && <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--lc-ink)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>UNSAVED</span>}
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: '20px', fontWeight: 600, color: gpa >= 8 ? 'var(--java-ink)' : gpa >= 7 ? 'var(--dsa-ink)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{gpa.toFixed(2)}</span>
                    <button
                      onClick={e => { e.stopPropagation(); deleteSem(sem.id) }}
                      style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                    >
                      <Trash2 size={13} />
                    </button>
                    {isExpanded ? <ChevronUp size={14} color="var(--ink-3)" /> : <ChevronDown size={14} color="var(--ink-3)" />}
                  </div>

                  {/* Subjects editor */}
                  {isExpanded && (
                    <div style={{ padding: '16px 18px' }}>
                      {/* Column headers */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 28px', gap: '8px', marginBottom: '8px' }}>
                        {['Subject', 'Credits', 'Grade', ''].map(h => (
                          <span key={h} style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{h}</span>
                        ))}
                      </div>

                      {sem.subjects.map(sub => (
                        <div key={sub._key} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 28px', gap: '8px', marginBottom: '8px' }}>
                          <input
                            placeholder="Subject name"
                            value={sub.name}
                            onChange={e => updateSubject(sem.id, sub._key, 'name', e.target.value)}
                            style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
                          />
                          <input
                            type="number" min="1" max="10"
                            value={sub.credits}
                            onChange={e => updateSubject(sem.id, sub._key, 'credits', Math.max(1, parseInt(e.target.value) || 1))}
                            style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
                          />
                          <select
                            value={sub.grade}
                            onChange={e => updateSubject(sem.id, sub._key, 'grade', parseFloat(e.target.value))}
                            style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
                          >
                            {GRADE_POINTS.map(g => (
                              <option key={g.value} value={g.value}>{g.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => removeSubject(sem.id, sub._key)}
                            style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button
                          onClick={() => addSubject(sem.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '12px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                        >
                          <Plus size={12} /> Add subject
                        </button>
                        <button
                          onClick={() => saveSem(sem)}
                          disabled={saving === sem.id}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 18px', background: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', fontSize: '12px', color: 'var(--bg)', cursor: saving === sem.id ? 'default' : 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 }}
                        >
                          {saving === sem.id ? <><Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</> : 'Save semester'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button
            onClick={addSemester}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'transparent', border: '2px dashed var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)', width: '100%', justifyContent: 'center' }}
          >
            <Plus size={14} /> Add semester
          </button>
        </>
      )}
    </div>
  )
}
