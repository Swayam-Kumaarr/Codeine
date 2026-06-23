import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Called daily at configurable time — checks gym split for today, skips Rest days
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')

  if (!profiles?.length) return NextResponse.json({ sent: 0 })

  const todayDow = new Date().getDay()
  const todayStr = new Date().toISOString().split('T')[0]
  let sent = 0

  for (const profile of profiles) {
    const { data: prefs } = await supabase
      .from('notification_prefs')
      .select('gym_reminder')
      .eq('user_id', profile.id)
      .single()

    if (prefs && !prefs.gym_reminder) continue

    const { data: splitDay } = await supabase
      .from('gym_split')
      .select('label, exercises')
      .eq('user_id', profile.id)
      .eq('day_of_week', todayDow)
      .single()

    if (!splitDay || splitDay.label === 'Rest') continue

    // Check if already logged today
    const { data: log } = await supabase
      .from('gym_logs')
      .select('done')
      .eq('user_id', profile.id)
      .eq('log_date', todayStr)
      .single()

    if (log?.done) continue

    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', profile.id)
      .single()

    if (!sub?.subscription) continue

    const exercises = (splitDay.exercises as string[]).slice(0, 3).join(', ')
    const title = `💪 ${splitDay.label} day`
    const body = exercises
      ? `Today: ${exercises}${(splitDay.exercises as string[]).length > 3 ? '…' : ''}. Mark it done when you finish.`
      : `${splitDay.label} is on your split today. Go get it.`

    try {
      await webpush.sendNotification(sub.subscription, JSON.stringify({
        title,
        body,
        tag: 'gym-reminder',
        url: '/dashboard/gym',
      }))

      await supabase.from('notification_log').insert({
        user_id: profile.id,
        type: 'gym',
        title,
        body,
      })

      sent++
    } catch {}
  }

  return NextResponse.json({ sent })
}
