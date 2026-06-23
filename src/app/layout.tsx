import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PushSetup from '@/components/PushSetup'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'], variable: '--inter' })

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
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=cabinet-grotesk@400,500,600,700,800&display=swap"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <div id="cur-dot"  aria-hidden="true" suppressHydrationWarning style={{transform:'translate(-200px,-200px)'}} />
        <div id="cur-ring" aria-hidden="true" suppressHydrationWarning style={{transform:'translate(-200px,-200px)'}} />
        <Script id="cursor-init" strategy="afterInteractive">{`
          (function(){
            var d=document.getElementById('cur-dot');
            var r=document.getElementById('cur-ring');
            if(!d||!r)return;
            var mx=-200,my=-200,rx=-200,ry=-200;
            window.addEventListener('mousemove',function(e){
              mx=e.clientX; my=e.clientY;
            });
            (function tick(){
              d.style.transform='translate('+mx+'px,'+my+'px)';
              rx+=(mx-rx)*.13; ry+=(my-ry)*.13;
              r.style.transform='translate('+rx+'px,'+ry+'px)';
              requestAnimationFrame(tick);
            })();
          })();
        `}</Script>
        <PushSetup />
        {children}
      </body>
    </html>
  )
}
