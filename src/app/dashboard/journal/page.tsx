'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PenLine, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Entry {
  id: string
  date: string
  built: string
  hard: string
  tomorrow: string
  created_at: string
}

const PROMPTS: { key: keyof Pick<Entry, 'built' | 'hard' | 'tomorrow'>; label: string; placeholder: string }[] = [
  { key: 'built', label: 'What did I build or learn today?', placeholder: 'Implemented BFS for graph traversal, fixed the login bug…' },
  { key: 'hard', label: 'What was hard?', placeholder: 'Spent too long on a linked list pointer issue, struggled with…' },
  { key: 'tomorrow', label: 'Plan for tomorrow', placeholder: 'Finish the CGPA calc, review trees, gym at 7am…' },
]

export default function JournalPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [todayEntry, setTodayEntry] = useState<Entry | null>(null)
  const [form, setForm] = useState({ built: '', hard: '', tomorrow: '' })
  const [expanded, setExpanded] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30)

    const all = (data ?? []) as Entry[]
    const todayE = all.find(e => e.date === today)
    setEntries(all)
    setTodayEntry(todayE ?? null)
    if (todayE) {
      setForm({ built: todayE.built, hard: todayE.hard, tomorrow: todayE.tomorrow })
    }
    setLoading(false)
  }, [today])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload = { user_id: user.id, date: today, ...form }
    if (todayEntry) {
      await supabase.from('journal_entries').update(payload).eq('id', todayEntry.id)
    } else {
      await supabase.from('journal_entries').insert(payload)
    }
    await load()
    setSaving(false)
  }

  const pastEntries = entries.filter(e => e.date !== today)

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    const diff = Math.floor((new Date().getTime() - d.getTime()) / 86400000)
    if (diff === 1) return 'Yesterday'
    if (diff <= 6) return d.toLocaleDateString('en-IN', { weekday: 'long' })
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <div style={{ padding: '40px', maxWidth: '760px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <PenLine size={20} color="var(--dsa-ink)" />
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '32px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1.1 }}>Daily Journal</h1>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>3 prompts · 2 minutes · every day</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ink-3)' }}>
          <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '14px' }}>Loading…</span>
        </div>
      ) : (
        <>
          {/* Today's entry */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: '32px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '2px' }}>Today</p>
                <p style={{ fontSize: '13px', color: 'var(--ink-2)' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
              {todayEntry && <span style={{ padding: '3px 10px', background: 'var(--java-bg)', color: 'var(--java-ink)', borderRadius: 'var(--r)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em' }}>SAVED</span>}
            </div>

            <div style={{ padding: '20px' }}>
              {PROMPTS.map(({ key, label, placeholder }) => (
                <div key={key} style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '8px' }}>{label}</label>
                  <textarea
                    rows={3}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 'var(--r)', fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none', resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <button
                onClick={save}
                disabled={saving || (!form.built.trim() && !form.hard.trim() && !form.tomorrow.trim())}
                style={{ padding: '10px 24px', background: 'var(--ink)', border: 'none', borderRadius: 'var(--r)', fontSize: '13px', fontWeight: 500, color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '7px', opacity: (!form.built.trim() && !form.hard.trim() && !form.tomorrow.trim()) ? 0.4 : 1 }}
              >
                {saving ? <><Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />Saving…</> : todayEntry ? 'Update entry' : 'Save entry'}
              </button>
            </div>
          </div>

          {/* Past entries */}
          {pastEntries.length > 0 && (
            <div>
              <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '12px' }}>
                Past entries
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pastEntries.slice(0, 7).map(e => {
                  const isExpanded = expanded === e.id
                  return (
                    <div key={e.id} style={{ background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                      <div
                        onClick={() => setExpanded(isExpanded ? null : e.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 18px', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--line)' : 'none' }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', flex: 1 }}>{formatDate(e.date)}</span>
                        <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>{e.date}</span>
                        {isExpanded ? <ChevronUp size={14} color="var(--ink-3)" /> : <ChevronDown size={14} color="var(--ink-3)" />}
                      </div>
                      {isExpanded && (
                        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {PROMPTS.map(({ key, label }) => e[key] ? (
                            <div key={key}>
                              <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '5px' }}>{label}</p>
                              <p style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.65 }}>{e[key]}</p>
                            </div>
                          ) : null)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
