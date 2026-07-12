'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Settings, LogOut, Zap, BookOpen, CalendarDays, AlertCircle, Map, Dumbbell, GitBranch, GraduationCap, Lightbulb, Trophy, Clock, PenLine, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile, invalidateProfileCache } from '@/lib/hooks/useProfile'
import { useEffect, useState } from 'react'
import { useFCMRegistration } from '@/lib/capacitor/useFCMRegistration'

const NAV_GROUPS = [
  {
    label: 'Learning',
    items: [
      { href: '/dashboard', label: 'Today', icon: Zap },
      { href: '/dashboard/roadmaps', label: 'Roadmaps', icon: Map },
      { href: '/dashboard/upcoming', label: 'Upcoming', icon: CalendarDays },
      { href: '/dashboard/pending', label: 'Pending', icon: AlertCircle },
      { href: '/dashboard/leetcode', label: 'LeetCode', icon: Trophy },
    ],
  },
  {
    label: 'College',
    items: [
      { href: '/dashboard/syllabus', label: 'Syllabus', icon: BookOpen },
      { href: '/dashboard/timetable', label: 'Timetable', icon: Clock },
      { href: '/dashboard/cgpa', label: 'CGPA', icon: GraduationCap },
    ],
  },
  {
    label: 'Personal',
    items: [
      { href: '/dashboard/gym', label: 'Gym', icon: Dumbbell },
      { href: '/dashboard/journal', label: 'Journal', icon: PenLine },
      { href: '/dashboard/ideas', label: 'Ideas', icon: Lightbulb },
      { href: '/dashboard/achievements', label: 'Achievements', icon: Trophy },
    ],
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, reload } = useProfile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  useFCMRegistration()

  // Fire login streak at most once per calendar day
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const key = 'codeine_streak_date'
    if (localStorage.getItem(key) === today) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      await supabase.rpc('update_login_streak', { p_user_id: user.id })
      localStorage.setItem(key, today)
      reload()
    })
  }, [reload])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    invalidateProfileCache()
    router.push('/')
    router.refresh()
  }

  const xpInLevel = (profile?.xp ?? 0) % 500
  const xpPct = (xpInLevel / 500) * 100

  const BOTTOM_NAV = [
    { href: '/dashboard', label: 'Today', icon: Zap },
    { href: '/dashboard/roadmaps', label: 'Roadmaps', icon: Map },
    { href: '/dashboard/upcoming', label: 'Upcoming', icon: CalendarDays },
    { href: '/dashboard/syllabus', label: 'Syllabus', icon: BookOpen },
    { href: '/dashboard/settings', label: 'More', icon: Menu },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', flexDirection: 'column' }}>

      {/* Mobile header */}
      <div className="dash-mobile-header" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg)', borderBottom: '1px solid var(--line)',
        padding: '12px 16px', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <p style={{ fontFamily: 'var(--font-head)', fontSize: '17px', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Codeine</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>{profile?.xp ?? 0} XP · Lvl {profile?.level ?? 1}</span>
          <button onClick={() => setMobileMenuOpen(o => !o)} style={{ background: 'none', border: 'none', color: 'var(--ink)', display: 'flex', alignItems: 'center' }}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile full menu drawer */}
      {mobileMenuOpen && (
        <div className="dash-mobile-header" style={{
          position: 'fixed', inset: 0, top: '49px', zIndex: 99,
          background: 'var(--bg)', overflowY: 'auto', padding: '16px',
          flexDirection: 'column', gap: '4px',
        }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', paddingLeft: '12px', marginBottom: '4px' }}>{group.label}</p>
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                    borderRadius: 'var(--r)', fontSize: '15px', fontWeight: active ? 500 : 400,
                    color: active ? 'var(--ink)' : 'var(--ink-2)',
                    background: active ? 'var(--bg-hover)' : 'transparent', textDecoration: 'none',
                  }}>
                    <Icon size={16} />{label}
                  </Link>
                )
              })}
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
            <Link href="/dashboard/notifications" onClick={() => setMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: 'var(--r)', fontSize: '15px', color: 'var(--ink-2)', textDecoration: 'none' }}>
              <Bell size={16} /> Notifications
            </Link>
            <Link href="/dashboard/settings" onClick={() => setMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: 'var(--r)', fontSize: '15px', color: 'var(--ink-2)', textDecoration: 'none' }}>
              <Settings size={16} /> Settings
            </Link>
            <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: 'var(--r)', fontSize: '15px', color: 'var(--ink-2)', background: 'none', border: 'none', width: '100%', fontFamily: 'var(--font-body)', textAlign: 'left' }}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <aside className="dash-sidebar" style={{
        width: '220px', flexShrink: 0,
        borderRight: '1px solid var(--line)',
        position: 'sticky', top: 0, height: '100vh',
        display: 'flex', flexDirection: 'column',
        padding: '28px 16px', overflowY: 'auto',
      }}>
        <p style={{ fontFamily: 'var(--font-head)', fontSize: '17px', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)', marginBottom: '28px', paddingLeft: '4px' }}>
          Codeine
        </p>

        {/* XP bar */}
        <div style={{ background: 'var(--bg-panel)', borderRadius: 'var(--r)', padding: '14px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Lvl {profile?.level ?? 1}</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>{profile?.xp ?? 0} XP</span>
          </div>
          <div style={{ height: '3px', background: 'var(--line-strong)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--ink)', width: `${xpPct}%`, transition: 'width 0.6s ease', borderRadius: '2px' }} />
          </div>
          <p style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '6px' }}>{500 - xpInLevel} XP to next level</p>
        </div>

        {/* Dual streaks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
          {/* Login streak */}
          <div style={{ background: 'var(--bg-panel)', borderRadius: 'var(--r)', padding: '12px 10px' }}>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--ink)' }}>
              {profile?.login_streak ?? 0}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--ink-3)', marginTop: '4px', lineHeight: 1.3 }}>📅 login<br/>streak</p>
          </div>
          {/* Task streak */}
          <div style={{ background: 'var(--bg-panel)', borderRadius: 'var(--r)', padding: '12px 10px' }}>
            <p style={{ fontFamily: 'var(--font-head)', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--ink)' }}>
              {profile?.streak ?? 0}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--ink-3)', marginTop: '4px', lineHeight: 1.3 }}>🔥 all tasks<br/>streak</p>
          </div>
        </div>

        {/* Main nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', paddingLeft: '12px', marginBottom: '4px' }}>
                {group.label}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                  return (
                    <Link key={href} href={href} aria-current={active ? 'page' : undefined} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 12px', borderRadius: 'var(--r)',
                      fontSize: '13px', fontWeight: active ? 500 : 400,
                      color: active ? 'var(--ink)' : 'var(--ink-2)',
                      background: active ? 'var(--bg-hover)' : 'transparent',
                      textDecoration: 'none', transition: 'background 0.15s ease',
                    }}>
                      <Icon size={14} />
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom links */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <Link href="/dashboard/notifications" style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 12px', borderRadius: 'var(--r)', fontSize: '13px',
            color: pathname === '/dashboard/notifications' ? 'var(--ink)' : 'var(--ink-2)',
            background: pathname === '/dashboard/notifications' ? 'var(--bg-hover)' : 'transparent',
            textDecoration: 'none',
          }}>
            <Bell size={15} /> Notifications
          </Link>
          {profile?.github_username && (
            <a
              href={`https://github.com/${profile.github_username}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--ink-2)', textDecoration: 'none' }}
            >
              <GitBranch size={15} /> GitHub ↗
            </a>
          )}
          <Link href="/dashboard/settings" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--ink-2)', textDecoration: 'none' }}>
            <Settings size={15} /> Settings
          </Link>
          <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--ink-2)', background: 'none', border: 'none', width: '100%', fontFamily: 'var(--font-body)', textAlign: 'left' }}>
            <LogOut size={15} /> Sign out
          </button>
          {profile && (
            <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: 'var(--r)', background: 'var(--bg-panel)' }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>{profile.name}</p>
              {profile.github_username && <p style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }}>@{profile.github_username}</p>}
            </div>
          )}
        </div>
      </aside>

      <main id="main-content" className="dash-main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflowX: 'hidden' }}>
        {children}
      </main>
      </div>

      {/* Bottom nav for mobile */}
      <nav className="dash-bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--bg)', borderTop: '1px solid var(--line)',
        padding: '8px 0 env(safe-area-inset-bottom, 8px)',
        justifyContent: 'space-around', alignItems: 'center',
      }}>
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && href !== '/dashboard/settings' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              textDecoration: 'none', padding: '4px 8px',
              color: active ? 'var(--ink)' : 'var(--ink-3)',
            }}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: '9px', fontWeight: active ? 600 : 400, letterSpacing: '0.04em' }}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
