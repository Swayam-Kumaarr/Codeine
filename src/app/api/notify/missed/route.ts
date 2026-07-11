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
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('scheduled_date', today)
      .eq('done', false)

    if (!count || count === 0) continue

    const pushed = await pushToUser(supabase, user_id, {
      title: '⚠️ Tasks still pending',
      body: `${count} task${count !== 1 ? 's' : ''} not done yet today. Your streak is at risk.`,
      tag: 'missed-alert',
      url: '/dashboard',
    })
    if (pushed) sent++
  }

  return NextResponse.json({ sent })
}

export { POST as GET }
