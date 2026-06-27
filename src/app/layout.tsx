import type { Metadata, Viewport } from 'next'
import './globals.css'
import PushSetup from '@/components/PushSetup'
import CursorInit from '@/components/CursorInit'
import OfflineBanner from '@/components/OfflineBanner'

export const metadata: Metadata = {
  title: 'Codeine — Level up your coding life',
  description: 'Daily timetable, roadmaps, and streak tracker built for CS students.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Codeine' },
}

export const viewport: Viewport = {
  themeColor: '#1A1714',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=cabinet-grotesk@400,500,600,700,800&display=swap"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <CursorInit />
        <PushSetup />
        <OfflineBanner />
        {children}
      </body>
    </html>
  )
}
