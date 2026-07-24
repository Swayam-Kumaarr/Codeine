'use client'
import { useEffect, useState } from 'react'
import { useProfile } from '@/lib/hooks/useProfile'
import { ExternalLink, Code2, Flame, CalendarDays, Trophy, BookOpen, CheckCircle2 } from 'lucide-react'
import { ALL_ROADMAPS } from '@/data/roadmaps'

interface LCData {
  username: string
  solved: { total: number; easy: number; medium: number; hard: number }
  streak: number
  activeDays: number
}

type Problem = { num: number; title: string; slug: string }

const TOPIC_PROBLEMS: Record<string, { easy: Problem; medium: Problem; hard: Problem }> = {
  'C Fundamentals for DSA': {
    easy:   { num: 485,  title: 'Max Consecutive Ones',                    slug: 'max-consecutive-ones' },
    medium: { num: 189,  title: 'Rotate Array',                            slug: 'rotate-array' },
    hard:   { num: 42,   title: 'Trapping Rain Water',                     slug: 'trapping-rain-water' },
  },
  'Arrays and Strings': {
    easy:   { num: 217,  title: 'Contains Duplicate',                      slug: 'contains-duplicate' },
    medium: { num: 3,    title: 'Longest Substring Without Repeating',      slug: 'longest-substring-without-repeating-characters' },
    hard:   { num: 76,   title: 'Minimum Window Substring',                slug: 'minimum-window-substring' },
  },
  'Linked Lists': {
    easy:   { num: 206,  title: 'Reverse Linked List',                     slug: 'reverse-linked-list' },
    medium: { num: 142,  title: 'Linked List Cycle II',                    slug: 'linked-list-cycle-ii' },
    hard:   { num: 25,   title: 'Reverse Nodes in k-Group',                slug: 'reverse-nodes-in-k-group' },
  },
  'Stacks': {
    easy:   { num: 20,   title: 'Valid Parentheses',                       slug: 'valid-parentheses' },
    medium: { num: 155,  title: 'Min Stack',                               slug: 'min-stack' },
    hard:   { num: 84,   title: 'Largest Rectangle in Histogram',          slug: 'largest-rectangle-in-histogram' },
  },
  'Queues': {
    easy:   { num: 232,  title: 'Implement Queue using Stacks',            slug: 'implement-queue-using-stacks' },
    medium: { num: 239,  title: 'Sliding Window Maximum',                  slug: 'sliding-window-maximum' },
    hard:   { num: 862,  title: 'Shortest Subarray with Sum at Least K',   slug: 'shortest-subarray-with-sum-at-least-k' },
  },
  'Trees': {
    easy:   { num: 104,  title: 'Maximum Depth of Binary Tree',            slug: 'maximum-depth-of-binary-tree' },
    medium: { num: 102,  title: 'Binary Tree Level Order Traversal',       slug: 'binary-tree-level-order-traversal' },
    hard:   { num: 124,  title: 'Binary Tree Maximum Path Sum',            slug: 'binary-tree-maximum-path-sum' },
  },
  'Graphs': {
    easy:   { num: 997,  title: 'Find the Town Judge',                     slug: 'find-the-town-judge' },
    medium: { num: 200,  title: 'Number of Islands',                       slug: 'number-of-islands' },
    hard:   { num: 127,  title: 'Word Ladder',                             slug: 'word-ladder' },
  },
  'Hashing': {
    easy:   { num: 1,    title: 'Two Sum',                                 slug: 'two-sum' },
    medium: { num: 49,   title: 'Group Anagrams',                          slug: 'group-anagrams' },
    hard:   { num: 128,  title: 'Longest Consecutive Sequence',            slug: 'longest-consecutive-sequence' },
  },
  'Sorting Algorithms': {
    easy:   { num: 912,  title: 'Sort an Array',                           slug: 'sort-an-array' },
    medium: { num: 75,   title: 'Sort Colors',                             slug: 'sort-colors' },
    hard:   { num: 315,  title: 'Count of Smaller Numbers After Self',     slug: 'count-of-smaller-numbers-after-self' },
  },
}

const DIFFICULTY_TOTALS = { easy: 850, medium: 1800, hard: 750 }

function getCurrentDSATopic(createdAt: string) {
  const dsa = ALL_ROADMAPS.find(r => r.id === 'dsa')
  if (!dsa) return null
  const start = new Date(createdAt)
  start.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1)
  for (const t of dsa.topics) {
    if (day >= t.startDay && day <= t.endDay) return t
    if (day < t.startDay) return dsa.topics[0]
  }
  return dsa.topics[dsa.topics.length - 1]
}

function ProblemLink({ label, color, bg, p }: {
  label: string; color: string; bg: string; p: Problem
}) {
  return (
    <a
      href={`https://leetcode.com/problems/${p.slug}/`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: 'var(--r)',
        background: bg, textDecoration: 'none', gap: '12px',
        border: `1px solid ${color}22`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color, flexShrink: 0 }}>{label}</span>
        <span style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          #{p.num} {p.title}
        </span>
      </div>
      <ExternalLink size={12} color="var(--ink-3)" style={{ flexShrink: 0 }} />
    </a>
  )
}

export default function LeetCodePage() {
  const { profile } = useProfile()
  const [data, setData] = useState<LCData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [solvedToday, setSolvedToday] = useState(false)

  const todayKey = `lc_daily_${new Date().toISOString().split('T')[0]}`

  useEffect(() => {
    setSolvedToday(localStorage.getItem(todayKey) === '1')
  }, [todayKey])

  useEffect(() => {
    fetch('/api/leetcode')
      .then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => Promise.reject(e.error)))
      .then(setData)
      .catch(e => setError(typeof e === 'string' ? e : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  function markSolvedToday() {
    localStorage.setItem(todayKey, '1')
    setSolvedToday(true)
  }

  const username = profile?.leetcode_username
  const currentTopic = profile?.created_at ? getCurrentDSATopic(profile.created_at) : null
  const suggestions = currentTopic ? TOPIC_PROBLEMS[currentTopic.name] : null

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-panel)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r)',
    padding: '18px',
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '680px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Code2 size={20} color="var(--lc-ink)" />
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)' }}>LeetCode</h1>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>Stats, daily habit, and topic-based problem suggestions.</p>
      </div>

      {/* Daily reminder */}
      {!solvedToday ? (
        <div style={{ padding: '14px 16px', background: '#FDF5E6', border: '1px solid #E8C87A', borderRadius: 'var(--r)', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#7A4800' }}>No problem solved yet today.</p>
            <p style={{ fontSize: '12px', color: '#9A6010', marginTop: '2px' }}>Solve at least one LeetCode problem before the day ends.</p>
          </div>
          <button
            onClick={markSolvedToday}
            style={{ flexShrink: 0, padding: '8px 14px', background: '#7A4800', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
          >
            Mark done
          </button>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', background: '#F0FAF4', border: '1px solid #6DBF90', borderRadius: 'var(--r)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={15} color="#1A6B3A" />
          <p style={{ fontSize: '13px', color: '#1A6B3A', fontWeight: 500 }}>Problem solved today. Good work.</p>
        </div>
      )}

      {!username && (
        <div style={{ padding: '20px', background: 'var(--lc-bg)', border: '1px solid rgba(122,72,0,0.2)', borderRadius: 'var(--r)', marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', color: 'var(--lc-ink)', fontWeight: 500, marginBottom: '6px' }}>No LeetCode username set</p>
          <p style={{ fontSize: '13px', color: 'var(--lc-ink)', opacity: 0.8, marginBottom: '12px' }}>Add your username in Settings to see your stats here.</p>
          <a href="/dashboard/settings" style={{ fontSize: '13px', color: 'var(--lc-ink)', fontWeight: 600, textDecoration: 'underline' }}>Go to Settings</a>
        </div>
      )}

      {loading && username && (
        <p style={{ fontSize: '14px', color: 'var(--ink-3)', marginBottom: '20px' }}>Loading stats…</p>
      )}

      {error && (
        <div style={{ padding: '14px 16px', background: 'var(--rev-bg)', border: '1px solid var(--rev-ink)', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--rev-ink)', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Total Solved', value: data.solved.total, icon: Trophy, color: 'var(--lc-ink)' },
              { label: 'Streak', value: `${data.streak}d`, icon: Flame, color: 'var(--rev-ink)' },
              { label: 'Active Days', value: data.activeDays, icon: CalendarDays, color: 'var(--dsa-ink)' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} style={inputStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Icon size={13} color={color} />
                  <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{label}</span>
                </div>
                <p style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.04em', color, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Difficulty progress bars */}
          <div style={{ ...inputStyle, marginBottom: '20px' }}>
            <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '16px' }}>Progress by difficulty</p>
            {[
              { label: 'Easy',   solved: data.solved.easy,   total: DIFFICULTY_TOTALS.easy,   color: '#2db55d' },
              { label: 'Medium', solved: data.solved.medium, total: DIFFICULTY_TOTALS.medium, color: '#ffa116' },
              { label: 'Hard',   solved: data.solved.hard,   total: DIFFICULTY_TOTALS.hard,   color: '#ef4743' },
            ].map(({ label, solved, total, color }) => (
              <div key={label} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--ink-2)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: '12px', color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{solved} / {total}</span>
                </div>
                <div style={{ height: '5px', background: 'var(--line-strong)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: color, width: `${Math.min(100, (solved / total) * 100)}%`, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>

          <a
            href={`https://leetcode.com/${data.username}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'var(--lc-bg)', border: '1px solid rgba(122,72,0,0.2)', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--lc-ink)', fontWeight: 500, textDecoration: 'none', marginBottom: '24px' }}
          >
            <ExternalLink size={13} />
            Open @{data.username} on LeetCode
          </a>
        </>
      )}

      {/* DSA topic connection */}
      {currentTopic && (
        <div style={{ ...inputStyle, borderColor: 'rgba(61,31,138,0.2)', background: '#F9F7FF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <BookOpen size={14} color="#3D1F8A" />
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3D1F8A' }}>Your DSA roadmap right now</span>
          </div>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>{currentTopic.name}</p>
          <p style={{ fontSize: '12px', color: 'var(--ink-3)', marginBottom: '14px' }}>Day {currentTopic.startDay} to {currentTopic.endDay} of your roadmap. Suggested problems for this topic:</p>
          {suggestions ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <ProblemLink label="Easy"   color="#2db55d" bg="#F0FAF4" p={suggestions.easy}   />
              <ProblemLink label="Medium" color="#ffa116" bg="#FFF8EE" p={suggestions.medium} />
              <ProblemLink label="Hard"   color="#ef4743" bg="#FFF5F5" p={suggestions.hard}   />
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--ink-3)' }}>No suggestions mapped for this topic yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
