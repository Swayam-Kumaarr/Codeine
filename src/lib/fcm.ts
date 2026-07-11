import { getApps, initializeApp, cert, App } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

let _app: App | null = null

function getApp(): App | null {
  if (_app) return _app
  const existing = getApps()
  if (existing.length) { _app = existing[0]; return _app }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null
  try {
    _app = initializeApp({ credential: cert(JSON.parse(raw)) })
    return _app
  } catch {
    return null
  }
}

export async function sendFCM(token: string, payload: { title: string; body: string; url?: string }) {
  const app = getApp()
  if (!app) return
  try {
    await getMessaging(app).send({
      token,
      notification: { title: payload.title, body: payload.body },
      data: { url: payload.url ?? '/dashboard' },
      android: { priority: 'high' },
    })
  } catch {}
}
