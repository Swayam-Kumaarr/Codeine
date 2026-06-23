import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const PAYLOADS: Record<string, { title: string; body: string; icon?: string }> = {
  github: {
    title: '🌿 GitHub check-in',
    body: 'No commits in a while — push something today to keep the streak alive.',
  },
  leetcode_daily: {
    title: '⚡ LeetCode — Daily Problem',
    body: "Solve today's problem and check it off your roadmap. Don't skip!",
  },
  contest: {
    title: '🏆 Contest in 1 hour',
    body: 'LeetCode Weekly Contest starts soon. Register now if you haven\'t.',
  },
  gym: {
    title: '💪 Gym time',
    body: "Today's session is on your split. Get it done.",
  },
  roadmap: {
    title: '📚 Daily Digest',
    body: "You have tasks waiting today. Open Codeine and knock them out.",
  },
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type } = await req.json()
  const payload = PAYLOADS[type] ?? PAYLOADS.roadmap

  const { data: sub } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', user.id)
    .single()

  if (!sub?.subscription) return NextResponse.json({ error: 'No subscription found' }, { status: 400 })

  try {
    await webpush.sendNotification(sub.subscription, JSON.stringify({
      ...payload,
      tag: `test-${type}`,
      url: '/dashboard/notifications',
    }))

    // Log it
    await supabase.from('notification_log').insert({
      user_id: user.id,
      type,
      title: payload.title,
      body: payload.body,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
