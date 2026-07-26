'use client'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { ExternalLink, RefreshCw, GitMerge, XCircle, AlertTriangle, CheckCircle2, Clock, GitPullRequest } from 'lucide-react'

const REPO = 'Swayam-Kumaarr/artery'
const GH = 'https://api.github.com'

interface Signal { text: string; ok: boolean }
interface ScoredPR {
  number: number
  title: string
  author: string
  authorAvatar: string
  body: string
  createdAt: string
  additions: number
  deletions: number
  changedFiles: number
  score: number
  signals: Signal[]
  verdict: 'ready' | 'needs-look' | 'borderline' | 'spam'
  url: string
  merging: boolean
  closing: boolean
  merged: boolean
  closed: boolean
}

async function ghFetch(path: string, pat: string, opts?: RequestInit) {
  const r = await fetch(`${GH}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts?.headers ?? {}),
    },
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? `GitHub ${r.status}`)
  }
  return r.json()
}

async function scorePR(pr: { number: number; body: string; head: { sha: string }; additions: number; deletions: number; changed_files: number }, pat: string): Promise<{ score: number; signals: Signal[]; verdict: ScoredPR['verdict'] }> {
  const [reviews, comments, issueComments, checkRuns] = await Promise.all([
    ghFetch(`/repos/${REPO}/pulls/${pr.number}/reviews`, pat).catch(() => []),
    ghFetch(`/repos/${REPO}/pulls/${pr.number}/comments`, pat).catch(() => []),
    ghFetch(`/repos/${REPO}/issues/${pr.number}/comments`, pat).catch(() => []),
    ghFetch(`/repos/${REPO}/commits/${pr.head.sha}/check-runs`, pat).catch(() => ({ check_runs: [] })),
  ])

  let score = 0
  const signals: Signal[] = []

  // CI checks
  const runs: { conclusion: string }[] = (checkRuns as { check_runs: { conclusion: string }[] }).check_runs ?? []
  if (runs.length > 0) {
    const allPass = runs.every(r => r.conclusion === 'success')
    const anyFail = runs.some(r => r.conclusion === 'failure')
    if (allPass) { score += 2; signals.push({ text: 'CI passing', ok: true }) }
    else if (anyFail) { score -= 3; signals.push({ text: 'CI failing', ok: false }) }
    else { signals.push({ text: 'CI pending', ok: true }) }
  }

  // Linked issue
  const body = pr.body ?? ''
  const hasIssueRef = /#\d+/.test(body) || /closes|fixes|resolves/i.test(body)
  if (hasIssueRef) { score += 1; signals.push({ text: 'Links an issue', ok: true }) }
  else { score -= 1; signals.push({ text: 'No linked issue', ok: false }) }

  // Description quality
  if (body.trim().length > 100) { score += 1; signals.push({ text: 'Has description', ok: true }) }
  else { signals.push({ text: 'Thin description', ok: false }) }

  // Diff size
  const totalLines = pr.additions + pr.deletions
  if (totalLines < 5) { score -= 1; signals.push({ text: `${totalLines} lines changed`, ok: false }) }

  // Reviews
  const approvedReviews = (reviews as { state: string }[]).filter(r => r.state === 'APPROVED')
  const changesReq = (reviews as { state: string }[]).filter(r => r.state === 'CHANGES_REQUESTED')
  if (approvedReviews.length > 0) { score += 3; signals.push({ text: `${approvedReviews.length} approval${approvedReviews.length > 1 ? 's' : ''}`, ok: true }) }
  if (changesReq.length > 0) { score -= 2; signals.push({ text: 'Changes requested', ok: false }) }

  // Comment sentiment
  const allBodies = [...(comments as { body: string }[]), ...(issueComments as { body: string }[])].map(c => (c.body ?? '').toLowerCase())
  const positive = allBodies.filter(b => b.includes('lgtm') || b.includes('looks good') || b.includes('approved'))
  const begging = allBodies.filter(b => b.includes('please merge') || b.includes('accept my') || b.includes('please accept') || b.includes('kindly merge') || b.includes('pls merge'))
  if (positive.length > 0) { score += 1; signals.push({ text: 'Positive comments', ok: true }) }
  if (begging.length > 0) { score -= 2; signals.push({ text: 'Begging comments', ok: false }) }

  const verdict: ScoredPR['verdict'] =
    score >= 4 ? 'ready' :
    score >= 2 ? 'needs-look' :
    score >= 0 ? 'borderline' : 'spam'

  return { score, signals, verdict }
}

const VERDICT_META = {
  ready:       { label: 'Ready to merge', bg: '#F0FAF4', color: '#1A6B3A', border: '#6DBF90' },
  'needs-look': { label: 'Needs a look',  bg: '#FFF8EE', color: '#7A4800', border: '#F0C060' },
  borderline:  { label: 'Borderline',    bg: '#FFF5E6', color: '#9A3A00', border: '#F0A060' },
  spam:        { label: 'Likely spam',   bg: '#FFF5F5', color: '#9A1A1A', border: '#F09090' },
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function ArteryPage() {
  const [pat, setPat] = useState<string | null>(null)
  const [prs, setPrs] = useState<ScoredPR[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    setPat(sessionStorage.getItem('gh_pat'))
  }, [])

  const load = useCallback(async (token: string) => {
    setLoading(true)
    setError(null)
    try {
      const raw: {
        number: number; title: string; user: { login: string; avatar_url: string }
        body: string; created_at: string; additions: number; deletions: number
        changed_files: number; html_url: string; head: { sha: string }
      }[] = await ghFetch(`/repos/${REPO}/pulls?state=open&per_page=50`, token)

      const scored = await Promise.all(raw.map(async pr => {
        const { score, signals, verdict } = await scorePR(pr, token)
        return {
          number: pr.number,
          title: pr.title,
          author: pr.user.login,
          authorAvatar: pr.user.avatar_url,
          body: pr.body ?? '',
          createdAt: pr.created_at,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changed_files,
          score,
          signals,
          verdict,
          url: pr.html_url,
          merging: false,
          closing: false,
          merged: false,
          closed: false,
        } satisfies ScoredPR
      }))

      scored.sort((a, b) => b.score - a.score)
      setPrs(scored)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load PRs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (pat) load(pat)
  }, [pat, load])

  async function mergePR(num: number) {
    if (!pat) return
    setPrs(p => p.map(pr => pr.number === num ? { ...pr, merging: true } : pr))
    try {
      await ghFetch(`/repos/${REPO}/pulls/${num}/merge`, pat, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merge_method: 'squash' }),
      })
      setPrs(p => p.map(pr => pr.number === num ? { ...pr, merging: false, merged: true } : pr))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Merge failed')
      setPrs(p => p.map(pr => pr.number === num ? { ...pr, merging: false } : pr))
    }
  }

  async function closePR(num: number) {
    if (!pat) return
    setPrs(p => p.map(pr => pr.number === num ? { ...pr, closing: true } : pr))
    try {
      await ghFetch(`/repos/${REPO}/pulls/${num}`, pat, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'closed' }),
      })
      setPrs(p => p.map(pr => pr.number === num ? { ...pr, closing: false, closed: true } : pr))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Close failed')
      setPrs(p => p.map(pr => pr.number === num ? { ...pr, closing: false } : pr))
    }
  }

  if (!pat) return (
    <div style={{ padding: '32px 24px', maxWidth: '600px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <GitPullRequest size={20} color="var(--ink-2)" />
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)' }}>Artery PRs</h1>
      </div>
      <p style={{ fontSize: '14px', color: 'var(--ink-2)', marginBottom: '24px' }}>Auto-triage for open pull requests on the Artery repo.</p>
      <div style={{ padding: '20px', background: 'var(--bg-panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}>
        <p style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 500, marginBottom: '8px' }}>GitHub PAT not set</p>
        <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginBottom: '12px' }}>Add your Personal Access Token in Settings to load PRs.</p>
        <a href="/dashboard/settings" style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 600, textDecoration: 'underline' }}>Go to Settings</a>
      </div>
    </div>
  )

  const active = prs.filter(p => !p.merged && !p.closed)
  const done = prs.filter(p => p.merged || p.closed)

  const counts = {
    ready: active.filter(p => p.verdict === 'ready').length,
    'needs-look': active.filter(p => p.verdict === 'needs-look').length,
    borderline: active.filter(p => p.verdict === 'borderline').length,
    spam: active.filter(p => p.verdict === 'spam').length,
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '760px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <GitPullRequest size={20} color="var(--ink-2)" />
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)' }}>Artery PRs</h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--ink-3)' }}>
            <a href={`https://github.com/${REPO}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>github.com/{REPO}</a>
          </p>
        </div>
        <button
          onClick={() => load(pat)}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: 'var(--r)', border: '1px solid var(--line-strong)', background: 'var(--bg-panel)', color: 'var(--ink)', fontSize: '13px', fontWeight: 500, cursor: loading ? 'wait' : 'pointer', fontFamily: 'var(--font-body)' }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#FFF5F5', border: '1px solid #F09090', borderRadius: 'var(--r)', fontSize: '13px', color: '#9A1A1A', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={14} />
          {error}. Check your PAT in Settings.
        </div>
      )}

      {/* Summary chips */}
      {active.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {(Object.entries(counts) as [ScoredPR['verdict'], number][]).map(([v, n]) => {
            if (!n) return null
            const m = VERDICT_META[v]
            return (
              <div key={v} style={{ padding: '5px 12px', borderRadius: '99px', background: m.bg, border: `1px solid ${m.border}`, fontSize: '12px', fontWeight: 600, color: m.color }}>
                {n} {m.label}
              </div>
            )
          })}
        </div>
      )}

      {loading && prs.length === 0 && (
        <p style={{ fontSize: '14px', color: 'var(--ink-3)', padding: '40px 0', textAlign: 'center' }}>Loading PRs…</p>
      )}

      {!loading && prs.length === 0 && !error && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <CheckCircle2 size={32} color="var(--ink-3)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: '14px', color: 'var(--ink-3)' }}>No open PRs on Artery right now.</p>
        </div>
      )}

      {/* PR list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {active.map(pr => {
          const meta = VERDICT_META[pr.verdict]
          const isOpen = expanded === pr.number
          return (
            <div
              key={pr.number}
              style={{ border: `1px solid ${isOpen ? meta.border : 'var(--line)'}`, borderRadius: 'var(--r)', background: 'var(--bg-panel)', overflow: 'hidden', transition: 'border-color 0.15s' }}
            >
              {/* PR row */}
              <div
                style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '12px' }}
                onClick={() => setExpanded(isOpen ? null : pr.number)}
              >
                <Image src={pr.authorAvatar} alt={pr.author} width={32} height={32} style={{ borderRadius: '50%', flexShrink: 0, marginTop: 2 }} unoptimized />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      #{pr.number} {pr.title}
                    </span>
                    <span style={{ padding: '2px 9px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {meta.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--ink-3)', flexWrap: 'wrap' }}>
                    <span>{pr.author}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={10} />{timeAgo(pr.createdAt)}</span>
                    <span style={{ color: '#2db55d' }}>+{pr.additions}</span>
                    <span style={{ color: '#ef4743' }}>{pr.deletions}</span>
                    <span>{pr.changedFiles} file{pr.changedFiles !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', color: meta.color, background: meta.bg, padding: '3px 8px', borderRadius: '6px', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {pr.score > 0 ? `+${pr.score}` : pr.score}
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--line)', padding: '14px 16px', background: 'var(--bg)' }}>
                  {/* Signals */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    {pr.signals.map((s, i) => (
                      <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 500, background: s.ok ? '#F0FAF4' : '#FFF5F5', color: s.ok ? '#1A6B3A' : '#9A1A1A', border: `1px solid ${s.ok ? '#6DBF90' : '#F09090'}` }}>
                        {s.ok ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                        {s.text}
                      </span>
                    ))}
                  </div>

                  {/* PR description */}
                  {pr.body.trim() && (
                    <p style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: '14px', padding: '10px 12px', background: 'var(--bg-panel)', borderRadius: 'var(--r)', borderLeft: '3px solid var(--line-strong)', maxHeight: '100px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                      {pr.body.trim()}
                    </p>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => mergePR(pr.number)}
                      disabled={pr.merging}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--r)', border: 'none', background: '#1A6B3A', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: pr.merging ? 'wait' : 'pointer', fontFamily: 'var(--font-body)' }}
                    >
                      <GitMerge size={13} />
                      {pr.merging ? 'Merging…' : 'Merge (squash)'}
                    </button>
                    <button
                      onClick={() => closePR(pr.number)}
                      disabled={pr.closing}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--r)', border: '1px solid #F09090', background: '#FFF5F5', color: '#9A1A1A', fontSize: '13px', fontWeight: 600, cursor: pr.closing ? 'wait' : 'pointer', fontFamily: 'var(--font-body)' }}
                    >
                      <XCircle size={13} />
                      {pr.closing ? 'Closing…' : 'Close PR'}
                    </button>
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--r)', border: '1px solid var(--line-strong)', background: 'var(--bg-panel)', color: 'var(--ink)', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}
                    >
                      <ExternalLink size={13} />
                      View on GitHub
                    </a>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Done this session */}
        {done.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>Actioned this session</p>
            {done.map(pr => (
              <div key={pr.number} style={{ padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 'var(--r)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.6 }}>
                {pr.merged ? <GitMerge size={14} color="#1A6B3A" /> : <XCircle size={14} color="#9A1A1A" />}
                <span style={{ fontSize: '13px', color: 'var(--ink)' }}>#{pr.number} {pr.title}</span>
                <span style={{ fontSize: '11px', color: 'var(--ink-3)', marginLeft: 'auto' }}>{pr.merged ? 'Merged' : 'Closed'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
