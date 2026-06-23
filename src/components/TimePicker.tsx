'use client'
import { useRef, useEffect, useCallback } from 'react'

const ITEM_H = 52
const VISIBLE = 5

function Drum({
  items,
  value,
  onChange,
  width = 72,
}: {
  items: string[]
  value: string
  onChange: (v: string) => void
  width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const idx = items.indexOf(value)
    if (ref.current && idx >= 0) {
      ref.current.scrollTop = idx * ITEM_H
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onScroll = useCallback(() => {
    if (!ref.current) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (!ref.current) return
      const idx = Math.round(ref.current.scrollTop / ITEM_H)
      const clamped = Math.max(0, Math.min(idx, items.length - 1))
      ref.current.scrollTop = clamped * ITEM_H
      onChange(items[clamped])
    }, 80)
  }, [items, onChange])

  return (
    <div style={{ position: 'relative', height: ITEM_H * VISIBLE, width }}>
      {/* selected-row highlight */}
      <div
        style={{
          position: 'absolute', left: 4, right: 4,
          top: ITEM_H * 2, height: ITEM_H,
          background: 'var(--ink)', borderRadius: 'var(--r)',
          zIndex: 0, pointerEvents: 'none',
        }}
      />

      {/* scrollable list */}
      <div
        ref={ref}
        onScroll={onScroll}
        style={{
          position: 'relative', zIndex: 1,
          height: '100%', overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        <div style={{ height: ITEM_H * 2 }} />
        {items.map(item => {
          const sel = item === value
          return (
            <div
              key={item}
              style={{
                height: ITEM_H,
                scrollSnapAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-head)',
                fontSize: sel ? 26 : 18,
                fontWeight: sel ? 700 : 400,
                color: sel ? 'var(--bg)' : 'var(--ink-3)',
                transition: 'all 0.12s ease',
                userSelect: 'none',
              }}
            >
              {item}
            </div>
          )
        })}
        <div style={{ height: ITEM_H * 2 }} />
      </div>

      {/* top fade */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 2,
          background: 'linear-gradient(to bottom, var(--bg-panel) 10%, transparent)',
          pointerEvents: 'none', zIndex: 2,
        }}
      />
      {/* bottom fade */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 2,
          background: 'linear-gradient(to top, var(--bg-panel) 10%, transparent)',
          pointerEvents: 'none', zIndex: 2,
        }}
      />
    </div>
  )
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const MINS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))
const PERIODS = ['AM', 'PM']

export default function TimePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  // value = "HH:MM" 24-hour
  const [h24Str, minStr] = value.split(':')
  const h24 = parseInt(h24Str ?? '9')
  const minNum = parseInt(minStr ?? '0')

  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 || 12

  // snap minute to nearest 5
  const closestMin = MINS.reduce((prev, curr) =>
    Math.abs(parseInt(curr) - minNum) < Math.abs(parseInt(prev) - minNum) ? curr : prev
  )

  function emit(newH12: string, newMin: string, newPeriod: string) {
    let h = parseInt(newH12)
    if (newPeriod === 'AM') h = h === 12 ? 0 : h
    else h = h === 12 ? 12 : h + 12
    onChange(`${String(h).padStart(2, '0')}:${newMin}`)
  }

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--line-strong)',
      borderRadius: 'var(--r)',
      padding: '8px 20px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    }}>
      <Drum
        items={HOURS}
        value={String(h12).padStart(2, '0')}
        onChange={h => emit(h, closestMin, period)}
        width={64}
      />
      <div style={{
        fontFamily: 'var(--font-head)',
        fontSize: 28,
        fontWeight: 700,
        color: 'var(--ink-3)',
        paddingBottom: 2,
        userSelect: 'none',
        flexShrink: 0,
      }}>
        :
      </div>
      <Drum
        items={MINS}
        value={closestMin}
        onChange={m => emit(String(h12).padStart(2, '0'), m, period)}
        width={64}
      />
      <div style={{ width: 8 }} />
      <Drum
        items={PERIODS}
        value={period}
        onChange={p => emit(String(h12).padStart(2, '0'), closestMin, p)}
        width={64}
      />
    </div>
  )
}
