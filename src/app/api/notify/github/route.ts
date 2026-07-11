import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { pushToUser } from '@/lib/pushToUser'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, github_username, name')
    .not('github_username', 'is', null)

  if (!profiles?.length) return NextResponse.json({ sent: 0 })

  let sent = 0

  for (const profile of profiles) {
    if (!profile.github_username) continue

    const { data: prefs } = await supabase
      .from('notification_prefs')
      .select('github_enabled, github_inactive_days')
      .eq('user_id', profile.id)
      .single()

    if (prefs && !prefs.github_enabled) continue

    const inactiveDays = prefs?.github_inactive_days ?? 7
    const since = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000).toISOString()

    try {
      const res = await fetch(
        `https://api.github.com/users/${profile.github_username}/events/public?per_page=20`,
        { headers: { 'User-Agent': 'Codeine-App' } }
      )
      if (!res.ok) continue

      const events = await res.json()
      const recentCommit = events.find((e: { type: string; created_at: string }) =>
        e.type === 'PushEvent' && new Date(e.created_at) > new Date(since)
      )

      if (!recentCommit) {
        const title = '🌿 GitHub — No commits recently'
        const body = `@${profile.github_username} — no push in ${inactiveDays}+ days. Your coding streak is at risk.`

        const pushed = await pushToUser(supabase, profile.id, {
          title,
          body,
          tag: 'github-alert',
          url: `https://github.com/${profile.github_username}`,
        })

        if (pushed) {
          await supabase.from('notification_log').insert({ user_id: profile.id, type: 'github', title, body })
          sent++
        }
      }
    } catch {}
  }

  return NextResponse.json({ sent })
}

export { POST as GET }
