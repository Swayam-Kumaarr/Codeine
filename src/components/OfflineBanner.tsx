'use client'
import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (!offline) return null

  return (
    <div style={{
      position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '10px 18px',
      background: 'var(--ink)', color: 'var(--bg)',
      borderRadius: 'var(--r)',
      fontSize: '13px', fontWeight: 500,
      zIndex: 9999,
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      fontFamily: 'var(--font-body)',
    }}>
      <WifiOff size={14} />
      You&apos;re offline — changes may not save
    </div>
  )
}
