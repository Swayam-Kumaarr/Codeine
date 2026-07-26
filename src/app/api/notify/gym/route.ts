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

    const { data: log } = await supabase
      .from('gym_logs')
      .select('done')
      .eq('user_id', profile.id)
      .eq('log_date', todayStr)
      .single()

    if (log?.done) continue

    const exercises = (splitDay.exercises as string[]).slice(0, 3).join(', ')
    const title = `💪 ${splitDay.label} day`
    const body = exercises
      ? `Today: ${exercises}${(splitDay.exercises as string[]).length > 3 ? '…' : ''}. Mark it done when you finish.`
      : `${splitDay.label} is on your split today. Go get it.`

    const pushed = await pushToUser(supabase, profile.id, { title, body, tag: 'gym-reminder', url: '/dashboard/gym' })

    if (pushed) {
      await supabase.from('notification_log').insert({ user_id: profile.id, type: 'gym', title, body })
      sent++
    }
  }

  return NextResponse.json({ sent })
}

