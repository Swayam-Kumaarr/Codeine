'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trophy, Loader2, Trash2, ExternalLink, X } from 'lucide-react'

type AchType = 'hackathon' | 'certification' | 'oss' | 'project' | 'award'

interface Achievement {
  id: string
  type: AchType
  title: string
  org: string
  date: string
  result: string
  link: string
  notes: string
  created_at: string
}

const TYPE_META: Record<AchType, { label: string; bg: string; ink: string; emoji: string }> = {
  hackathon:     { label: 'Hackathon',     bg: 'var(--lc-bg)',   ink: 'var(--lc-ink)',   emoji: '⚡' },
  certification: { label: 'Certification', bg: 'var(--dsa-bg)',  ink: 'var(--dsa-ink)',  emoji: '📜' },
  oss:           { label: 'OSS',           bg: 'var(--java-bg)', ink: 'var(--java-ink)', emoji: '🔧' },
  project:       { label: 'Project',       bg: 'var(--bg-hover)', ink: 'var(--ink-2)',   emoji: '🛠' },
  award:         { label: 'Award',         bg: 'var(--java-bg)', ink: 'var(--java-ink)', emoji: '🏆' },
}

const TYPES: AchType[] = ['hackathon', 'certification', 'oss', 'project', 'award']

function emptyAch(): Omit<Achievement, 'id' | 'created_at'> {
  return { type: 'hackathon', title: '', org: '', date: '', result: '', link: '', notes: '' }
}

export default function AchievementsPage() {
  const [items, setItems] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyAch())
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<AchType | 'all'>('all')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from('achievements').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setItems((data ?? []) as Achievement[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyAch())
  }

  function startEdit(a: Achievement) {
    setEditingId(a.id)
    setForm({ type: a.type, title: a.title, org: a.org, date: a.date, result: a.result, link: a.link, notes: a.notes })
    setShowForm(true)
  }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload = { user_id: user.id, ...form }
    if (editingId) {
      await supabase.from('achievements').update(payload).eq('id', editingId)
    } else {
      await supabase.from('achievements').insert(payload)
    }
    cancelForm()
    await load()
    setSaving(false)
  }

  async function del(id: string) {
    const supabase = createClient()
    await supabase.from('achievements').delete().eq('id', id)
    setItems(prev => prev.filter(a => a.id !== id))
  }

  const filtered = filter === 'all' ? items : items.filter(a => a.type === filter)

  return (
    <div style={{ padding: '40px', maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Trophy size={20} color="var(--lc-ink)" />
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '32px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>Achievements</h1>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>Resume-ready log of wins, certs, and contributions</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 500, color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            <Plus size={14} /> Add achievement
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{editingId ? 'Edit achievement' : 'New achievement'}</p>
            <button onClick={cancelForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}><X size={16} /></button>
          </div>

          {/* Type selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: '6px' }}>Type</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {TYPES.map(t => {
                const m = TYPE_META[t]
                const active = form.type === t
                return (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    style={{ padding: '5px 12px', borderRadius: 'var(--r)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${active ? m.ink : 'var(--line-strong)'}`, background: active ? m.bg : 'transparent', color: active ? m.ink : 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>
                    {m.emoji} {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'Title', key: 'title', placeholder: '1st Place — HackX 2025', col: '1 / -1' },
              { label: 'Organisation', key: 'org', placeholder: 'IIIT Hyderabad', col: '' },
              { label: 'Date', key: 'date', placeholder: 'Jan 2025', col: '' },
              { label: 'Result', key: 'result', placeholder: 'Winner / Top 10 / Completed', col: '' },
              { label: 'Link', key: 'link', placeholder: 'https://devpost.com/…', col: '' },
            ].map(({ label, key, placeholder, col }) => (
              <div key={key} style={{ gridColumn: col || undefined }}>
                <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: '5px' }}>{label}</label>
                <input
                  placeholder={placeholder}
                  value={(form as Record<string, unknown>)[key] as string}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: '5px' }}>Notes</label>
            <textarea
              rows={2} placeholder="What I built, what I learned…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={save} disabled={!form.title.trim() || saving}
              style={{ padding: '9px 22px', background: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 500, color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {saving ? <><Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} />Saving…</> : 'Save'}
            </button>
            <button onClick={cancelForm} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {(['all', ...TYPES] as const).map(t => {
          const active = filter === t
          const m = t !== 'all' ? TYPE_META[t] : null
          return (
            <button key={t} onClick={() => setFilter(t)}
              style={{ padding: '5px 12px', borderRadius: 'var(--r)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${active ? (m?.ink ?? 'var(--ink)') : 'var(--line-strong)'}`, background: active ? (m?.bg ?? 'var(--bg-hover)') : 'transparent', color: active ? (m?.ink ?? 'var(--ink)') : 'var(--ink-3)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {t === 'all' ? 'All' : `${TYPE_META[t].emoji} ${TYPE_META[t].label}`}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ink-3)' }}>
          <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '14px' }}>Loading…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ border: '2px dashed var(--line-strong)', borderRadius: 'var(--r)', padding: '56px 32px', textAlign: 'center' }}>
          <Trophy size={32} color="var(--ink-3)" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'var(--font-head)', fontSize: '20px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>No achievements logged yet</p>
          <p style={{ fontSize: '14px', color: 'var(--ink-3)' }}>Start adding your wins, certificates, and contributions.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(a => {
            const m = TYPE_META[a.type]
            return (
              <div key={a.id} style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0, marginTop: '2px' }}>{m.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>{a.title}</span>
                    <span style={{ padding: '2px 9px', background: m.bg, color: m.ink, borderRadius: 'var(--r)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{m.label}</span>
                    {a.result && <span style={{ padding: '2px 9px', background: 'var(--java-bg)', color: 'var(--java-ink)', borderRadius: 'var(--r)', fontSize: '10px', fontWeight: 600 }}>{a.result}</span>}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
                    {[a.org, a.date].filter(Boolean).join(' · ')}
                  </p>
                  {a.notes && <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '8px', lineHeight: 1.5 }}>{a.notes}</p>}
                  {a.link && (
                    <a href={a.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--dsa-ink)', marginTop: '6px', textDecoration: 'none' }}>
                      <ExternalLink size={11} /> View →
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => startEdit(a)} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '11px', color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Edit</button>
                  <button onClick={() => del(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', padding: '5px' }}><Trash2 size={13} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
