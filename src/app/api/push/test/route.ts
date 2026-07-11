import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { pushToUser } from '@/lib/pushToUser'

const PAYLOADS: Record<string, { title: string; body: string }> = {
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
    body: "LeetCode Weekly Contest starts soon. Register now if you haven't.",
  },
  gym: {
    title: '💪 Gym time',
    body: "Today's session is on your split. Get it done.",
  },
  roadmap: {
    title: '📚 Daily Digest',
    body: 'You have tasks waiting today. Open Codeine and knock them out.',
  },
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type } = await req.json()
  const payload = PAYLOADS[type] ?? PAYLOADS.roadmap

  // Use service client so we can read push_subscriptions + push_tokens (bypasses RLS)
  const serviceClient = createServiceClient()
  const sent = await pushToUser(serviceClient, user.id, {
    title: payload.title,
    body: payload.body,
    tag: `test-${type}`,
    url: '/dashboard/notifications',
  })

  if (!sent) return NextResponse.json({ error: 'No push subscription or FCM token found — enable notifications first.' }, { status: 400 })

  await supabase.from('notification_log').insert({
    user_id: user.id,
    type,
    title: payload.title,
    body: payload.body,
  })

  return NextResponse.json({ ok: true })
}
