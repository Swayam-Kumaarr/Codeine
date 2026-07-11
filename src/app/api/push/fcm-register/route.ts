import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const token = typeof body?.token === 'string' ? body.token.trim() : null
  if (!token) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

  await supabase.from('push_tokens').upsert(
    { user_id: user.id, token, platform: 'android' },
    { onConflict: 'user_id,token' }
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('push_tokens').delete().eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
