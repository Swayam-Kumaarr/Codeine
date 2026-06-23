'use client'
import { useEffect } from 'react'

export default function Cursor() {
  useEffect(() => {
    const dot  = document.querySelector<HTMLElement>('.cursor-dot')
    const ring = document.querySelector<HTMLElement>('.cursor-ring')
    if (!dot || !ring) return

    let mx = window.innerWidth  / 2
    let my = window.innerHeight / 2
    let rx = mx, ry = my
    let raf: number

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
    }

    const tick = () => {
      dot.style.transform  = `translate(${mx}px,${my}px)`
      rx += (mx - rx) * 0.13
      ry += (my - ry) * 0.13
      ring.style.transform = `translate(${rx}px,${ry}px)`
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove)
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div className="cursor-dot"  aria-hidden="true" />
      <div className="cursor-ring" aria-hidden="true" />
    </>
  )
}
