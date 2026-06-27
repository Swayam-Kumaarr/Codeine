'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ALL_ROADMAPS, getDayNumber, getCurrentTopic } from '@/data/roadmaps'
import { invalidateProfileCache } from './useProfile'

export interface Task {
  id: string
  roadmap_id: string | null
  topic_number: number | null
  title: string
  description: string | null
  scheduled_date: string
  done: boolean
  xp_value: number
}

export function useTodaysTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const generating = useRef(false)

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    if (generating.current) return
    generating.current = true
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Ensure today's tasks exist — generate from journeys if needed
    const { data: journeys } = await supabase
      .from('journeys')
      .select('*')
      .eq('user_id', user.id)

    if (journeys?.length) {
      const { data: existing } = await supabase
        .from('tasks')
        .select('roadmap_id')
        .eq('user_id', user.id)
        .eq('scheduled_date', today)
        .not('roadmap_id', 'is', null)

      const existingRoadmaps = new Set((existing || []).map(t => t.roadmap_id))

      for (const journey of journeys) {
        if (existingRoadmaps.has(journey.roadmap_id)) continue

        const roadmap = ALL_ROADMAPS.find(r => r.id === journey.roadmap_id)
        if (!roadmap) continue

        const dayNum = getDayNumber(journey.started_at)
        const result = getCurrentTopic(roadmap, dayNum)
        if (!result) continue

        const { topic, dayWithinTopic } = result
        const schedEntry = topic.schedule.find(s => {
          const [start, end] = s.days.includes('-')
            ? s.days.split('-').map(Number)
            : [Number(s.days), Number(s.days)]
          return dayWithinTopic >= start && dayWithinTopic <= end
        })

        await supabase.from('tasks').insert({
          user_id: user.id,
          roadmap_id: journey.roadmap_id,
          topic_number: topic.number,
          title: `${topic.name} — ${schedEntry?.activity ?? 'Study'}`,
          description: `Day ${dayNum} · ${topic.name} · ${schedEntry?.activity ?? ''}`,
          scheduled_date: today,
          xp_value: 30,
        })
      }
    }

    // Fetch all tasks for today
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('scheduled_date', today)
      .order('created_at', { ascending: true })

    setTasks(data ?? [])
    setLoading(false)
    generating.current = false
  }, [today])

  useEffect(() => { load() }, [load])

  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  const markDone = useCallback(async (taskId: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const task = tasksRef.current.find(t => t.id === taskId)
    if (!task) return

    const newDone = !task.done
    await supabase.from('tasks').update({
      done: newDone,
      done_at: newDone ? new Date().toISOString() : null,
    }).eq('id', taskId)

    if (newDone) {
      // Award XP
      await supabase.rpc('award_xp', { p_user_id: user.id, p_xp: task.xp_value, p_reason: `Completed: ${task.title}` }).maybeSingle()

      // Update streak log — increment tasks_done rather than hardcode 1
      const { data: existing } = await supabase
        .from('streak_log')
        .select('tasks_done')
        .eq('user_id', user.id)
        .eq('log_date', task.scheduled_date)
        .maybeSingle()
      await supabase.from('streak_log').upsert({
        user_id: user.id,
        log_date: task.scheduled_date,
        tasks_done: (existing?.tasks_done ?? 0) + 1,
      }, { onConflict: 'user_id,log_date' })

      // Update streak + last_active on profile
      await supabase.rpc('update_streak', { p_user_id: user.id }).maybeSingle()
      invalidateProfileCache()
    }

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: newDone } : t))
  }, [])

  return { tasks, loading, markDone, reload: load }
}
