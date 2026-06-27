import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Called by a cron (e.g. Supabase Edge Function or Vercel cron)
// Sends morning digest to all users at their preferred study time
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
    // Count today's tasks
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('scheduled_date', today)

    const body = count
      ? `You have ${count} task${count !== 1 ? 's' : ''} scheduled today. Let's get it.`
      : 'No tasks scheduled today. Take a rest or add something new.'

    try {
      await webpush.sendNotification(subscription, JSON.stringify({
        title: '☀️ Good morning — Codeine',
        body,
        tag: 'morning-digest',
        url: '/dashboard',
      }))
      sent++
    } catch {}
  }

  return NextResponse.json({ sent })
}

export { POST as GET }
