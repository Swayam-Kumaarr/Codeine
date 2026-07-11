import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { pushToUser, getAllNotifiableUserIds } from '@/lib/pushToUser'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const userIds = await getAllNotifiableUserIds(supabase)
  if (!userIds.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const user_id of userIds) {
    // Check notification prefs
    const { data: prefs } = await supabase
      .from('notification_prefs')
      .select('roadmap_daily')
      .eq('user_id', user_id)
      .single()
    if (prefs && !prefs.roadmap_daily) continue

    // Tasks are generated lazily on app open — check journeys instead
    // so the message is accurate even before user opens the app today
    const { count: journeyCount } = await supabase
      .from('journeys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .is('paused_at', null)

    // Also check for any manually-added tasks for today
    const { count: manualCount } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('scheduled_date', today)
      .is('roadmap_id', null)

    const total = (journeyCount ?? 0) + (manualCount ?? 0)

    const body = total > 0
      ? `${journeyCount ? `${journeyCount} roadmap task${journeyCount !== 1 ? 's' : ''}` : ''}${journeyCount && manualCount ? ' + ' : ''}${manualCount ? `${manualCount} custom task${manualCount !== 1 ? 's' : ''}` : ''} waiting today. Open Codeine and get it done.`
      : 'No tasks today — good time to add something new or start a roadmap.'

    const pushed = await pushToUser(supabase, user_id, {
      title: '☀️ Good morning — Codeine',
      body,
      tag: 'morning-digest',
      url: '/dashboard',
    })
    if (pushed) sent++
  }

  return NextResponse.json({ sent })
}

export { POST as GET }
