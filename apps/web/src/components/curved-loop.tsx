import * as React from "react"

import "./curved-loop.css"

/**
 * Ported from React Bits (https://reactbits.dev/) — TypeScript, with the
 * scroll offset kept in a ref rather than state (the original re-rendered on
 * every animation frame) and the loop paused under `prefers-reduced-motion`.
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

export type CurvedLoopProps = {
  /** The text to display in the curved marquee. */
  marqueeText: string
  /** Pixels of travel per frame. */
  speed?: number
  /** CSS class name for styling the text. */
  className?: string
  /** Amount of curve in the text path. */
  curveAmount?: number
  /** Initial direction of the marquee animation. */
  direction?: "left" | "right"
  /** Whether the marquee can be dragged by the user. */
  interactive?: boolean
}

export function CurvedLoop({
  marqueeText,
  speed = 2,
  className,
  curveAmount = 400,
  direction = "left",
  interactive = true,
}: CurvedLoopProps) {
  // A trailing non-breaking space keeps the gap between repeats from being
  // collapsed when the copies are concatenated into one run of text.
  const text = React.useMemo(
    () => `${marqueeText.replace(/\s+$/, "")}\u00a0`,
    [marqueeText]
  )

  const measureRef = React.useRef<SVGTextElement>(null)
  const textPathRef = React.useRef<SVGTextPathElement>(null)
  const [spacing, setSpacing] = React.useState(0)

  const uid = React.useId()
  const pathId = `curve-${uid}`
  const pathD = `M-100,40 Q500,${40 + curveAmount} 1540,40`

  const dragRef = React.useRef(false)
  const lastXRef = React.useRef(0)
  const dirRef = React.useRef(direction)
  const velRef = React.useRef(0)
  const [dragging, setDragging] = React.useState(false)

  const ready = spacing > 0

  // One copy of the text per `spacing` px, enough to cover the path with a
  // spare on each side so the wrap never shows a gap.
  const totalText = ready
    ? Array(Math.ceil(1800 / spacing) + 2)
        .fill(text)
        .join("")
    : text

  const shift = React.useCallback(
    (by: number) => {
      const textPath = textPathRef.current
      if (!textPath) return

      const current = parseFloat(textPath.getAttribute("startOffset") || "0")
      let next = current + by

      if (next <= -spacing) next += spacing
      if (next > 0) next -= spacing

      textPath.setAttribute("startOffset", `${next}px`)
    },
    [spacing]
  )

  React.useEffect(() => {
    if (measureRef.current) {
      setSpacing(measureRef.current.getComputedTextLength())
    }
  }, [text, className])

  React.useEffect(() => {
    if (!spacing || !textPathRef.current) return
    textPathRef.current.setAttribute("startOffset", `${-spacing}px`)
  }, [spacing])

  React.useEffect(() => {
    if (!spacing) return
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return

    let frame = requestAnimationFrame(function step() {
      if (!dragRef.current) {
        shift(dirRef.current === "right" ? speed : -speed)
      }
      frame = requestAnimationFrame(step)
    })

    return () => cancelAnimationFrame(frame)
  }, [spacing, speed, shift])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return

    dragRef.current = true
    setDragging(true)
    lastXRef.current = event.clientX
    velRef.current = 0
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !dragRef.current) return

    const dx = event.clientX - lastXRef.current
    lastXRef.current = event.clientX
    velRef.current = dx
    shift(dx)
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !dragRef.current) return

    dragRef.current = false
    setDragging(false)
    // Flick the marquee onward in whichever direction it was thrown.
    dirRef.current = velRef.current > 0 ? "right" : "left"

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div
      className="curved-loop-jacket"
      style={{
        visibility: ready ? "visible" : "hidden",
        cursor: interactive ? (dragging ? "grabbing" : "grab") : "auto",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      <svg
        className="curved-loop-svg"
        viewBox="0 0 1440 120"
        aria-hidden="true"
      >
        <text
          ref={measureRef}
          xmlSpace="preserve"
          style={{ visibility: "hidden", opacity: 0, pointerEvents: "none" }}
        >
          {text}
        </text>
        <defs>
          <path id={pathId} d={pathD} fill="none" stroke="transparent" />
        </defs>
        {ready && (
          <text xmlSpace="preserve" className={className}>
            <textPath
              ref={textPathRef}
              href={`#${pathId}`}
              startOffset={`${-spacing}px`}
              xmlSpace="preserve"
            >
              {totalText}
            </textPath>
          </text>
        )}
      </svg>
    </div>
  )
}
