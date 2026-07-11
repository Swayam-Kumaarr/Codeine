import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { pushToUser } from '@/lib/pushToUser'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const mode = new URL(req.url).searchParams.get('mode') ?? 'daily'

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, leetcode_username, name')
    .not('leetcode_username', 'is', null)

  if (!profiles?.length) return NextResponse.json({ sent: 0 })

  let sent = 0

  for (const profile of profiles) {
    if (!profile.leetcode_username) continue

    let solvedToday = false
    try {
      const query = `
        query recentAcSubmissions($username: String!, $limit: Int) {
          recentAcSubmissionList(username: $username, limit: $limit) {
            id
            timestamp
          }
        }
      `
      const res = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
        body: JSON.stringify({ query, variables: { username: profile.leetcode_username, limit: 5 } }),
      })
      if (res.ok) {
        const json = await res.json()
        const subs = json.data?.recentAcSubmissionList ?? []
        const today = Math.floor(Date.now() / 1000) - 86400
        solvedToday = subs.some((s: { timestamp: string }) => parseInt(s.timestamp) > today)
      }
    } catch {}

    if (mode === 'daily' && solvedToday) continue

    const { data: prefs } = await supabase
      .from('notification_prefs')
      .select('leetcode_daily')
      .eq('user_id', profile.id)
      .single()

    if (prefs && !prefs.leetcode_daily) continue

    const title = '⚡ LeetCode — Daily Problem'
    const body = solvedToday
      ? `@${profile.leetcode_username} — great, you solved one today! Aim for one more.`
      : `@${profile.leetcode_username} — no submission today yet. Open your roadmap and solve one.`

    const pushed = await pushToUser(supabase, profile.id, { title, body, tag: 'leetcode-daily', url: '/dashboard' })

    if (pushed) {
      await supabase.from('notification_log').insert({ user_id: profile.id, type: 'leetcode_daily', title, body })
      sent++
    }
  }

  if (mode === 'contest') {
    try {
      const query = `{ allContests { title titleSlug startTime duration } }`
      const res = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
        body: JSON.stringify({ query }),
      })
      if (res.ok) {
        const json = await res.json()
        const now = Math.floor(Date.now() / 1000)
        const soon = (json.data?.allContests ?? []).filter((c: { startTime: number }) =>
          c.startTime > now && c.startTime < now + 3600
        )

        if (soon.length > 0) {
          const contest = soon[0]
          const { data: allProfiles } = await supabase.from('profiles').select('id')

          for (const p of allProfiles ?? []) {
            const { data: prefs } = await supabase.from('notification_prefs').select('leetcode_contests').eq('user_id', p.id).single()
            if (prefs && !prefs.leetcode_contests) continue

            const title = `🏆 Contest in ~1 hour`
            const body = `${contest.title} starts soon. Register at leetcode.com/contest`

            const pushed = await pushToUser(supabase, p.id, { title, body, tag: 'lc-contest', url: 'https://leetcode.com/contest' })
            if (pushed) {
              await supabase.from('notification_log').insert({ user_id: p.id, type: 'leetcode_contest', title, body })
              sent++
            }
          }
        }
      }
    } catch {}
  }

  return NextResponse.json({ sent })
}

export { POST as GET }
