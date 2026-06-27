'use client'
import { useCallback, useEffect, useRef } from 'react'
import gsap from 'gsap'
import './Cubes.css'

interface CellGap { col?: number; row?: number }

interface CubesProps {
  gridSize?: number
  cubeSize?: number
  maxAngle?: number
  radius?: number
  easing?: string
  duration?: { enter: number; leave: number }
  cellGap?: number | CellGap
  borderStyle?: string
  faceColor?: string
  shadow?: boolean | string
  autoAnimate?: boolean
  rippleOnClick?: boolean
  rippleColor?: string
  rippleSpeed?: number
  listenOnWindow?: boolean
  style?: React.CSSProperties
}

export default function Cubes({
  gridSize = 10,
  cubeSize,
  maxAngle = 45,
  radius = 3,
  easing = 'power3.out',
  duration = { enter: 0.3, leave: 0.6 },
  cellGap,
  borderStyle = '1px solid #fff',
  faceColor = '#120F17',
  shadow = false,
  autoAnimate = true,
  rippleOnClick = true,
  rippleColor = '#fff',
  rippleSpeed = 2,
  listenOnWindow = false,
  style,
}: CubesProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userActiveRef = useRef(false)
  const simPosRef = useRef({ x: 0, y: 0 })
  const simTargetRef = useRef({ x: 0, y: 0 })
  const simRAFRef = useRef<number | null>(null)

  const colGap = typeof cellGap === 'number' ? `${cellGap}px` : (cellGap as CellGap)?.col !== undefined ? `${(cellGap as CellGap).col}px` : '5%'
  const rowGap = typeof cellGap === 'number' ? `${cellGap}px` : (cellGap as CellGap)?.row !== undefined ? `${(cellGap as CellGap).row}px` : '5%'

  const enterDur = duration.enter
  const leaveDur = duration.leave

  const tiltAt = useCallback((rowCenter: number, colCenter: number) => {
    if (!sceneRef.current) return
    sceneRef.current.querySelectorAll<HTMLElement>('.cube').forEach(cube => {
      const r = +cube.dataset.row!
      const c = +cube.dataset.col!
      const dist = Math.hypot(r - rowCenter, c - colCenter)
      if (dist <= radius) {
        const pct = 1 - dist / radius
        const angle = pct * maxAngle
        gsap.to(cube, { duration: enterDur, ease: easing, overwrite: true, rotateX: -angle, rotateY: angle })
      } else {
        gsap.to(cube, { duration: leaveDur, ease: 'power3.out', overwrite: true, rotateX: 0, rotateY: 0 })
      }
    })
  }, [radius, maxAngle, enterDur, leaveDur, easing])

  const resetAll = useCallback(() => {
    if (!sceneRef.current) return
    sceneRef.current.querySelectorAll<HTMLElement>('.cube').forEach(cube =>
      gsap.to(cube, { duration: leaveDur, rotateX: 0, rotateY: 0, ease: 'power3.out' })
    )
  }, [leaveDur])

  const onPointerMove = useCallback((e: PointerEvent) => {
    userActiveRef.current = true
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    const rect = sceneRef.current!.getBoundingClientRect()
    const colCenter = (e.clientX - rect.left) / (rect.width / gridSize)
    const rowCenter = (e.clientY - rect.top) / (rect.height / gridSize)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => tiltAt(rowCenter, colCenter))
    idleTimerRef.current = setTimeout(() => { userActiveRef.current = false }, 3000)
  }, [gridSize, tiltAt])

  const onTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    userActiveRef.current = true
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    const rect = sceneRef.current!.getBoundingClientRect()
    const touch = e.touches[0]
    const colCenter = (touch.clientX - rect.left) / (rect.width / gridSize)
    const rowCenter = (touch.clientY - rect.top) / (rect.height / gridSize)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => tiltAt(rowCenter, colCenter))
    idleTimerRef.current = setTimeout(() => { userActiveRef.current = false }, 3000)
  }, [gridSize, tiltAt])

  const onTouchStart = useCallback(() => { userActiveRef.current = true }, [])
  const onTouchEnd = useCallback(() => { resetAll() }, [resetAll])

  const onClick = useCallback((e: MouseEvent) => {
    if (!rippleOnClick || !sceneRef.current) return
    const rect = sceneRef.current.getBoundingClientRect()
    const cellW = rect.width / gridSize
    const cellH = rect.height / gridSize
    const colHit = Math.floor((e.clientX - rect.left) / cellW)
    const rowHit = Math.floor((e.clientY - rect.top) / cellH)

    const spreadDelay = 0.15 / rippleSpeed
    const animDuration = 0.3 / rippleSpeed
    const holdTime = 0.6 / rippleSpeed

    const rings: Record<number, HTMLElement[]> = {}
    sceneRef.current.querySelectorAll<HTMLElement>('.cube').forEach(cube => {
      const r = +cube.dataset.row!
      const c = +cube.dataset.col!
      const ring = Math.round(Math.hypot(r - rowHit, c - colHit))
      if (!rings[ring]) rings[ring] = []
      rings[ring].push(cube)
    })

    Object.keys(rings).map(Number).sort((a, b) => a - b).forEach(ring => {
      const delay = ring * spreadDelay
      const faces = rings[ring].flatMap(cube => Array.from(cube.querySelectorAll<HTMLElement>('.cube-face')))
      gsap.to(faces, { backgroundColor: rippleColor, duration: animDuration, delay, ease: 'power3.out' })
      gsap.to(faces, { backgroundColor: faceColor, duration: animDuration, delay: delay + animDuration + holdTime, ease: 'power3.out' })
    })
  }, [rippleOnClick, gridSize, faceColor, rippleColor, rippleSpeed])

  useEffect(() => {
    if (!autoAnimate || !sceneRef.current) return
    simPosRef.current = { x: Math.random() * gridSize, y: Math.random() * gridSize }
    simTargetRef.current = { x: Math.random() * gridSize, y: Math.random() * gridSize }
    const speed = 0.02
    const loop = () => {
      if (!userActiveRef.current) {
        const pos = simPosRef.current
        const tgt = simTargetRef.current
        pos.x += (tgt.x - pos.x) * speed
        pos.y += (tgt.y - pos.y) * speed
        tiltAt(pos.y, pos.x)
        if (Math.hypot(pos.x - tgt.x, pos.y - tgt.y) < 0.1) {
          simTargetRef.current = { x: Math.random() * gridSize, y: Math.random() * gridSize }
        }
      }
      simRAFRef.current = requestAnimationFrame(loop)
    }
    simRAFRef.current = requestAnimationFrame(loop)
    return () => { if (simRAFRef.current != null) cancelAnimationFrame(simRAFRef.current) }
  }, [autoAnimate, gridSize, tiltAt])

  useEffect(() => {
    const el = sceneRef.current
    if (!el) return
    const target = listenOnWindow ? window : el
    target.addEventListener('pointermove', onPointerMove as EventListener)
    target.addEventListener('click', onClick as EventListener)
    target.addEventListener('touchmove', onTouchMove as EventListener, { passive: false })
    target.addEventListener('touchstart', onTouchStart as EventListener, { passive: true })
    target.addEventListener('touchend', onTouchEnd as EventListener, { passive: true })
    if (!listenOnWindow) {
      el.addEventListener('pointerleave', resetAll)
    }
    return () => {
      target.removeEventListener('pointermove', onPointerMove as EventListener)
      target.removeEventListener('click', onClick as EventListener)
      target.removeEventListener('touchmove', onTouchMove as EventListener)
      target.removeEventListener('touchstart', onTouchStart as EventListener)
      target.removeEventListener('touchend', onTouchEnd as EventListener)
      if (!listenOnWindow) el.removeEventListener('pointerleave', resetAll)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [listenOnWindow, onPointerMove, resetAll, onClick, onTouchMove, onTouchStart, onTouchEnd])

  const cells = Array.from({ length: gridSize })
  const sceneStyle = {
    gridTemplateColumns: cubeSize ? `repeat(${gridSize}, ${cubeSize}px)` : `repeat(${gridSize}, 1fr)`,
    gridTemplateRows: cubeSize ? `repeat(${gridSize}, ${cubeSize}px)` : `repeat(${gridSize}, 1fr)`,
    columnGap: colGap,
    rowGap: rowGap,
  }
  const wrapperStyle = {
    '--cube-face-border': borderStyle,
    '--cube-face-bg': faceColor,
    '--cube-face-shadow': shadow === true ? '0 0 6px rgba(0,0,0,.5)' : shadow || 'none',
    ...(cubeSize ? { width: `${gridSize * cubeSize}px`, height: `${gridSize * cubeSize}px` } : {}),
  } as React.CSSProperties

  return (
    <div className="default-animation" style={{ ...wrapperStyle, ...style }}>
      <div ref={sceneRef} className="default-animation--scene" style={sceneStyle}>
        {cells.map((_, r) =>
          cells.map((__, c) => (
            <div key={`${r}-${c}`} className="cube" data-row={r} data-col={c}>
              <div className="cube-face cube-face--top" />
              <div className="cube-face cube-face--bottom" />
              <div className="cube-face cube-face--left" />
              <div className="cube-face cube-face--right" />
              <div className="cube-face cube-face--front" />
              <div className="cube-face cube-face--back" />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
