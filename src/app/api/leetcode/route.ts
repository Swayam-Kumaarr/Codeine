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

  const headers = {
    'Content-Type': 'application/json',
    'Referer': 'https://leetcode.com',
    'Origin': 'https://leetcode.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  }

  const profileQuery = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        submitStats {
          acSubmissionNum { difficulty count }
        }
        userCalendar { streak totalActiveDays }
      }
    }
  `

  const recentQuery = `
    query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        timestamp
      }
    }
  `

  const [profileRes, recentRes] = await Promise.all([
    fetch('https://leetcode.com/graphql', {
      method: 'POST', headers,
      body: JSON.stringify({ query: profileQuery, variables: { username: profile.leetcode_username } }),
    }),
    fetch('https://leetcode.com/graphql', {
      method: 'POST', headers,
      body: JSON.stringify({ query: recentQuery, variables: { username: profile.leetcode_username, limit: 10 } }),
    }),
  ])

  if (!profileRes.ok) {
    console.error('LeetCode profile API status:', profileRes.status, await profileRes.text().catch(() => ''))
    return NextResponse.json({ error: `LeetCode API failed (${profileRes.status})` }, { status: 502 })
  }

  const profileJson = await profileRes.json()
  const mu = profileJson.data?.matchedUser
  if (!mu) return NextResponse.json({ error: 'User not found on LeetCode' }, { status: 404 })

  const stats = mu.submitStats?.acSubmissionNum ?? []
  const easy   = stats.find((s: { difficulty: string }) => s.difficulty === 'Easy')?.count ?? 0
  const medium = stats.find((s: { difficulty: string }) => s.difficulty === 'Medium')?.count ?? 0
  const hard   = stats.find((s: { difficulty: string }) => s.difficulty === 'Hard')?.count ?? 0
  const total  = easy + medium + hard

  let recentSubmissions: { timestamp: number }[] = []
  if (recentRes.ok) {
    const recentJson = await recentRes.json()
    recentSubmissions = (recentJson.data?.recentAcSubmissionList ?? []).map(
      (s: { timestamp: string }) => ({ timestamp: parseInt(s.timestamp, 10) })
    )
  }

  return NextResponse.json({
    username: profile.leetcode_username,
    solved: { total, easy, medium, hard },
    streak: mu.userCalendar?.streak ?? 0,
    activeDays: mu.userCalendar?.totalActiveDays ?? 0,
    recentSubmissions,
  })
}
