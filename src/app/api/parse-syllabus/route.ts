import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported image type. Use JPEG, PNG, WebP or GIF.' }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image too large. Maximum size is 5 MB.' }, { status: 413 })
  }

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: file.type, data: base64 },
          },
          {
            type: 'text',
            text: `This is a college course syllabus or course outline image. Extract ALL topics and their subtopics.

Return ONLY a JSON array — no explanation, no markdown, no code block. Just the raw JSON array:
[{"name": "Topic Name Here", "subtopics": ["Subtopic 1", "Subtopic 2"]}, ...]

Rules:
- Each main topic/chapter/unit becomes an object with "name"
- Subtopics, bullets, or sub-items under a topic go into its "subtopics" array
- If a topic has no subtopics, use []
- Extract ALL visible content — don't skip anything
- Clean up numbering (remove "1.", "1.1", "Unit I:" prefixes) — keep just the name`,
          },
        ],
      }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `Anthropic API error: ${err}` }, { status: 502 })
  }

  const json = await res.json()
  const text = json.content?.[0]?.text ?? ''

  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return NextResponse.json({ error: 'Could not extract topic list from image' }, { status: 500 })

  try {
    const topics = JSON.parse(match[0]) as { name: string; subtopics: string[] }[]
    return NextResponse.json({ topics })
  } catch {
    return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 })
  }
}
