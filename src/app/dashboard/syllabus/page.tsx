'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, ChevronRight, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Subject {
  id: string
  name: string
  code: string
  color: string
  bg_color: string
  topics: string[]
  topics_done: string[]
  created_at: string
}

const PRESETS = [
  { ink: '#3D1F8A', bg: '#EDE8F7', label: 'Purple' },
  { ink: '#1A4A3C', bg: '#E0EDEA', label: 'Green' },
  { ink: '#7A4800', bg: '#FDF0D8', label: 'Amber' },
  { ink: '#7A2020', bg: '#F2E8E8', label: 'Red' },
  { ink: '#1A2F6A', bg: '#E8EEF8', label: 'Blue' },
  { ink: '#4A3A1A', bg: '#F4EFE0', label: 'Brown' },
]

export default function SyllabusPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // Add subject form
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formColor, setFormColor] = useState(0)
  const [formTopic, setFormTopic] = useState('')
  const [formTopics, setFormTopics] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  async function loadSubjects() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setSubjects(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadSubjects() }, [])

  function addTopic() {
    const t = formTopic.trim()
    if (!t || formTopics.includes(t)) return
    setFormTopics(p => [...p, t])
    setFormTopic('')
  }

  function removeTopic(t: string) {
    setFormTopics(p => p.filter(x => x !== t))
  }

  function resetForm() {
    setFormName(''); setFormCode(''); setFormColor(0)
    setFormTopic(''); setFormTopics([])
  }

  async function saveSubject() {
    if (!formName.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const preset = PRESETS[formColor]
    const { error } = await supabase.from('subjects').insert({
      user_id: user.id,
      name: formName.trim(),
      code: formCode.trim(),
      color: preset.ink,
      bg_color: preset.bg,
      topics: formTopics,
    })
    setSaving(false)
    if (!error) {
      setModalOpen(false)
      resetForm()
      loadSubjects()
    }
  }

  const preset = PRESETS[formColor]

  return (
    <div style={{ padding: '40px', maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '32px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>
            Subjects
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginTop: '6px' }}>
            {subjects.length === 0 ? 'Add your first subject' : `${subjects.length} subject${subjects.length !== 1 ? 's' : ''} tracked`}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 20px', background: 'var(--ink)', color: 'var(--bg)',
            border: 'none', borderRadius: 'var(--r)',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          <Plus size={15} /> Add Subject
        </button>
      </div>

      {/* Subject list */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ink-3)', padding: '40px 0' }}>
          <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '14px' }}>Loading subjects…</span>
        </div>
      ) : subjects.length === 0 ? (
        <div style={{
          border: '2px dashed var(--line-strong)', borderRadius: 'var(--r)',
          padding: '56px 32px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-head)', fontSize: '20px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>No subjects yet</p>
          <p style={{ fontSize: '14px', color: 'var(--ink-3)', marginBottom: '24px' }}>Add your college subjects to track topics, homework, and files.</p>
          <button
            onClick={() => setModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 24px', background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--r)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            <Plus size={15} /> Add your first subject
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {subjects.map(sub => {
            return (
              <div key={sub.id} style={{
                background: 'var(--bg-panel)', border: '1px solid var(--line)',
                borderRadius: 'var(--r)', overflow: 'hidden',
              }}>
                {/* Subject header */}
                <div style={{
                  padding: '18px 20px 14px',
                  borderBottom: sub.topics.length > 0 ? '1px solid var(--line)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: sub.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-head)', fontSize: '18px', fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                        {sub.name}
                      </span>
                      {sub.code && (
                        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', padding: '2px 10px', borderRadius: '999px', background: sub.bg_color, color: sub.color }}>
                          {sub.code}
                        </span>
                      )}
                    </div>
                    {sub.topics.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, maxWidth: '200px', height: '3px', background: 'var(--line-strong)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.round(((sub.topics_done?.length ?? 0) / sub.topics.length) * 100)}%`, background: sub.color, borderRadius: '2px' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>{sub.topics_done?.length ?? 0} / {sub.topics.length} topics</span>
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/syllabus/${sub.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px',
                      border: '1px solid var(--line-strong)',
                      borderRadius: 'var(--r)',
                      fontSize: '12px', fontWeight: 500, color: 'var(--ink-2)',
                      textDecoration: 'none', flexShrink: 0,
                      transition: 'background 0.15s',
                    }}
                  >
                    Open <ChevronRight size={13} />
                  </Link>
                </div>

                {/* Topics grid */}
                {sub.topics.length > 0 && (
                  <div style={{
                    padding: '14px 20px 16px',
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px',
                  }}>
                    {sub.topics.map((topic, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                        <Circle size={13} color="var(--line-strong)" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>{topic}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Subject Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(26,23,20,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
          onClick={e => { if (e.target === e.currentTarget) { setModalOpen(false); resetForm() } }}
        >
          <div style={{
            background: 'var(--bg)', borderRadius: 'var(--r)',
            border: '1px solid var(--line)', width: '100%', maxWidth: '520px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                Add Subject
              </h3>
              <button
                onClick={() => { setModalOpen(false); resetForm() }}
                aria-label="Close"
                style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', display: 'flex', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div style={{ padding: '24px' }}>

              {/* Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>
                  Subject Name *
                </label>
                <input
                  autoFocus
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Operating Systems"
                  style={{
                    width: '100%', padding: '11px 14px',
                    background: 'var(--bg-panel)', border: '1px solid var(--line-strong)',
                    borderRadius: 'var(--r)', fontSize: '15px', fontFamily: 'var(--font-body)',
                    color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Code */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>
                  Subject Code
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value)}
                  placeholder="e.g. CS302"
                  style={{
                    width: '160px', padding: '11px 14px',
                    background: 'var(--bg-panel)', border: '1px solid var(--line-strong)',
                    borderRadius: 'var(--r)', fontSize: '15px', fontFamily: 'var(--font-body)',
                    color: 'var(--ink)', outline: 'none',
                  }}
                />
              </div>

              {/* Color */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '10px' }}>
                  Color
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setFormColor(idx)}
                      title={p.label}
                      style={{
                        width: '36px', height: '36px',
                        borderRadius: 'var(--r)',
                        background: p.bg,
                        border: formColor === idx ? `2px solid ${p.ink}` : '2px solid transparent',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: p.ink }} />
                    </button>
                  ))}
                </div>
                {/* Preview */}
                <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: preset.bg, borderRadius: '999px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: preset.ink }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: preset.ink }}>
                    {formName || 'Subject Name'} {formCode ? `· ${formCode}` : ''}
                  </span>
                </div>
              </div>

              {/* Topics */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>
                  Syllabus Topics
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={e => setFormTopic(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic() } }}
                    placeholder="Type a topic and press Enter"
                    style={{
                      flex: 1, padding: '10px 14px',
                      background: 'var(--bg-panel)', border: '1px solid var(--line-strong)',
                      borderRadius: 'var(--r)', fontSize: '14px', fontFamily: 'var(--font-body)',
                      color: 'var(--ink)', outline: 'none',
                    }}
                  />
                  <button
                    onClick={addTopic}
                    style={{
                      padding: '10px 16px', background: 'var(--ink)', color: 'var(--bg)',
                      border: 'none', borderRadius: 'var(--r)', fontSize: '13px',
                      fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)',
                    }}
                  >
                    Add
                  </button>
                </div>
                {formTopics.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {formTopics.map(t => (
                      <div key={t} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '5px 12px', background: preset.bg,
                        borderRadius: '999px', border: `1px solid ${preset.ink}22`,
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: preset.ink }}>{t}</span>
                        <button
                          onClick={() => removeTopic(t)}
                          aria-label={`Remove topic ${t}`}
                          style={{ background: 'none', border: 'none', color: preset.ink, cursor: 'pointer', display: 'flex', padding: 0, opacity: 0.6 }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {formTopics.length === 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--ink-3)' }}>No topics added yet. You can add them later too.</p>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setModalOpen(false); resetForm() }}
                  style={{ padding: '11px 20px', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '14px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveSubject}
                  disabled={!formName.trim() || saving}
                  style={{
                    padding: '11px 24px',
                    background: formName.trim() && !saving ? 'var(--ink)' : 'var(--line-strong)',
                    color: formName.trim() && !saving ? 'var(--bg)' : 'var(--ink-3)',
                    border: 'none', borderRadius: 'var(--r)', fontSize: '14px',
                    fontWeight: 500, cursor: formName.trim() && !saving ? 'pointer' : 'default',
                    fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  {saving ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</> : 'Create Subject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
