import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// LeetCode public GraphQL API
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('leetcode_username')
    .eq('id', user.id)
    .single()

  if (!profile?.leetcode_username) return NextResponse.json({ error: 'No LeetCode username set' }, { status: 400 })

  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        submitStats {
          acSubmissionNum {
            difficulty
            count
          }
        }
        userCalendar {
          streak
          totalActiveDays
        }
        recentAcSubmissionList(limit: 10) {
          timestamp
        }
      }
    }
  `

  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'https://leetcode.com',
      'Origin': 'https://leetcode.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({ query, variables: { username: profile.leetcode_username } }),
  })

  if (!res.ok) {
    console.error('LeetCode API status:', res.status, await res.text().catch(() => ''))
    return NextResponse.json({ error: `LeetCode API failed (${res.status})` }, { status: 502 })
  }

  const json = await res.json()
  const mu = json.data?.matchedUser
  if (!mu) return NextResponse.json({ error: 'User not found on LeetCode' }, { status: 404 })

  const stats = mu.submitStats?.acSubmissionNum ?? []
  const easy   = stats.find((s: { difficulty: string }) => s.difficulty === 'Easy')?.count ?? 0
  const medium = stats.find((s: { difficulty: string }) => s.difficulty === 'Medium')?.count ?? 0
  const hard   = stats.find((s: { difficulty: string }) => s.difficulty === 'Hard')?.count ?? 0
  const total  = easy + medium + hard

  const recentSubmissions = (mu.recentAcSubmissionList ?? []).map(
    (s: { timestamp: string }) => ({ timestamp: parseInt(s.timestamp, 10) })
  )

  return NextResponse.json({
    username: profile.leetcode_username,
    solved: { total, easy, medium, hard },
    streak: mu.userCalendar?.streak ?? 0,
    activeDays: mu.userCalendar?.totalActiveDays ?? 0,
    recentSubmissions,
  })
}
