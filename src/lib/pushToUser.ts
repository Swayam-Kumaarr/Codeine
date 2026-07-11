import webpush from 'web-push'
import { sendFCM } from './fcm'
import type { SupabaseClient } from '@supabase/supabase-js'

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  vapidConfigured = true
}

export interface NotifPayload {
  title: string
  body: string
  tag?: string
  url?: string
}

export async function pushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: NotifPayload
): Promise<boolean> {
  ensureVapid()
  let sent = false

  const { data: sub } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)
    .single()

  if (sub?.subscription) {
    try {
      await webpush.sendNotification(sub.subscription, JSON.stringify({
        title: payload.title,
        body: payload.body,
        tag: payload.tag,
        url: payload.url ?? '/dashboard',
      }))
      sent = true
    } catch {}
  }

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)

  for (const t of tokens ?? []) {
    await sendFCM(t.token, { title: payload.title, body: payload.body, url: payload.url })
    sent = true
  }

  return sent
}

export async function getAllNotifiableUserIds(supabase: SupabaseClient): Promise<string[]> {
  const [{ data: subUsers }, { data: tokenUsers }] = await Promise.all([
    supabase.from('push_subscriptions').select('user_id'),
    supabase.from('push_tokens').select('user_id'),
  ])
  return [...new Set([
    ...(subUsers ?? []).map((s: { user_id: string }) => s.user_id),
    ...(tokenUsers ?? []).map((t: { user_id: string }) => t.user_id),
  ])]
}
