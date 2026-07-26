'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, ChevronLeft, ChevronRight, X, Settings2, Check, Pencil } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetSettings {
  monthly_income: number
  tax_pct: number
  savings_pct: number
}

interface Transaction {
  id: string
  amount: number
  description: string
  category: string
  date: string
  type: 'income' | 'expense'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'Food', emoji: '🍕' },
  { label: 'Transport', emoji: '🚌' },
  { label: 'Phone/Net', emoji: '📱' },
  { label: 'Shopping', emoji: '🛒' },
  { label: 'Entertainment', emoji: '🎮' },
  { label: 'Education', emoji: '📚' },
  { label: 'Health', emoji: '💊' },
  { label: 'Housing', emoji: '🏠' },
  { label: 'Utilities', emoji: '💡' },
  { label: 'Other', emoji: '📦' },
]

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.label, c.emoji]))

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function isoMonth(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page: { padding: '40px 48px 100px', maxWidth: 900, fontFamily: 'var(--font-body, Inter, sans-serif)' } as React.CSSProperties,
  h1: { fontFamily: 'var(--font-head)', fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink)', marginBottom: 4 } as React.CSSProperties,
  sub: { fontSize: 13, color: 'var(--ink-2)', marginBottom: 36 } as React.CSSProperties,
  label: { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--ink-3)', marginBottom: 6, display: 'block' } as React.CSSProperties,
  card: { background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 3, padding: '24px 28px' } as React.CSSProperties,
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'var(--ink)', color: 'var(--bg)', border: 'none', borderRadius: 3, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties,
  secondaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', color: 'var(--ink-3)', border: '1px solid var(--line-strong)', borderRadius: 3, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties,
  input: { width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong)', borderRadius: 3, fontSize: 13, fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' as const } as React.CSSProperties,
  bigNum: { fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' } as React.CSSProperties,
}

// ─── Daily Spending Chart ─────────────────────────────────────────────────────

function DailySpendingChart({ dailyTotals, daysInMonth, month, year }: {
  dailyTotals: number[]
  daysInMonth: number
  month: number
  year: number
}) {
  const [tooltip, setTooltip] = useState<{ xPct: number; yPct: number; day: number; amount: number } | null>(null)

  const W = 720, H = 130
  const PAD = { top: 8, right: 8, bottom: 24, left: 52 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const gap = 2
  const barW = Math.max(4, Math.floor((chartW - gap * (daysInMonth - 1)) / daysInMonth))
  const maxAmt = Math.max(...dailyTotals, 1)
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const todayIdx = today.getDate() - 1

  const gridAmts = [maxAmt * 0.5, maxAmt]

  return (
    <div style={{ position: 'relative', userSelect: 'none' }} onMouseLeave={() => setTooltip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        {/* Grid lines */}
        {gridAmts.map((val, i) => {
          const y = PAD.top + chartH - (val / maxAmt) * chartH
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.38}>
                {val >= 1000 ? `₹${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k` : `₹${Math.round(val)}`}
              </text>
            </g>
          )
        })}

        {/* Baseline */}
        <line x1={PAD.left} y1={PAD.top + chartH} x2={PAD.left + chartW} y2={PAD.top + chartH} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />

        {/* Bars */}
        {dailyTotals.map((amt, i) => {
          const x = PAD.left + i * (barW + gap)
          const barH = amt > 0 ? Math.max(3, (amt / maxAmt) * chartH) : 0
          const y = PAD.top + chartH - barH
          const isToday = isCurrentMonth && i === todayIdx
          const isFuture = isCurrentMonth && i > todayIdx
          const fill = isToday ? '#c0392b' : '#2563EB'
          const opacity = isFuture ? 0.1 : amt === 0 ? 0 : isToday ? 0.9 : 0.65
          return (
            <rect
              key={i}
              x={x} y={y} width={barW} height={barH}
              rx={2} fill={fill} opacity={opacity}
              onMouseEnter={() => setTooltip({
                xPct: ((x + barW / 2) / W) * 100,
                yPct: ((y - 4) / H) * 100,
                day: i + 1,
                amount: amt,
              })}
              style={{ cursor: amt > 0 ? 'crosshair' : 'default' }}
            />
          )
        })}

        {/* X labels every 5 days */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          if ((i + 1) % 5 !== 0 && i !== 0) return null
          const x = PAD.left + i * (barW + gap) + barW / 2
          return (
            <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.38}>
              {i + 1}
            </text>
          )
        })}
      </svg>

      {tooltip && tooltip.amount > 0 && (
        <div style={{
          position: 'absolute',
          left: `${tooltip.xPct}%`,
          top: `${tooltip.yPct}%`,
          transform: 'translateX(-50%) translateY(-100%)',
          background: 'var(--ink)',
          color: 'var(--bg)',
          padding: '5px 10px',
          borderRadius: 3,
          fontSize: 11,
          fontFamily: 'var(--font-body)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {new Date(year, month, tooltip.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: {fmt(tooltip.amount)}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const [settings, setSettings] = useState<BudgetSettings>({ monthly_income: 0, tax_pct: 0, savings_pct: 20 })
  const [settingsDraft, setSettingsDraft] = useState<BudgetSettings | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  const [showAdd, setShowAdd] = useState(false)
  const [addType, setAddType] = useState<'expense' | 'income'>('expense')
  const [addAmount, setAddAmount] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [addCat, setAddCat] = useState('Food')
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0])
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Omit<Transaction, 'id'> | null>(null)
  const [savingEditId, setSavingEditId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const prefix = isoMonth(year, month)
    const from = `${prefix}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to = `${prefix}-${String(lastDay).padStart(2, '0')}`

    const [{ data: s }, { data: t }] = await Promise.all([
      supabase.from('budget_settings').select('monthly_income,tax_pct,savings_pct').eq('user_id', user.id).maybeSingle(),
      supabase.from('budget_transactions').select('*').eq('user_id', user.id).gte('date', from).lte('date', to).order('date', { ascending: false }),
    ])

    if (s) setSettings({ monthly_income: Number(s.monthly_income), tax_pct: Number(s.tax_pct), savings_pct: Number(s.savings_pct) })
    setTransactions((t ?? []) as Transaction[])
    setLoading(false)
  }, [year, month])

  useEffect(() => { load() }, [load])

  async function saveSettings() {
    if (!settingsDraft) return
    setSavingSettings(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingSettings(false); return }
    const { error } = await supabase.from('budget_settings').upsert({
      user_id: user.id,
      monthly_income: settingsDraft.monthly_income,
      tax_pct: settingsDraft.tax_pct,
      savings_pct: settingsDraft.savings_pct,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setSavingSettings(false)
    if (error) { console.error('saveSettings failed:', error.message); return }
    setSettings(settingsDraft)
    setSettingsDraft(null)
  }

  async function addTransaction() {
    const amt = parseFloat(addAmount)
    if (!amt || !addDesc.trim()) return
    setAdding(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAdding(false); return }
    await supabase.from('budget_transactions').insert({
      user_id: user.id,
      amount: amt,
      description: addDesc.trim(),
      category: addType === 'income' ? 'Income' : addCat,
      date: addDate,
      type: addType,
    })
    setAdding(false)
    setAddAmount('')
    setAddDesc('')
    setAddCat('Food')
    setAddDate(new Date().toISOString().split('T')[0])
    setShowAdd(false)
    await load()
  }

  function startEdit(t: Transaction) {
    setEditingId(t.id)
    setEditDraft({ amount: t.amount, description: t.description, category: t.category, date: t.date, type: t.type })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft(null)
  }

  async function saveEdit(id: string) {
    if (!editDraft) return
    setSavingEditId(id)
    const supabase = createClient()
    await supabase.from('budget_transactions').update({
      amount: editDraft.amount,
      description: editDraft.description,
      category: editDraft.type === 'income' ? 'Income' : editDraft.category,
      date: editDraft.date,
      type: editDraft.type,
    }).eq('id', id)
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...editDraft, category: editDraft.type === 'income' ? 'Income' : editDraft.category } : t))
    setSavingEditId(null)
    setEditingId(null)
    setEditDraft(null)
  }

  async function deleteTransaction(id: string) {
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('budget_transactions').delete().eq('id', id)
    setTransactions(p => p.filter(t => t.id !== id))
    setDeletingId(null)
  }

  // ─── Calculations ─────────────────────────────────────────────────────────

  const income = settings.monthly_income
  const tax = income * (settings.tax_pct / 100)
  const savings = income * (settings.savings_pct / 100)
  const spendable = income - tax - savings

  const expenses = transactions.filter(t => t.type === 'expense')
  const extraIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalSpent = expenses.reduce((s, t) => s + t.amount, 0)
  const pleasure = spendable + extraIncome - totalSpent
  const spentPct = spendable > 0 ? Math.min(100, (totalSpent / spendable) * 100) : 0

  // Daily totals
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dailyTotals: number[] = Array(daysInMonth).fill(0)
  for (const t of expenses) {
    const day = parseInt(t.date.split('-')[2], 10) - 1
    if (day >= 0 && day < daysInMonth) dailyTotals[day] += t.amount
  }

  // Group by category
  const catTotals: Record<string, number> = {}
  for (const t of expenses) {
    catTotals[t.category] = (catTotals[t.category] ?? 0) + t.amount
  }
  const catSorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1])

  // Week boundaries
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const thisWeekSpent = expenses.filter(t => new Date(t.date) >= weekStart).reduce((s, t) => s + t.amount, 0)

  const draftS = settingsDraft ?? settings

  if (loading) return <div style={{ padding: 40, color: 'var(--ink-3)', fontSize: 14 }}>Loading budget…</div>

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={S.h1}>Budget</h1>
        <p style={S.sub}>Track your income, taxes, savings, and spending.</p>

        {/* Month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => { const d = new Date(year, month - 1); setYear(d.getFullYear()); setMonth(d.getMonth()) }} style={{ ...S.secondaryBtn, padding: '6px 10px' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', minWidth: 160, textAlign: 'center' }}>
            {monthLabel(year, month)}
          </span>
          <button onClick={() => { const d = new Date(year, month + 1); setYear(d.getFullYear()); setMonth(d.getMonth()) }} style={{ ...S.secondaryBtn, padding: '6px 10px' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      <div style={{ ...S.card, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: settingsDraft ? 20 : 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings2 size={14} style={{ color: 'var(--ink-3)' }} />
            Monthly Setup
          </span>
          {!settingsDraft
            ? <button onClick={() => setSettingsDraft({ ...settings })} style={S.secondaryBtn}>Edit</button>
            : <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setSettingsDraft(null)} style={S.secondaryBtn}>Cancel</button>
                <button onClick={saveSettings} disabled={savingSettings} style={{ ...S.primaryBtn, opacity: savingSettings ? 0.6 : 1 }}>
                  {savingSettings ? 'Saving…' : 'Save'}
                </button>
              </div>
          }
        </div>

        {settingsDraft ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label style={S.label}>Monthly Income (₹)</label>
              <input type="number" value={draftS.monthly_income || ''} onChange={e => setSettingsDraft({ ...draftS, monthly_income: parseFloat(e.target.value) || 0 })} placeholder="e.g. 15000" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Tax %</label>
              <input type="number" value={draftS.tax_pct || ''} onChange={e => setSettingsDraft({ ...draftS, tax_pct: parseFloat(e.target.value) || 0 })} placeholder="e.g. 10" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Savings %</label>
              <input type="number" value={draftS.savings_pct || ''} onChange={e => setSettingsDraft({ ...draftS, savings_pct: parseFloat(e.target.value) || 0 })} placeholder="e.g. 20" style={S.input} />
            </div>
          </div>
        ) : income > 0 ? (
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginTop: 12 }}>
            <div><span style={S.label}>Income</span><span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{fmt(income)}/mo</span></div>
            <div><span style={S.label}>Tax</span><span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{settings.tax_pct}%</span></div>
            <div><span style={S.label}>Savings</span><span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{settings.savings_pct}%</span></div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 12 }}>Set your income, tax rate, and savings target to get started.</p>
        )}
      </div>

      {/* Allocation breakdown */}
      {income > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', marginBottom: 24 }}>
          {[
            { label: 'Gross Income', value: income, color: 'var(--ink)' },
            { label: `Tax (${settings.tax_pct}%)`, value: -tax, color: '#c0392b' },
            { label: `Savings (${settings.savings_pct}%)`, value: -savings, color: '#2563EB' },
            { label: 'Spendable', value: spendable, color: '#166534' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--bg)', padding: '20px 24px' }}>
              <span style={S.label}>{label}</span>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {value < 0 ? '−' : ''}{fmt(Math.abs(value))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pleasure money card */}
      {income > 0 && (
        <div style={{ ...S.card, marginBottom: 24, borderLeft: `3px solid ${pleasure >= 0 ? '#166534' : '#c0392b'}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span style={{ ...S.label, color: pleasure >= 0 ? '#166534' : '#c0392b' }}>
                {pleasure >= 0 ? 'Pleasure Money Left' : 'Over Budget'}
              </span>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 40, fontWeight: 700, letterSpacing: '-0.04em', color: pleasure >= 0 ? '#166534' : '#c0392b', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {pleasure < 0 ? '−' : ''}{fmt(Math.abs(pleasure))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
                Spent {fmt(totalSpent)} of {fmt(spendable)} spendable{extraIncome > 0 ? ` + ${fmt(extraIncome)} extra income` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={S.label}>This week</span>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{fmt(thisWeekSpent)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={S.label}>Saved this month</span>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-head)', color: '#2563EB', fontVariantNumeric: 'tabular-nums' }}>{fmt(savings)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={S.label}>Tax this month</span>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-head)', color: '#c0392b', fontVariantNumeric: 'tabular-nums' }}>{fmt(tax)}</div>
              </div>
            </div>
          </div>

          {/* Spending bar */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>
              <span>{Math.round(spentPct)}% spent</span>
              <span>{fmt(spendable - totalSpent)} remaining</span>
            </div>
            <div style={{ height: 6, background: 'var(--line-strong)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${spentPct}%`, background: spentPct > 90 ? '#c0392b' : spentPct > 70 ? '#d97706' : '#166534', transition: 'width 0.8s ease', borderRadius: 3 }} />
            </div>
          </div>
        </div>
      )}

      {/* Daily spending chart */}
      {expenses.length > 0 && (
        <div style={{ ...S.card, marginBottom: 24 }}>
          <span style={{ ...S.label, marginBottom: 4 }}>Daily spending — {monthLabel(year, month)}</span>
          <p style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 16 }}>
            Hover a bar for details · <span style={{ color: '#c0392b' }}>red = today</span>
          </p>
          <DailySpendingChart dailyTotals={dailyTotals} daysInMonth={daysInMonth} month={month} year={year} />
        </div>
      )}

      {/* Category breakdown */}
      {catSorted.length > 0 && (
        <div style={{ ...S.card, marginBottom: 24 }}>
          <span style={{ ...S.label, marginBottom: 16 }}>Spending by category</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {catSorted.map(([cat, total]) => {
              const pct = totalSpent > 0 ? (total / totalSpent) * 100 : 0
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{CATEGORY_MAP[cat] ?? '📦'} {cat}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--line-strong)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--ink)', borderRadius: 2, opacity: 0.5 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add transaction */}
      <div style={{ marginBottom: 24 }}>
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} style={S.primaryBtn}>
            <Plus size={14} /> Add transaction
          </button>
        ) : (
          <div style={{ ...S.card, borderTop: '3px solid var(--ink)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>New transaction</span>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
            </div>

            {/* Type toggle */}
            <div style={{ display: 'flex', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
              {(['expense', 'income'] as const).map(t => (
                <button key={t} onClick={() => setAddType(t)} style={{ flex: 1, padding: '9px', background: addType === t ? 'var(--ink)' : 'var(--bg)', color: addType === t ? 'var(--bg)' : 'var(--ink-2)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: addType === t ? 600 : 400, textTransform: 'capitalize' }}>
                  {t === 'expense' ? '💸 Expense' : '💰 Income'}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={S.label}>Amount (₹)</label>
                <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="0.00" style={S.input} autoFocus />
              </div>
              <div>
                <label style={S.label}>Date</label>
                <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} style={S.input} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Description</label>
              <input value={addDesc} onChange={e => setAddDesc(e.target.value)} placeholder={addType === 'expense' ? 'What did you spend on?' : 'Source of income'} style={S.input} />
            </div>

            {addType === 'expense' && (
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORIES.map(c => (
                    <button key={c.label} onClick={() => setAddCat(c.label)} style={{
                      padding: '6px 12px', borderRadius: 99, fontSize: 12, cursor: 'pointer', border: '1px solid',
                      borderColor: addCat === c.label ? 'var(--ink)' : 'var(--line-strong)',
                      background: addCat === c.label ? 'var(--ink)' : 'transparent',
                      color: addCat === c.label ? 'var(--bg)' : 'var(--ink-2)',
                      fontFamily: 'inherit',
                    }}>
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={addTransaction} disabled={adding || !addAmount || !addDesc.trim()} style={{ ...S.primaryBtn, opacity: (adding || !addAmount || !addDesc.trim()) ? 0.5 : 1 }}>
              {adding ? 'Adding…' : 'Add →'}
            </button>
          </div>
        )}
      </div>

      {/* Transaction list */}
      {transactions.length > 0 && (
        <div>
          <span style={{ ...S.label, marginBottom: 12 }}>Transactions — {monthLabel(year, month)}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
            {transactions.map(t => {
              const isEditing = editingId === t.id && editDraft !== null
              const d = isEditing ? editDraft! : null
              return (
                <div key={t.id} style={{ background: isEditing ? 'var(--bg-panel, #f9f9f9)' : 'var(--bg)' }}>
                  {/* Collapsed row */}
                  {!isEditing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', cursor: 'pointer' }} onClick={() => startEdit(t)}>
                      <div style={{ fontSize: 20, flexShrink: 0 }}>{t.type === 'income' ? '💰' : (CATEGORY_MAP[t.category] ?? '📦')}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                          {t.category} · {new Date(t.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: t.type === 'income' ? '#166534' : 'var(--ink)', flexShrink: 0 }}>
                        {t.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                      </div>
                      <Pencil size={12} style={{ color: 'var(--ink-3)', flexShrink: 0, opacity: 0.5 }} />
                    </div>
                  )}

                  {/* Expanded edit form */}
                  {isEditing && d && (
                    <div style={{ padding: '16px 20px' }}>
                      {/* Type toggle */}
                      <div style={{ display: 'flex', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
                        {(['expense', 'income'] as const).map(tp => (
                          <button key={tp} onClick={() => setEditDraft({ ...d, type: tp })} style={{ flex: 1, padding: '7px', background: d.type === tp ? 'var(--ink)' : 'var(--bg)', color: d.type === tp ? 'var(--bg)' : 'var(--ink-2)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: d.type === tp ? 600 : 400, textTransform: 'capitalize' }}>
                            {tp === 'expense' ? '💸 Expense' : '💰 Income'}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={S.label}>Amount (₹)</label>
                          <input type="number" value={d.amount || ''} onChange={e => setEditDraft({ ...d, amount: parseFloat(e.target.value) || 0 })} style={{ ...S.input, fontSize: 13 }} />
                        </div>
                        <div>
                          <label style={S.label}>Date</label>
                          <input type="date" value={d.date} onChange={e => setEditDraft({ ...d, date: e.target.value })} style={{ ...S.input, fontSize: 13 }} />
                        </div>
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <label style={S.label}>Description</label>
                        <input value={d.description} onChange={e => setEditDraft({ ...d, description: e.target.value })} style={{ ...S.input, fontSize: 13 }} />
                      </div>

                      {d.type === 'expense' && (
                        <div style={{ marginBottom: 14 }}>
                          <label style={S.label}>Category</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {CATEGORIES.map(c => (
                              <button key={c.label} onClick={() => setEditDraft({ ...d, category: c.label })} style={{
                                padding: '4px 10px', borderRadius: 99, fontSize: 11, cursor: 'pointer', border: '1px solid',
                                borderColor: d.category === c.label ? 'var(--ink)' : 'var(--line-strong)',
                                background: d.category === c.label ? 'var(--ink)' : 'transparent',
                                color: d.category === c.label ? 'var(--bg)' : 'var(--ink-2)',
                                fontFamily: 'inherit',
                              }}>
                                {c.emoji} {c.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button onClick={() => saveEdit(t.id)} disabled={savingEditId === t.id || !d.amount || !d.description.trim()} style={{ ...S.primaryBtn, padding: '7px 14px', fontSize: 12, opacity: (savingEditId === t.id || !d.amount || !d.description.trim()) ? 0.5 : 1 }}>
                          <Check size={12} /> {savingEditId === t.id ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={cancelEdit} style={{ ...S.secondaryBtn, padding: '7px 12px', fontSize: 12 }}>
                          <X size={12} /> Cancel
                        </button>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => { cancelEdit(); deleteTransaction(t.id) }} disabled={deletingId === t.id} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 12, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, opacity: deletingId === t.id ? 0.4 : 1 }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ padding: '12px 20px', borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--ink-3)' }}>{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</span>
            <span style={{ fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>Total: {fmt(totalSpent)}</span>
          </div>
        </div>
      )}

      {transactions.length === 0 && (
        <div style={{ border: '1px dashed var(--line-strong)', borderRadius: 3, padding: '48px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>No transactions yet</p>
          <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Add your first expense or income for {monthLabel(year, month)}.</p>
        </div>
      )}
    </div>
  )
}
