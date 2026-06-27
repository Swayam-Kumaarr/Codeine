import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Called once daily — checks GitHub commit activity via public API
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, github_username, name')
    .not('github_username', 'is', null)

  if (!profiles?.length) return NextResponse.json({ sent: 0 })

  let sent = 0

  for (const profile of profiles) {
    if (!profile.github_username) continue

    // Get user-configured inactive days threshold (default 7)
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
        const { data: sub } = await supabase
          .from('push_subscriptions')
          .select('subscription')
          .eq('user_id', profile.id)
          .single()

        if (!sub?.subscription) continue

        const title = '🌿 GitHub — No commits recently'
        const body = `@${profile.github_username} — no push in ${inactiveDays}+ days. Your coding streak is at risk.`

        await webpush.sendNotification(sub.subscription, JSON.stringify({
          title,
          body,
          tag: 'github-alert',
          url: `https://github.com/${profile.github_username}`,
        }))

        await supabase.from('notification_log').insert({
          user_id: profile.id,
          type: 'github',
          title,
          body,
        })

        sent++
      }
    } catch {}
  }

  return NextResponse.json({ sent })
}

export { POST as GET }
