'use client'
import { useEffect } from 'react'

export default function CursorInit() {
  useEffect(() => {
    const d = document.createElement('div')
    d.id = 'cur-dot'
    d.setAttribute('aria-hidden', 'true')

    const r = document.createElement('div')
    r.id = 'cur-ring'
    r.setAttribute('aria-hidden', 'true')

    document.body.appendChild(d)
    document.body.appendChild(r)

    let mx = -200, my = -200, rx = -200, ry = -200, started = false

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
      if (!started) {
        started = true
        rx = mx; ry = my
        d.style.opacity = '1'
        r.style.opacity = '0.35'
      }
    }

    window.addEventListener('mousemove', onMove)

    let rafId: number
    const tick = () => {
      d.style.transform = `translate(${mx}px,${my}px)`
      rx += (mx - rx) * 0.13
      ry += (my - ry) * 0.13
      r.style.transform = `translate(${rx}px,${ry}px)`
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
      d.remove()
      r.remove()
    }
  }, [])

  return null
}
