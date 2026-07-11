'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, ChevronRight, Circle, Loader2, Trash2, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface SubjectTopic { name: string; subtopics: string[] }

interface Subject {
  id: string
  name: string
  code: string
  color: string
  bg_color: string
  topics: SubjectTopic[]
  topics_done: string[]
  created_at: string
}

interface DraftTopic {
  _id: number
  name: string
  subtopics: string[]
  _subDraft: string
}

const PRESETS = [
  { ink: '#3D1F8A', bg: '#EDE8F7', label: 'Purple' },
  { ink: '#1A4A3C', bg: '#E0EDEA', label: 'Green' },
  { ink: '#7A4800', bg: '#FDF0D8', label: 'Amber' },
  { ink: '#7A2020', bg: '#F2E8E8', label: 'Red' },
  { ink: '#1A2F6A', bg: '#E8EEF8', label: 'Blue' },
  { ink: '#4A3A1A', bg: '#F4EFE0', label: 'Brown' },
]

function normalizeForDedup(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/^(chapter|unit|topic|module|section|part)\s*[\d]*[\s:.]+/i, '')
    .replace(/^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})[\s.:)]+/i, '')
    .replace(/^\d+(\.\d+)*[\s.:)]+/, '')
    .trim()
}

function normalizeTopics(raw: unknown[]): SubjectTopic[] {
  return raw.map(t => {
    if (typeof t === 'string') return { name: t, subtopics: [] }
    if (t && typeof t === 'object' && 'name' in t) {
      return { name: (t as SubjectTopic).name, subtopics: (t as SubjectTopic).subtopics ?? [] }
    }
    return { name: String(t), subtopics: [] }
  })
}

function parsePastedText(text: string): SubjectTopic[] {
  const lines = text.split('\n')
  const topics: SubjectTopic[] = []
  let current: SubjectTopic | null = null

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) continue

    const indent = line.length - line.trimStart().length
    const content = line.trim()

    // Skip pure number/letter separator lines
    if (/^[-=_*]{3,}$/.test(content)) continue

    const isBullet = /^[-*•]/.test(content)
    const isNumbered = /^\d+(\.\d+)*[\s.:)]/.test(content)
    const isHeading = content.startsWith('#')

    if (isHeading) {
      const name = content.replace(/^#+\s*/, '').trim()
      if (name) { current = { name, subtopics: [] }; topics.push(current) }
    } else if (indent > 0 || (isBullet && current)) {
      const sub = content.replace(/^[-*•]\s*/, '').trim()
      if (sub && current) current.subtopics.push(sub)
      else if (sub) {
        current = { name: sub, subtopics: [] }
        topics.push(current)
      }
    } else if (isBullet) {
      const name = content.replace(/^[-*•]\s*/, '').trim()
      if (name) { current = { name, subtopics: [] }; topics.push(current) }
    } else if (isNumbered) {
      const name = content.replace(/^\d+(\.\d+)*[\s.:)]+/, '').trim()
      if (name) { current = { name, subtopics: [] }; topics.push(current) }
    } else {
      if (content) { current = { name: content, subtopics: [] }; topics.push(current) }
    }
  }

  return topics.filter(t => t.name.trim())
}

function mergeTopics(existing: DraftTopic[], incoming: SubjectTopic[]): DraftTopic[] {
  let nextId = existing.reduce((max, t) => Math.max(max, t._id), 0) + 1
  const result = [...existing]

  for (const inc of incoming) {
    const normInc = normalizeForDedup(inc.name)
    const idx = result.findIndex(t => normalizeForDedup(t.name) === normInc)
    if (idx >= 0) {
      const existSubs = new Set(result[idx].subtopics.map(s => normalizeForDedup(s)))
      const toAdd = inc.subtopics.filter(s => !existSubs.has(normalizeForDedup(s)))
      result[idx] = { ...result[idx], subtopics: [...result[idx].subtopics, ...toAdd] }
    } else {
      result.push({ _id: nextId++, name: inc.name, subtopics: inc.subtopics, _subDraft: '' })
    }
  }
  return result
}

let _draftId = 1
function newDraft(name: string, subtopics: string[] = []): DraftTopic {
  return { _id: _draftId++, name, subtopics, _subDraft: '' }
}

export default function SyllabusPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formColor, setFormColor] = useState(0)
  const [formTopics, setFormTopics] = useState<DraftTopic[]>([])
  const [topicDraft, setTopicDraft] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [pasteMode, setPasteMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set())

  async function loadSubjects() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setSubjects((data ?? []).map(s => ({
      ...s,
      topics: normalizeTopics(s.topics ?? []),
      topics_done: s.topics_done ?? [],
    })))
    setLoading(false)
  }

  useEffect(() => { loadSubjects() }, [])

  function addTopic() {
    const name = topicDraft.trim()
    if (!name) return
    const norm = normalizeForDedup(name)
    const exists = formTopics.some(t => normalizeForDedup(t.name) === norm)
    if (!exists) setFormTopics(p => [...p, newDraft(name)])
    setTopicDraft('')
  }

  function removeTopic(id: number) {
    setFormTopics(p => p.filter(t => t._id !== id))
  }

  function addSubtopic(topicId: number) {
    setFormTopics(p => p.map(t => {
      if (t._id !== topicId) return t
      const sub = t._subDraft.trim()
      if (!sub) return t
      const normSub = normalizeForDedup(sub)
      if (t.subtopics.some(s => normalizeForDedup(s) === normSub)) return { ...t, _subDraft: '' }
      return { ...t, subtopics: [...t.subtopics, sub], _subDraft: '' }
    }))
  }

  function removeSubtopic(topicId: number, subIdx: number) {
    setFormTopics(p => p.map(t =>
      t._id === topicId ? { ...t, subtopics: t.subtopics.filter((_, i) => i !== subIdx) } : t
    ))
  }

  function applyPaste() {
    const parsed = parsePastedText(pasteText)
    if (!parsed.length) return
    setFormTopics(p => mergeTopics(p, parsed))
    setPasteText('')
    setPasteMode(false)
  }

  function resetForm() {
    setFormName(''); setFormCode(''); setFormColor(0)
    setFormTopics([]); setTopicDraft(''); setPasteText(''); setPasteMode(false)
    setExpandedTopics(new Set())
  }

  async function saveSubject() {
    if (!formName.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const preset = PRESETS[formColor]
    const topicsToSave = formTopics.map(t => ({ name: t.name, subtopics: t.subtopics }))

    const { error } = await supabase.from('subjects').insert({
      user_id: user.id,
      name: formName.trim(),
      code: formCode.trim(),
      color: preset.ink,
      bg_color: preset.bg,
      topics: topicsToSave,
    })
    setSaving(false)
    if (!error) { setModalOpen(false); resetForm(); loadSubjects() }
  }

  async function deleteSubject(id: string) {
    if (!confirm('Delete this subject? This also deletes all homework for it. This cannot be undone.')) return
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('homework').delete().eq('subject_id', id)
    await supabase.from('subjects').delete().eq('id', id)
    setDeletingId(null)
    setSubjects(p => p.filter(s => s.id !== id))
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
        <div style={{ border: '2px dashed var(--line-strong)', borderRadius: 'var(--r)', padding: '56px 32px', textAlign: 'center' }}>
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
            const totalTopics = sub.topics.length
            const donePct = totalTopics > 0 ? Math.round(((sub.topics_done?.length ?? 0) / totalTopics) * 100) : 0
            return (
              <div key={sub.id} style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px 14px', borderBottom: totalTopics > 0 ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: totalTopics > 0 ? '8px' : 0 }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: sub.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-head)', fontSize: '18px', fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{sub.name}</span>
                      {sub.code && <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', padding: '2px 10px', borderRadius: '999px', background: sub.bg_color, color: sub.color }}>{sub.code}</span>}
                    </div>
                    {totalTopics > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, maxWidth: '200px', height: '3px', background: 'var(--line-strong)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${donePct}%`, background: sub.color, borderRadius: '2px' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>{sub.topics_done?.length ?? 0} / {totalTopics} topics</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <Link
                      href={`/dashboard/syllabus/${sub.id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '12px', fontWeight: 500, color: 'var(--ink-2)', textDecoration: 'none' }}
                    >
                      Open <ChevronRight size={13} />
                    </Link>
                    <button
                      onClick={() => deleteSubject(sub.id)}
                      disabled={deletingId === sub.id}
                      aria-label="Delete subject"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer', opacity: deletingId === sub.id ? 0.4 : 1 }}
                    >
                      {deletingId === sub.id ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>

                {/* Topics preview */}
                {totalTopics > 0 && (
                  <div style={{ padding: '14px 20px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    {sub.topics.slice(0, 8).map((topic, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '5px 0' }}>
                        <Circle size={11} color="var(--line-strong)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>{topic.name}</span>
                          {topic.subtopics.length > 0 && (
                            <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>
                              {topic.subtopics.slice(0, 2).join(', ')}{topic.subtopics.length > 2 ? '…' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {totalTopics > 8 && (
                      <div style={{ padding: '5px 0', fontSize: '11px', color: 'var(--ink-3)' }}>+{totalTopics - 8} more…</div>
                    )}
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
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(26,23,20,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => { if (e.target === e.currentTarget) { setModalOpen(false); resetForm() } }}
        >
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--r)', border: '1px solid var(--line)', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Add Subject</h3>
              <button onClick={() => { setModalOpen(false); resetForm() }} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', display: 'flex', padding: '4px' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '24px' }}>

              {/* Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>Subject Name *</label>
                <input autoFocus type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Operating Systems"
                  style={{ width: '100%', padding: '11px 14px', background: 'var(--bg-panel)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '15px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Code */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>Subject Code</label>
                <input type="text" value={formCode} onChange={e => setFormCode(e.target.value)} placeholder="e.g. CS302"
                  style={{ width: '160px', padding: '11px 14px', background: 'var(--bg-panel)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '15px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }} />
              </div>

              {/* Color */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '10px' }}>Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRESETS.map((p, idx) => (
                    <button key={idx} onClick={() => setFormColor(idx)} title={p.label}
                      style={{ width: '36px', height: '36px', borderRadius: 'var(--r)', background: p.bg, border: formColor === idx ? `2px solid ${p.ink}` : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: p.ink }} />
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: preset.bg, borderRadius: '999px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: preset.ink }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: preset.ink }}>{formName || 'Subject Name'} {formCode ? `· ${formCode}` : ''}</span>
                </div>
              </div>

              {/* Topics section */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                    Syllabus Topics {formTopics.length > 0 && `(${formTopics.length})`}
                  </label>
                  <button
                    onClick={() => setPasteMode(p => !p)}
                    style={{ fontSize: '11px', color: pasteMode ? preset.ink : 'var(--ink-2)', background: pasteMode ? preset.bg : 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: pasteMode ? 600 : 400 }}
                  >
                    {pasteMode ? 'Back to manual' : 'Paste syllabus text'}
                  </button>
                </div>

                {pasteMode ? (
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--ink-3)', marginBottom: '10px' }}>
                      Paste your syllabus text — any format works (numbered lists, bullet points, headings). Existing topics will be merged, not duplicated.
                    </p>
                    <textarea
                      autoFocus
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                      placeholder={`# Unit 1: Arrays\n- 1D and 2D arrays\n- Dynamic arrays\n\n# Unit 2: Linked Lists\n- Singly linked list\n- Doubly linked list`}
                      rows={10}
                      style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-panel)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button onClick={() => { setPasteText(''); setPasteMode(false) }}
                        style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                        Cancel
                      </button>
                      <button onClick={applyPaste} disabled={!pasteText.trim()}
                        style={{ flex: 2, padding: '10px', background: pasteText.trim() ? 'var(--ink)' : 'var(--line-strong)', color: pasteText.trim() ? 'var(--bg)' : 'var(--ink-3)', border: 'none', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 500, cursor: pasteText.trim() ? 'pointer' : 'default', fontFamily: 'var(--font-body)' }}>
                        Import topics
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Manual add row */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <input
                        type="text"
                        value={topicDraft}
                        onChange={e => setTopicDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic() } }}
                        placeholder="Add a topic and press Enter"
                        style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-panel)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
                      />
                      <button onClick={addTopic}
                        style={{ padding: '10px 16px', background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                        Add
                      </button>
                    </div>

                    {/* Topic list */}
                    {formTopics.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--ink-3)' }}>No topics yet — type one above or paste your syllabus.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {formTopics.map((t) => {
                          const isExpanded = expandedTopics.has(t._id)
                          return (
                            <div key={t._id} style={{ background: preset.bg, borderRadius: 'var(--r)', border: `1px solid ${preset.ink}20`, overflow: 'hidden' }}>
                              {/* Topic row */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
                                <button onClick={() => setExpandedTopics(p => { const n = new Set(p); isExpanded ? n.delete(t._id) : n.add(t._id); return n })}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: preset.ink, display: 'flex', padding: 0, opacity: 0.7, flexShrink: 0 }}>
                                  <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                                </button>
                                <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: preset.ink }}>{t.name}</span>
                                {t.subtopics.length > 0 && <span style={{ fontSize: '10px', color: preset.ink, opacity: 0.6 }}>{t.subtopics.length} subtopics</span>}
                                <button onClick={() => removeTopic(t._id)} aria-label="Remove topic"
                                  style={{ background: 'none', border: 'none', color: preset.ink, cursor: 'pointer', display: 'flex', padding: 0, opacity: 0.5 }}>
                                  <X size={13} />
                                </button>
                              </div>

                              {/* Expanded: subtopics */}
                              {isExpanded && (
                                <div style={{ padding: '0 12px 10px 34px', borderTop: `1px solid ${preset.ink}15` }}>
                                  {t.subtopics.map((sub, si) => (
                                    <div key={si} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
                                      <span style={{ fontSize: '12px', color: preset.ink, opacity: 0.8, flex: 1 }}>• {sub}</span>
                                      <button onClick={() => removeSubtopic(t._id, si)} style={{ background: 'none', border: 'none', color: preset.ink, cursor: 'pointer', padding: 0, opacity: 0.4 }}>
                                        <X size={11} />
                                      </button>
                                    </div>
                                  ))}
                                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                    <input
                                      type="text"
                                      value={t._subDraft}
                                      onChange={e => setFormTopics(p => p.map(x => x._id === t._id ? { ...x, _subDraft: e.target.value } : x))}
                                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtopic(t._id) } }}
                                      placeholder="Add subtopic…"
                                      style={{ flex: 1, padding: '6px 10px', background: 'var(--bg)', border: `1px solid ${preset.ink}30`, borderRadius: 'var(--r)', fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
                                    />
                                    <button onClick={() => addSubtopic(t._id)}
                                      style={{ padding: '6px 10px', background: preset.ink, color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                                      Add
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => { setModalOpen(false); resetForm() }}
                  style={{ padding: '11px 20px', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '14px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  Cancel
                </button>
                <button onClick={saveSubject} disabled={!formName.trim() || saving}
                  style={{ padding: '11px 24px', background: formName.trim() && !saving ? 'var(--ink)' : 'var(--line-strong)', color: formName.trim() && !saving ? 'var(--bg)' : 'var(--ink-3)', border: 'none', borderRadius: 'var(--r)', fontSize: '14px', fontWeight: 500, cursor: formName.trim() && !saving ? 'pointer' : 'default', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {saving ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</> : 'Create Subject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
