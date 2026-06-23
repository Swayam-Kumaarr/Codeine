'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Profile {
  id: string
  name: string
  github_username: string | null
  leetcode_username: string | null
  streak: number       // all-tasks-done streak
  login_streak: number // daily login streak
  xp: number
  level: number
  last_active: string | null
  last_login: string | null
  onboarded: boolean
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
    setLoading(false)
  }

  useEffect(() => { fetchProfile() }, [])

  return { profile, loading, reload: fetchProfile }
}
