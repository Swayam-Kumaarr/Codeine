'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, GraduationCap, Target, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Subject { name: string; credits: number; grade: number }
interface Semester {
  id: string
  sem_number: number
  subjects: Subject[]
  calculated_gpa: number | null
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

function calcGPA(subjects: Subject[]): number {
  const totalCredits = subjects.reduce((s, sub) => s + sub.credits, 0)
  if (!totalCredits) return 0
  const totalPoints = subjects.reduce((s, sub) => s + sub.credits * sub.grade, 0)
  return Math.round((totalPoints / totalCredits) * 100) / 100
}

function calcCGPA(sems: Semester[]): number {
  const totalCredits = sems.reduce((s, sem) => {
    return s + sem.subjects.reduce((a, sub) => a + sub.credits, 0)
  }, 0)
  if (!totalCredits) return 0
  const totalPoints = sems.reduce((s, sem) => {
    return s + sem.subjects.reduce((a, sub) => a + sub.credits * sub.grade, 0)
  }, 0)
  return Math.round((totalPoints / totalCredits) * 100) / 100
}

export default function CGPAPage() {
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [targetCGPA, setTargetCGPA] = useState('8.0')
  const [targetCredits, setTargetCredits] = useState('20')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('cgpa_semesters')
      .select('*')
      .eq('user_id', user.id)
      .order('sem_number', { ascending: true })

    if (data && data.length > 0) {
      setSemesters(data.map(d => ({ ...d, subjects: d.subjects as Subject[] })))
    } else {
      // Pre-fill Sem 1 and Sem 2
      setSemesters([
        {
          id: 'new-1',
          sem_number: 1,
          calculated_gpa: 7.98,
          subjects: [{ name: 'Semester 1 Average', credits: 18, grade: 7.98 }],
        },
        {
          id: 'new-2',
          sem_number: 2,
          calculated_gpa: 7.33,
          subjects: [{ name: 'Semester 2 Average', credits: 22, grade: 7.33 }],
        },
      ])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveSem(sem: Semester) {
    setSaving(sem.id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(null); return }

    const gpa = calcGPA(sem.subjects)
    const payload = {
      user_id: user.id,
      sem_number: sem.sem_number,
      subjects: sem.subjects,
      calculated_gpa: gpa,
    }

    if (sem.id.startsWith('new-')) {
      const { data } = await supabase.from('cgpa_semesters').insert(payload).select().single()
      if (data) {
        setSemesters(prev => prev.map(s => s.id === sem.id ? { ...data, subjects: data.subjects as Subject[] } : s))
      }
    } else {
      await supabase.from('cgpa_semesters').update(payload).eq('id', sem.id)
      setSemesters(prev => prev.map(s => s.id === sem.id ? { ...s, calculated_gpa: gpa } : s))
    }
    setSaving(null)
  }

  async function deleteSem(semId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (!semId.startsWith('new-')) {
      await supabase.from('cgpa_semesters').delete().eq('id', semId)
    }
    setSemesters(prev => prev.filter(s => s.id !== semId))
  }

  function addSemester() {
    const nextNum = semesters.length > 0 ? Math.max(...semesters.map(s => s.sem_number)) + 1 : 1
    const newSem: Semester = {
      id: `new-${Date.now()}`,
      sem_number: nextNum,
      subjects: [{ name: '', credits: 3, grade: 8 }],
      calculated_gpa: null,
    }
    setSemesters(prev => [...prev, newSem])
    setExpanded(newSem.id)
  }

  function updateSubject(semId: string, idx: number, field: keyof Subject, value: string | number) {
    setSemesters(prev => prev.map(s => {
      if (s.id !== semId) return s
      const subjects = s.subjects.map((sub, i) => i === idx ? { ...sub, [field]: value } : sub)
      return { ...s, subjects, calculated_gpa: calcGPA(subjects) }
    }))
  }

  function addSubject(semId: string) {
    setSemesters(prev => prev.map(s =>
      s.id === semId ? { ...s, subjects: [...s.subjects, { name: '', credits: 3, grade: 8 }] } : s
    ))
  }

  function removeSubject(semId: string, idx: number) {
    setSemesters(prev => prev.map(s => {
      if (s.id !== semId) return s
      const subjects = s.subjects.filter((_, i) => i !== idx)
      return { ...s, subjects, calculated_gpa: calcGPA(subjects) }
    }))
  }

  const cgpa = calcCGPA(semesters)
  const totalCredits = semesters.reduce((s, sem) => s + sem.subjects.reduce((a, sub) => a + sub.credits, 0), 0)
  const targetCGPANum = parseFloat(targetCGPA) || 0
  const targetCreditsNum = parseInt(targetCredits) || 0

  // What GPA do I need in next sem?
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
              { label: 'Current CGPA', value: cgpa.toFixed(2), color: cgpa >= 8 ? 'var(--java-ink)' : cgpa >= 7 ? 'var(--dsa-ink)' : 'var(--ink)' },
              { label: 'Total Credits', value: totalCredits.toString(), color: 'var(--ink)' },
              { label: 'Semesters', value: semesters.length.toString(), color: 'var(--ink-2)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>{label}</p>
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
                  type="number" min="0"
                  value={targetCredits}
                  onChange={e => setTargetCredits(e.target.value)}
                  style={{ padding: '8px 12px', width: '100px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
                />
              </div>
              {neededGPA !== null && (
                <div style={{ padding: '8px 20px', background: neededGPA > 10 ? 'var(--rev-bg)' : neededGPA <= 0 ? 'var(--java-bg)' : 'var(--dsa-bg)', borderRadius: 'var(--r)', border: `1px solid ${neededGPA > 10 ? 'var(--rev-ink)' : neededGPA <= 0 ? 'var(--java-ink)' : 'var(--dsa-ink)'}` }}>
                  {neededGPA > 10 ? (
                    <p style={{ fontSize: '13px', color: 'var(--rev-ink)', fontWeight: 500 }}>Not achievable (need {neededGPA} / 10)</p>
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
                <div key={sem.id} style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                  {/* Sem header */}
                  <div
                    onClick={() => setExpanded(isExpanded ? null : sem.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--line)' : 'none' }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', minWidth: '60px' }}>Sem {sem.sem_number}</span>
                    <span style={{ flex: 1, fontSize: '14px', color: 'var(--ink)' }}>{sem.subjects.length} subject{sem.subjects.length !== 1 ? 's' : ''} · {sem.subjects.reduce((a, s) => a + s.credits, 0)} credits</span>
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

                      {sem.subjects.map((sub, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 28px', gap: '8px', marginBottom: '8px' }}>
                          <input
                            placeholder="Subject name"
                            value={sub.name}
                            onChange={e => updateSubject(sem.id, idx, 'name', e.target.value)}
                            style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
                          />
                          <input
                            type="number" min="1" max="10"
                            value={sub.credits}
                            onChange={e => updateSubject(sem.id, idx, 'credits', parseInt(e.target.value) || 0)}
                            style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
                          />
                          <select
                            value={sub.grade}
                            onChange={e => updateSubject(sem.id, idx, 'grade', parseFloat(e.target.value))}
                            style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
                          >
                            {GRADE_POINTS.map(g => (
                              <option key={g.value} value={g.value}>{g.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => removeSubject(sem.id, idx)}
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
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 18px', background: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', fontSize: '12px', color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 }}
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

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
