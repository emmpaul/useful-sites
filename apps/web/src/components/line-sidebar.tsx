import * as React from "react"

import "./line-sidebar.css"

/**
 * Ported from React Bits (https://reactbits.dev/) — TypeScript, with the list
 * items as real buttons so the menu is reachable by keyboard, and an optional
 * controlled `activeIndex` so the page can drive the selection.
 */

type Falloff = "linear" | "smooth" | "sharp"

const FALLOFF_CURVES: Record<Falloff, (proximity: number) => number> = {
  linear: (p) => p,
  smooth: (p) => p * p * (3 - 2 * p),
  sharp: (p) => p * p * p,
}

export type LineSidebarProps = {
  /** Labels rendered as the list of sidebar entries. */
  items: string[]
  /** Color items and markers shift toward as the cursor gets close. */
  accentColor?: string
  /** Resting color of the item labels. */
  textColor?: string
  /** Resting color of the leading marker lines. */
  markerColor?: string
  /** Show the zero-padded index before each label. */
  showIndex?: boolean
  /** Show the marker lines (and short ticks) beside each item. */
  showMarker?: boolean
  /** Vertical distance in pixels within which the cursor influences an item. */
  proximityRadius?: number
  /** Maximum horizontal shift in pixels the label slides at full proximity. */
  maxShift?: number
  /** Curve mapping cursor distance to the proximity effect. */
  falloff?: Falloff
  /** Length in pixels of the marker line; the ticks scale from this too. */
  markerLength?: number
  /** Gap in pixels between the labels and the markers. */
  markerGap?: number
  /** Length of the in-between ticks as a fraction of `markerLength`. */
  tickScale?: number
  /** When true, the in-between ticks also grow with cursor proximity. */
  scaleTick?: boolean
  /** Vertical gap between items in pixels. */
  itemGap?: number
  /** Font size of the labels in rem. */
  fontSize?: number
  /** Transition duration in milliseconds for the proximity response. */
  smoothing?: number
  /** Index selected on mount, when the selection is left uncontrolled. */
  defaultActive?: number | null
  /** Selected index. Pass this to drive the selection from the outside. */
  activeIndex?: number | null
  /** Called when an item is clicked; the clicked item also becomes active. */
  onItemClick?: (index: number, label: string) => void
  /** Accessible name for the nav landmark. */
  label?: string
  /** Additional CSS classes for the outer wrapper. */
  className?: string
}

export function LineSidebar({
  items,
  accentColor = "var(--brand)",
  textColor = "var(--muted-foreground)",
  markerColor = "var(--dim)",
  showIndex = true,
  showMarker = true,
  proximityRadius = 100,
  maxShift = 30,
  falloff = "smooth",
  markerLength = 60,
  markerGap = 0,
  tickScale = 0.5,
  scaleTick = true,
  itemGap = 20,
  fontSize = 1.1,
  smoothing = 100,
  defaultActive = null,
  activeIndex: controlledActive,
  onItemClick,
  label,
  className = "",
}: LineSidebarProps) {
  const listRef = React.useRef<HTMLUListElement>(null)
  const itemRefs = React.useRef<Array<HTMLLIElement | null>>([])
  const targetsRef = React.useRef<number[]>([])
  const currentRef = React.useRef<number[]>([])
  const rafRef = React.useRef<number | null>(null)
  const lastRef = React.useRef(0)
  const activeRef = React.useRef<number | null>(defaultActive)
  const smoothingRef = React.useRef(smoothing)

  const [uncontrolledActive, setUncontrolledActive] = React.useState<
    number | null
  >(defaultActive)
  const activeIndex =
    controlledActive === undefined ? uncontrolledActive : controlledActive

  // Single rAF loop that eases every item's --effect toward its target using
  // frame-rate independent exponential smoothing, so color, shift and scale
  // all move together without staggering CSS transitions.
  const startLoop = React.useCallback(() => {
    function frame(now: number) {
      const dt = Math.min((now - lastRef.current) / 1000, 0.05)
      lastRef.current = now
      const tau = Math.max(smoothingRef.current, 1) / 1000
      const k = 1 - Math.exp(-dt / tau)

      let moving = false
      const elements = itemRefs.current

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i]
        if (!el) continue

        const target = Math.max(
          targetsRef.current[i] || 0,
          activeRef.current === i ? 1 : 0
        )
        const cur = currentRef.current[i] || 0
        const next = cur + (target - cur) * k
        const settled = Math.abs(target - next) < 0.0015
        const value = settled ? target : next

        currentRef.current[i] = value
        el.style.setProperty("--effect", value.toFixed(4))

        if (!settled) moving = true
      }

      rafRef.current = moving ? requestAnimationFrame(frame) : null
    }

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
    }

    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(frame)
  }, [])

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLUListElement>) => {
      const list = listRef.current
      if (!list) return

      const rect = list.getBoundingClientRect()
      const pointerY = event.clientY - rect.top
      const ease = FALLOFF_CURVES[falloff] ?? FALLOFF_CURVES.linear
      const elements = itemRefs.current

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i]
        if (!el) continue

        const center = el.offsetTop + el.offsetHeight / 2
        const distance = Math.abs(pointerY - center)
        targetsRef.current[i] = ease(
          Math.max(0, 1 - distance / proximityRadius)
        )
      }

      startLoop()
    },
    [falloff, proximityRadius, startLoop]
  )

  const handlePointerLeave = React.useCallback(() => {
    targetsRef.current = targetsRef.current.map(() => 0)
    startLoop()
  }, [startLoop])

  const handleClick = React.useCallback(
    (index: number, itemLabel: string) => {
      setUncontrolledActive(index)
      onItemClick?.(index, itemLabel)
    },
    [onItemClick]
  )

  React.useEffect(() => {
    smoothingRef.current = smoothing
  }, [smoothing])

  React.useEffect(() => {
    activeRef.current = activeIndex
    startLoop()
  }, [activeIndex, startLoop])

  React.useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    },
    []
  )

  return (
    <nav
      aria-label={label}
      className={[
        "line-sidebar",
        showMarker && "line-sidebar--markers",
        scaleTick && "line-sidebar--scale-tick",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--accent-color": accentColor,
          "--text-color": textColor,
          "--marker-color": markerColor,
          "--marker-length": `${markerLength}px`,
          "--marker-gap": `${markerGap}px`,
          "--tick-scale": tickScale,
          "--max-shift": `${maxShift}px`,
          "--item-gap": `${itemGap}px`,
          "--font-size": `${fontSize}rem`,
        } as React.CSSProperties
      }
    >
      <ul
        ref={listRef}
        className="line-sidebar__list"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {items.map((itemLabel, index) => (
          <li
            key={`${itemLabel}-${index}`}
            ref={(el) => {
              itemRefs.current[index] = el
            }}
            className="line-sidebar__item"
          >
            {showMarker && (
              <span className="line-sidebar__marker" aria-hidden="true" />
            )}
            <button
              type="button"
              className="line-sidebar__label"
              aria-current={activeIndex === index ? "true" : undefined}
              onClick={() => handleClick(index, itemLabel)}
            >
              {showIndex && (
                <span className="line-sidebar__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
              <span className="line-sidebar__text">{itemLabel}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
