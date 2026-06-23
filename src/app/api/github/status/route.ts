import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('github_username')
    .eq('id', user.id)
    .single()

  if (!profile?.github_username) return NextResponse.json({ error: 'No GitHub username' }, { status: 400 })

  try {
    const res = await fetch(
      `https://api.github.com/users/${profile.github_username}/events/public?per_page=20`,
      { headers: { 'User-Agent': 'Codeine-App' }, next: { revalidate: 300 } }
    )
    if (!res.ok) return NextResponse.json({ error: 'GitHub API failed' }, { status: 502 })

    const events = await res.json()
    const pushEvents = events.filter((e: { type: string }) => e.type === 'PushEvent')
    const lastEvent = pushEvents[0]

    if (!lastEvent) return NextResponse.json({ username: profile.github_username, daysAgo: 99, lastCommit: null })

    const lastDate = new Date(lastEvent.created_at as string)
    const now = new Date()
    const daysAgo = Math.floor((now.getTime() - lastDate.getTime()) / 86400000)
    const lastCommit = daysAgo === 0
      ? 'today'
      : daysAgo === 1
        ? 'yesterday'
        : `${daysAgo} days ago`

    return NextResponse.json({ username: profile.github_username, daysAgo, lastCommit })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 502 })
  }
}
