'use client'
import { useEffect } from 'react'

export function useFCMRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    if (!cap?.isNativePlatform?.()) return

    let cleanup: (() => void) | null = null

    async function register() {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')

        const perm = await PushNotifications.checkPermissions()
        if (perm.receive !== 'granted') {
          const req = await PushNotifications.requestPermissions()
          if (req.receive !== 'granted') return
        }

        await PushNotifications.register()

        // Save / refresh token on every app open
        await PushNotifications.addListener('registration', async (fcmToken) => {
          try {
            await fetch('/api/push/fcm-register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: fcmToken.value }),
            })
          } catch {}
        })

        // Show notifications while the app is in the foreground
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          // Capacitor doesn't auto-display notifications when app is foreground;
          // we surface them as a browser Notification so they still appear.
          if (Notification.permission === 'granted') {
            new Notification(notification.title ?? 'Codeine', {
              body: notification.body ?? '',
              icon: '/icons/icon-192.png',
              tag: (notification.data as { tag?: string })?.tag ?? 'codeine',
            })
          }
        })

        // Tap on notification — navigate to the URL in the payload
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const url = (action.notification.data as { url?: string })?.url
          if (url) window.location.href = url
        })

        cleanup = () => {
          PushNotifications.removeAllListeners().catch(() => {})
        }
      } catch {}
    }

    register()
    return () => { cleanup?.() }
  }, [])
}
