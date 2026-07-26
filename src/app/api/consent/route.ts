import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    // Always derive user identity from the session, never from the request body
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json()
    const { email, consents } = body as {
      email: string
      consents: Array<{ type: 'terms_and_conditions' | 'privacy_policy' | 'marketing_emails'; accepted: boolean }>
    }

    if (!email || !consents?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'
    const userAgent = req.headers.get('user-agent') ?? 'unknown'

    const rows = consents.map(c => ({
      user_id: user?.id ?? null,
      email,
      consent_type: c.type,
      accepted: c.accepted,
      ip_address: ip,
      user_agent: userAgent,
      tc_version: '1.0',
      pp_version: '1.0',
    }))

    const { error } = await serviceClient.from('consent_log').insert(rows)
    if (error) {
      console.error('consent_log insert error:', error)
      return NextResponse.json({ error: 'Failed to record consent' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('consent route error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
