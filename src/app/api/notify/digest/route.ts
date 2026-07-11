import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pushToUser, getAllNotifiableUserIds } from '@/lib/pushToUser'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
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

    const body = count
      ? `You have ${count} task${count !== 1 ? 's' : ''} scheduled today. Let's get it.`
      : 'No tasks scheduled today. Take a rest or add something new.'

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
