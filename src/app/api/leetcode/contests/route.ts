import { NextResponse } from 'next/server'

// Fetch upcoming LeetCode contests via public GraphQL API
export async function GET() {
  try {
    const query = `
      query {
        allContests {
          title
          titleSlug
          startTime
          duration
          originStartTime
        }
      }
    `
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
      body: JSON.stringify({ query }),
      next: { revalidate: 3600 },
    })

    if (!res.ok) return NextResponse.json({ contests: [] })

    const json = await res.json()
    const all = (json.data?.allContests ?? []) as Array<{ title: string; titleSlug: string; startTime: number; duration: number }>

    const now = Math.floor(Date.now() / 1000)
    const upcoming = all
      .filter(c => c.startTime > now - 3600) // include ongoing (started <1h ago)
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 4)

    return NextResponse.json({ contests: upcoming })
  } catch {
    return NextResponse.json({ contests: [] })
  }
}
