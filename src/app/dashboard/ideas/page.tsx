'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { safeHref } from '@/lib/utils'
import { Plus, Lightbulb, Star, Trash2, ExternalLink, Loader2, X, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

type Status = 'brainstorm' | 'in-progress' | 'submitted' | 'won' | 'abandoned'

interface Idea {
  id: string
  title: string
  problem: string
  tech_stack: string[]
  status: Status
  notes: string
  links: string[]
  is_favorite: boolean
  created_at: string
}

const STATUS_META: Record<Status, { label: string; bg: string; ink: string }> = {
  brainstorm:    { label: 'Brainstorm',  bg: 'var(--lc-bg)',   ink: 'var(--lc-ink)' },
  'in-progress': { label: 'In Progress', bg: 'var(--dsa-bg)',  ink: 'var(--dsa-ink)' },
  submitted:     { label: 'Submitted',   bg: 'var(--java-bg)', ink: 'var(--java-ink)' },
  won:           { label: 'Won',         bg: 'var(--java-bg)', ink: 'var(--java-ink)' },
  abandoned:     { label: 'Abandoned',   bg: 'var(--line)',    ink: 'var(--ink-3)' },
}

const STATUSES: Status[] = ['brainstorm', 'in-progress', 'submitted', 'won', 'abandoned']

function emptyIdea(): Omit<Idea, 'id' | 'created_at'> {
  return { title: '', problem: '', tech_stack: [], status: 'brainstorm', notes: '', links: [], is_favorite: false }
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyIdea())
  const [techInput, setTechInput] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data, error: dbErr } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (dbErr) { setError(dbErr.message); setLoading(false); return }
    setIdeas((data ?? []) as Idea[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function startEdit(idea: Idea) {
    setEditingId(idea.id)
    setForm({ title: idea.title, problem: idea.problem, tech_stack: [...idea.tech_stack], status: idea.status, notes: idea.notes, links: [...idea.links], is_favorite: idea.is_favorite })
    setSaveError(null)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyIdea())
    setTechInput('')
    setLinkInput('')
    setSaveError(null)
  }

  async function saveIdea() {
    if (!form.title.trim()) return
    setSaving(true)
    setSaveError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload = { user_id: user.id, ...form }
    let dbErr
    if (editingId) {
      const { error } = await supabase.from('ideas').update(payload).eq('id', editingId).eq('user_id', user.id)
      dbErr = error
    } else {
      const { error } = await supabase.from('ideas').insert(payload)
      dbErr = error
    }

    if (dbErr) {
      setSaveError(dbErr.message)
      setSaving(false)
      return
    }
    // Reset saving before closing form so state is clean
    setSaving(false)
    cancelForm()
    await load()
  }

  async function toggleFavorite(id: string, current: boolean) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: dbErr } = await supabase.from('ideas').update({ is_favorite: !current }).eq('id', id).eq('user_id', user.id)
    if (dbErr) { setError(dbErr.message); return }
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, is_favorite: !current } : i))
  }

  async function deleteIdea(id: string) {
    if (!window.confirm('Delete this idea? This cannot be undone.')) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: dbErr } = await supabase.from('ideas').delete().eq('id', id).eq('user_id', user.id)
    if (dbErr) { setError(dbErr.message); return }
    setIdeas(prev => prev.filter(i => i.id !== id))
    if (expanded === id) setExpanded(null)
  }

  function addTech() {
    const val = techInput.trim()
    if (!val) return
    setForm(f => ({ ...f, tech_stack: [...f.tech_stack, val] }))
    setTechInput('')
  }

  function addLink() {
    const val = linkInput.trim()
    if (!val) return
    setForm(f => ({ ...f, links: [...f.links, val] }))
    setLinkInput('')
  }

  const filtered = useMemo(() =>
    ideas
      .filter(i => filterStatus === 'all' || i.status === filterStatus)
      .sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0)),
    [ideas, filterStatus]
  )

  return (
    <div style={{ padding: '40px', maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Lightbulb size={20} color="var(--lc-ink)" />
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '32px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>
              Ideas Board
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>Hackathon ideas, side projects, experiments</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 500, color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            <Plus size={14} /> New idea
          </button>
        )}
      </div>

      {/* Global error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'var(--rev-bg)', border: '1px solid var(--rev-ink)', borderRadius: 'var(--r)', marginBottom: '16px', fontSize: '13px', color: 'var(--rev-ink)' }}>
          <AlertCircle size={14} /> {error}
          <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rev-ink)', fontSize: '12px', fontFamily: 'var(--font-body)', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* Add / edit form */}
      {showForm && (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{editingId ? 'Edit idea' : 'New idea'}</p>
            <button onClick={cancelForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}><X size={16} /></button>
          </div>

          {[
            { label: 'Title', key: 'title', placeholder: 'App, tool, or project name' },
            { label: 'Problem', key: 'problem', placeholder: 'What problem does it solve?' },
            { label: 'Notes', key: 'notes', placeholder: 'Features, inspiration, anything…' },
          ].map(({ label, key, placeholder }) => (
            <div key={key} style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: '6px' }}>{label}</label>
              {key === 'notes' ? (
                <textarea
                  rows={3}
                  placeholder={placeholder}
                  value={(form as Record<string, unknown>)[key] as string}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              ) : (
                <input
                  placeholder={placeholder}
                  value={(form as Record<string, unknown>)[key] as string}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }}
                />
              )}
            </div>
          ))}

          {/* Status */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: '6px' }}>Status</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {STATUSES.map(s => {
                const m = STATUS_META[s]
                const active = form.status === s
                return (
                  <button
                    key={s}
                    onClick={() => setForm(f => ({ ...f, status: s }))}
                    style={{ padding: '5px 12px', borderRadius: 'var(--r)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${active ? m.ink : 'var(--line-strong)'}`, background: active ? m.bg : 'transparent', color: active ? m.ink : 'var(--ink-3)', fontFamily: 'var(--font-body)' }}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tech stack */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: '6px' }}>Tech Stack</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {form.tech_stack.map((t, i) => (
                <span key={`tech-${i}-${t}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 10px', background: 'var(--dsa-bg)', color: 'var(--dsa-ink)', borderRadius: 'var(--r)', fontSize: '12px' }}>
                  {t}
                  <button onClick={() => setForm(f => ({ ...f, tech_stack: f.tech_stack.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dsa-ink)', display: 'flex', padding: 0 }}><X size={10} /></button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                placeholder="React, Next.js, Python…"
                value={techInput}
                onChange={e => setTechInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech() } }}
                style={{ flex: 1, padding: '7px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
              />
              <button onClick={addTech} style={{ padding: '7px 14px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '12px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Add</button>
            </div>
          </div>

          {/* Links */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: '6px' }}>Links</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
              {form.links.map((l, i) => (
                <div key={`link-${i}-${l}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--dsa-ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l}</span>
                  <button onClick={() => setForm(f => ({ ...f, links: f.links.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}><X size={11} /></button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                placeholder="https://devpost.com/…"
                value={linkInput}
                onChange={e => setLinkInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }}
                style={{ flex: 1, padding: '7px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
              />
              <button onClick={addLink} style={{ padding: '7px 14px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '12px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Add</button>
            </div>
          </div>

          {saveError && (
            <div style={{ padding: '10px 14px', background: 'var(--rev-bg)', border: '1px solid var(--rev-ink)', borderRadius: 'var(--r)', fontSize: '12px', color: 'var(--rev-ink)', marginBottom: '14px' }}>
              {saveError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={saveIdea}
              disabled={!form.title.trim() || saving}
              style={{ padding: '9px 22px', background: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 500, color: 'var(--bg)', cursor: !form.title.trim() || saving ? 'default' : 'pointer', opacity: !form.title.trim() ? 0.4 : 1, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {saving ? <><Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} />Saving…</> : 'Save idea'}
            </button>
            <button onClick={cancelForm} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {(['all', ...STATUSES] as const).map(s => {
          const active = filterStatus === s
          const m = s !== 'all' ? STATUS_META[s] : null
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{ padding: '5px 12px', borderRadius: 'var(--r)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${active ? (m?.ink ?? 'var(--ink)') : 'var(--line-strong)'}`, background: active ? (m?.bg ?? 'var(--bg-hover)') : 'transparent', color: active ? (m?.ink ?? 'var(--ink)') : 'var(--ink-3)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              {s === 'all' ? 'All' : STATUS_META[s].label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ink-3)' }}>
          <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '14px' }}>Loading ideas…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ border: '2px dashed var(--line-strong)', borderRadius: 'var(--r)', padding: '56px 32px', textAlign: 'center' }}>
          <Lightbulb size={32} color="var(--ink-3)" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'var(--font-head)', fontSize: '20px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
            {filterStatus === 'all' ? 'No ideas yet' : `No ${STATUS_META[filterStatus].label} ideas`}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--ink-3)' }}>Start capturing your hackathon ideas and side projects.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(idea => {
            const m = STATUS_META[idea.status]
            const isExpanded = expanded === idea.id
            return (
              <div key={idea.id} style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                {/* Card header */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--line)' : 'none' }}
                  onClick={() => setExpanded(isExpanded ? null : idea.id)}
                >
                  <span style={{ padding: '3px 10px', borderRadius: 'var(--r)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', background: m.bg, color: m.ink, flexShrink: 0 }}>
                    {m.label}
                  </span>
                  <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>{idea.title}</span>
                  <button
                    onClick={e => { e.stopPropagation(); toggleFavorite(idea.id, idea.is_favorite) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: idea.is_favorite ? 'var(--lc-ink)' : 'var(--ink-3)', display: 'flex' }}
                  >
                    <Star size={14} fill={idea.is_favorite ? 'var(--lc-ink)' : 'none'} />
                  </button>
                  {isExpanded ? <ChevronUp size={14} color="var(--ink-3)" /> : <ChevronDown size={14} color="var(--ink-3)" />}
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div style={{ padding: '16px 18px' }}>
                    {idea.problem && <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginBottom: '14px', lineHeight: 1.6 }}>{idea.problem}</p>}
                    {idea.tech_stack.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                        {idea.tech_stack.map((t, i) => (
                          <span key={`${t}-${i}`} style={{ padding: '3px 10px', background: 'var(--dsa-bg)', color: 'var(--dsa-ink)', borderRadius: 'var(--r)', fontSize: '11px', fontWeight: 600 }}>{t}</span>
                        ))}
                      </div>
                    )}
                    {idea.notes && <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginBottom: '14px', lineHeight: 1.6, background: 'var(--bg)', padding: '10px 14px', borderRadius: 'var(--r)', border: '1px solid var(--line)' }}>{idea.notes}</p>}
                    {idea.links.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                        {idea.links.map((l, i) => (
                          <a key={`${l}-${i}`} href={safeHref(l)} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--dsa-ink)', textDecoration: 'none' }}>
                            <ExternalLink size={11} />{l}
                          </a>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button onClick={() => startEdit(idea)} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '12px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Edit</button>
                      <button onClick={() => deleteIdea(idea.id)} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--rev-ink)', borderRadius: 'var(--r)', fontSize: '12px', color: 'var(--rev-ink)', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Trash2 size={11} /> Delete
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
  )
}
