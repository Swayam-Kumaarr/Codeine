'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Profile {
  id: string
  name: string
  github_username: string | null
  leetcode_username: string | null
  study_time: string | null
  streak: number
  login_streak: number
  xp: number
  level: number
  last_active: string | null
  last_login: string | null
  onboarded: boolean
  created_at: string
}

// Module-level cache so navigating between pages doesn't refetch
let _cached: Profile | null = null
let _cacheTs = 0
const CACHE_TTL = 30_000

export function invalidateProfileCache() {
  _cached = null
  _cacheTs = 0
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('codeine:profile-stale'))
  }
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(_cached)
  const [loading, setLoading] = useState(_cached === null)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async (force = false) => {
    if (!force && _cached && Date.now() - _cacheTs < CACHE_TTL) {
      setProfile(_cached)
      setLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data, error: err } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (err) throw err
      _cached = data
      _cacheTs = Date.now()
      setProfile(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  const reload = useCallback(() => {
    _cached = null
    _cacheTs = 0
    setLoading(true)
    fetchProfile(true)
  }, [fetchProfile])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  useEffect(() => {
    const handler = () => fetchProfile(true)
    window.addEventListener('codeine:profile-stale', handler)
    return () => window.removeEventListener('codeine:profile-stale', handler)
  }, [fetchProfile])

  return { profile, loading, error, reload }
}
