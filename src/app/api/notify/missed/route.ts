import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Called at 9pm — alert users with incomplete tasks
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')

  if (!subs?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const { user_id, subscription } of subs) {
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('scheduled_date', today)
      .eq('done', false)

    if (!count || count === 0) continue

    try {
      await webpush.sendNotification(subscription, JSON.stringify({
        title: '⚠️ Tasks still pending',
        body: `${count} task${count !== 1 ? 's' : ''} not done yet today. Your streak is at risk.`,
        tag: 'missed-alert',
        url: '/dashboard',
      }))
      sent++
    } catch {}
  }

  return NextResponse.json({ sent })
}

export { POST as GET }
