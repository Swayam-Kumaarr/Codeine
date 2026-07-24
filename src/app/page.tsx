'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Lenis from 'lenis'
import dynamic from 'next/dynamic'

const Cubes = dynamic(() => import('@/components/Cubes'), { ssr: false })

// ─── Data ────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_NUMS = [16, 17, 18, 19, 20, 21, 22]
const HOURS = [6,7,8,9,10,11,12,13,14,15,16,17,18]
const TODAY_IDX = 0
const START_H = 6
const TOTAL_H = 13 // 6am–7pm

interface Task {
  id: number; day: number; start: number; dur: number
  label: string; sub: string; bg: string; fg: string; done: boolean
}

const TASKS: Task[] = [
  { id:1,  day:0, start:7,    dur:2,   label:'DSA',      sub:'Arrays & Two Pointer', bg:'#EDE8F7', fg:'#3D1F8A', done:true  },
  { id:2,  day:0, start:10,   dur:2,   label:'Java OOP', sub:'Inheritance',           bg:'#E0EDEA', fg:'#1A4A3C', done:true  },
  { id:13, day:0, start:16,   dur:1,   label:'Budget',   sub:'Log expenses',          bg:'#E8F0F8', fg:'#1A3A5C', done:false },
  { id:3,  day:1, start:7,    dur:2,   label:'DSA',      sub:'Stacks & Queues',      bg:'#EDE8F7', fg:'#3D1F8A', done:false },
  { id:4,  day:1, start:14,   dur:1.5, label:'LeetCode', sub:'3 Medium Problems',    bg:'#FDF0D8', fg:'#7A4800', done:false },
  { id:14, day:1, start:17,   dur:1,   label:'Gym',      sub:'Push day',             bg:'#F0EDE8', fg:'#4A3010', done:false },
  { id:5,  day:2, start:8,    dur:2,   label:'Java OOP', sub:'Polymorphism',          bg:'#E0EDEA', fg:'#1A4A3C', done:false },
  { id:6,  day:2, start:15.5, dur:1,   label:'RDBMS',    sub:'Joins & Indexes',      bg:'#EAE8F7', fg:'#2A1F6A', done:false },
  { id:7,  day:3, start:7,    dur:2.5, label:'DSA',      sub:'Trees & BST',          bg:'#EDE8F7', fg:'#3D1F8A', done:false },
  { id:8,  day:3, start:13,   dur:1.5, label:'LeetCode', sub:'2 Hard Problems',      bg:'#FDF0D8', fg:'#7A4800', done:false },
  { id:15, day:3, start:17,   dur:1,   label:'COA',      sub:'Memory Hierarchy',     bg:'#F2E8E8', fg:'#7A2020', done:false },
  { id:9,  day:4, start:9,    dur:2,   label:'Java OOP', sub:'Abstract Classes',      bg:'#E0EDEA', fg:'#1A4A3C', done:false },
  { id:16, day:4, start:15,   dur:1.5, label:'Gym',      sub:'Pull day',             bg:'#F0EDE8', fg:'#4A3010', done:false },
  { id:10, day:5, start:8,    dur:3,   label:'DSA',      sub:'Graphs & BFS/DFS',     bg:'#EDE8F7', fg:'#3D1F8A', done:false },
  { id:11, day:5, start:14,   dur:1.5, label:'LeetCode', sub:'Contest Prep',         bg:'#FDF0D8', fg:'#7A4800', done:false },
  { id:12, day:6, start:10,   dur:2,   label:'RDBMS',    sub:'Weekly review',        bg:'#EAE8F7', fg:'#2A1F6A', done:false },
  { id:17, day:6, start:15,   dur:1,   label:'Journal',  sub:'Weekly reflection',    bg:'#E8F0E8', fg:'#1A4A1A', done:false },
]

const QUICK_TASKS = [
  { id:3,  label:'DSA',      name:'Stacks & Queues',      color:'#3D1F8A' },
  { id:4,  label:'LeetCode', name:'3 Medium Problems',    color:'#7A4800' },
  { id:6,  label:'RDBMS',    name:'Joins & Indexes',      color:'#2A1F6A' },
  { id:15, label:'COA',      name:'Memory Hierarchy',     color:'#7A2020' },
  { id:9,  label:'Java OOP', name:'Abstract Classes',     color:'#1A4A3C' },
  { id:17, label:'Journal',  name:'Weekly reflection',    color:'#1A4A1A' },
]

const PROGRESS = [
  { label:'DSA',      pct:35, color:'#3D1F8A' },
  { label:'Java OOP', pct:20, color:'#1A4A3C' },
  { label:'RDBMS',    pct:52, color:'#2A1F6A' },
  { label:'COA',      pct:14, color:'#7A2020' },
]

const TIME_LOGGED = [
  { subj:'DSA',      val:'2h 30m' },
  { subj:'Java OOP', val:'1h 00m' },
  { subj:'RDBMS',    val:'0h 45m' },
]


// ─── Magnetic Button ──────────────────────────────────────────────────
function MagBtn({ children, ghost, onClick }: {
  children: React.ReactNode; ghost?: boolean; onClick?: () => void
}) {
  const el = useRef<HTMLButtonElement>(null)

  const onMove = useCallback((e: React.MouseEvent) => {
    const r = el.current!.getBoundingClientRect()
    const x = (e.clientX - r.left - r.width  / 2) * 0.3
    const y = (e.clientY - r.top  - r.height / 2) * 0.3
    el.current!.style.transform = `translate(${x}px,${y}px)`
  }, [])

  const onLeave = useCallback(() => {
    el.current!.style.transform = 'translate(0,0)'
  }, [])

  return (
    <button
      ref={el}
      className={`mag-btn${ghost ? ' mag-btn-ghost' : ''}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      aria-label={typeof children === 'string' ? children : undefined}
    >
      {children}
    </button>
  )
}

// ─── 3D Tilt Task Block ───────────────────────────────────────────────
function TaskBlock({ task, delay }: { task: Task; delay: number }) {
  const el = useRef<HTMLDivElement>(null)

  const onMove = useCallback((e: React.MouseEvent) => {
    const r = el.current!.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width  - 0.5) * 2
    const y = ((e.clientY - r.top)  / r.height - 0.5) * 2
    el.current!.style.transform =
      `perspective(600px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateZ(6px)`
  }, [])

  const onLeave = useCallback(() => {
    el.current!.style.transform = 'perspective(600px) rotateX(0) rotateY(0) translateZ(0)'
  }, [])

  const top = `${((task.start - START_H) / TOTAL_H) * 100}%`
  const height = `${(task.dur / TOTAL_H) * 100}%`

  return (
    <div
      ref={el}
      className={`task-block${task.done ? ' done' : ''}`}
      style={{
        top, height,
        background: task.bg,
        color: task.fg,
        '--delay': `${delay}ms`,
      } as React.CSSProperties}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      data-hover
    >
      <div>
        <div className="task-label">{task.label}</div>
        <div className="task-topic">{task.sub}</div>
      </div>
      {task.done && (
        <div className="task-done-mark">
          <svg viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke={task.fg} strokeWidth="1.2" opacity="0.3" />
            <path
              className="check-path"
              d="M5 8.5l2 2 4-4"
              stroke={task.fg}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  )
}

// ─── Streak counter with number animation ─────────────────────────────
function StreakCounter({ target = 7 }: { target?: number }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const step = () => {
      start++
      setCount(start)
      if (start < target) setTimeout(step, 80)
    }
    const t = setTimeout(step, 600)
    return () => clearTimeout(t)
  }, [target])

  return (
    <div className="sidebar-section">
      <div className="sidebar-label">Current streak</div>
      <div className="streak-number" aria-label={`${target} day streak`}>
        {String(count).padStart(2, '0')}
      </div>
      <div className="streak-sub">days in a row 🔥</div>
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────
function ProgBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  const [filled, setFilled] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setFilled(pct), 300)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div className="prog-row">
      <div className="prog-meta">
        <span>{label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
      </div>
      <div className="prog-track">
        <div
          className="prog-fill"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} progress`}
          style={{
            width: `${filled}%`,
            background: color,
            color,
          }}
        />
      </div>
    </div>
  )
}

// ─── Quick task check ─────────────────────────────────────────────────
function QuickTask({ task }: { task: typeof QUICK_TASKS[number] }) {
  const [done, setDone] = useState(false)
  return (
    <div className="quick-item">
      <div className="quick-item-left">
        <div className="quick-item-tag" style={{ color: task.color }}>{task.label}</div>
        <div className="quick-item-name">{task.name}</div>
      </div>
      <button
        className={`check-btn${done ? ' checked' : ''}`}
        onClick={() => setDone(d => !d)}
        aria-label={`Mark "${task.name}" as ${done ? 'undone' : 'done'}`}
        aria-pressed={done}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            className="chk"
            d="M2.5 6l2.5 2.5 4.5-4.5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────
export default function Page() {
  const router = useRouter()

  // Redirect already-logged-in users straight to the dashboard
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getUser().then(({ data: { user } }) => {
        if (user) router.replace('/dashboard')
      })
    })
  }, [router])

  // Lenis smooth scroll — desktop only (breaks WebView touch scroll)
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    const lenis = new Lenis({ duration: 1.2, easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) })
    const raf = (time: number) => { lenis.raf(time); requestAnimationFrame(raf) }
    requestAnimationFrame(raf)
    return () => lenis.destroy()
  }, [])

  // Scroll reveals
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.15 }
    )
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  // Group tasks by day
  const byDay = DAYS.map((_, i) =>
    TASKS.filter(t => t.day === i).map((t, j) => ({ ...t, delay: 80 + j * 60 + i * 30 }))
  )

  const weekLabel = (() => {
    const now = new Date()
    const jan1 = new Date(now.getFullYear(), 0, 1)
    return `Week ${Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)}`
  })()

  return (
    <>
      {/* ── Cubes fullscreen background ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <Cubes
          gridSize={12}
          maxAngle={35}
          radius={4}
          borderStyle="1px solid rgba(26,23,20,0.10)"
          faceColor="#EAE6E0"
          rippleColor="#1A1714"
          autoAnimate={true}
          rippleOnClick={true}
          rippleSpeed={2}
          listenOnWindow={true}
          style={{ width: '100%', height: '100%', aspectRatio: 'auto' }}
        />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
      <div className="layout">
        {/* ── Sidebar ──────────────────────────────────── */}
        <aside className="sidebar">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>Codeine</div>

          <StreakCounter target={7} />

          <div className="sidebar-section">
            <div className="sidebar-label">Roadmap progress</div>
            {PROGRESS.map(p => <ProgBar key={p.label} {...p} />)}
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">Today&apos;s time logged</div>
            {TIME_LOGGED.map(t => (
              <div className="time-row" key={t.subj}>
                <span className="t-subj">{t.subj}</span>
                <span className="t-val">{t.val}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <MagBtn onClick={() => router.push('/signup')}>Get started →</MagBtn>
            <MagBtn ghost onClick={() => router.push('/login')}>Sign in</MagBtn>
          </div>
        </aside>

        {/* ── Main ─────────────────────────────────────── */}
        <div className="content">

          {/* ── Hero — no background, cubes show through from fixed layer ── */}
          <div style={{
            padding: '80px 40px 72px',
            minHeight: '60vh',
            borderBottom: '1px solid rgba(26,23,20,0.12)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 24,
          }}>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Codeine</p>
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(36px, 5vw, 72px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.0, color: 'var(--ink)', maxWidth: 640 }}>
              Your learning<br />journey, tracked.
            </h1>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 420, lineHeight: 1.65 }}>
              Roadmaps, syllabus tracking, streaks, budgeting, and more. All in one place.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <MagBtn onClick={() => router.push('/signup')}>Get started →</MagBtn>
              <MagBtn ghost onClick={() => router.push('/login')}>Sign in</MagBtn>
            </div>
          </div>

          {/* Week nav */}
          <div className="week-nav">
            <h1 className="week-label">{weekLabel}</h1>
            <div className="week-controls">
              <button className="week-btn" aria-label="Previous week">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="week-btn" aria-label="Next week">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 11l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Day header */}
          <div className="timetable-header">
            <div /> {/* time gutter spacer */}
            {DAYS.map((d, i) => (
              <div key={d} className={`day-col${i === TODAY_IDX ? ' today' : ''}`}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: i === TODAY_IDX ? 'var(--ink)' : 'var(--ink-3)', textTransform: 'uppercase' }}>{d}</span>
                {i === TODAY_IDX ? (
                  <span className="day-num" aria-label={`Today, ${DAY_NUMS[i]}`}>{DAY_NUMS[i]}</span>
                ) : (
                  <span style={{ display: 'block', fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink-2)', marginTop: 2 }}>{DAY_NUMS[i]}</span>
                )}
              </div>
            ))}
          </div>

          {/* Timetable body */}
          <div className="timetable-body">
            {/* Time labels */}
            <div className="time-gutter">
              {HOURS.map(h => (
                <div className="time-label" key={h}>
                  {h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {DAYS.map((d, i) => (
              <div key={d} className={`day-column${i === TODAY_IDX ? ' today' : ''}`}>
                {byDay[i].map(task => (
                  <TaskBlock key={task.id} task={task} delay={task.delay} />
                ))}
              </div>
            ))}
          </div>

          {/* ── Quick mark done ──────────────────────────── */}
          <div className="quick-section reveal">
            <h2 className="quick-title">Quick actions</h2>
            <div className="quick-grid">
              {QUICK_TASKS.map(t => <QuickTask key={t.id} task={t} />)}
            </div>
          </div>

          {/* ── XP + stats footer ───────────────────────── */}
          <div
            className="reveal"
            style={{
              padding: '48px 24px 64px',
              borderTop: '1px solid var(--line)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '1px',
              background: 'var(--line)',
              borderLeft: 'none',
              borderRight: 'none',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {[
              { label: 'Total XP',     value: '420' },
              { label: 'Problems solved', value: '84' },
              { label: 'Hours logged', value: '47h' },
              { label: 'Level',        value: '03' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--bg)', padding: '32px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 48, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* ── Bottom CTA ──────────────────────────────── */}
          <div style={{ padding: '48px 24px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-head)', fontSize: '24px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)' }}>Ready to start?</p>
              <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginTop: '4px' }}>Your journey begins the day you track it.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <MagBtn onClick={() => router.push('/signup')}>Create account →</MagBtn>
              <MagBtn ghost onClick={() => router.push('/login')}>Sign in</MagBtn>
            </div>
          </div>

        </div>
      </div>
      </div>
    </>
  )
}
