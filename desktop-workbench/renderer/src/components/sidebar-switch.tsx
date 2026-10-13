"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// Slightly longer than the animations below so the fallback never cuts one off.
const LEAVE_FALLBACK_MS = 360

type Direction = "push" | "pop"

type Layer = {
  id: string
  depth: number
}

/**
 * Swaps sidebars the way a settings app pushes and pops pages: a deeper sidebar
 * slides in from the right over the current one, a shallower one is revealed
 * while the current one slides out to the right. The leaving sidebar stays
 * mounted only for its animation and takes no input. The first sidebar mounts
 * without motion.
 */
export function SidebarSwitch({
  id,
  depth,
  children,
  className,
}: {
  id: string
  depth: number
  /** Renders the sidebar for a layer; called for the leaving layer too. */
  children: (id: string) => React.ReactNode
  className?: string
}) {
  const [stack, setStack] = React.useState<{
    current: Layer
    leaving: Layer | null
    direction: Direction | null
  }>({ current: { id, depth }, leaving: null, direction: null })

  if (stack.current.id !== id) {
    setStack({
      current: { id, depth },
      leaving: stack.current,
      direction: depth < stack.current.depth ? "pop" : "push",
    })
  }

  const leavingId = stack.leaving?.id ?? null
  const settle = React.useCallback(() => {
    setStack((state) => (state.leaving ? { ...state, leaving: null } : state))
  }, [])

  React.useEffect(() => {
    if (leavingId === null) return
    const timer = window.setTimeout(settle, LEAVE_FALLBACK_MS)
    return () => window.clearTimeout(timer)
  }, [leavingId, settle])

  const layers = stack.leaving ? [stack.leaving, stack.current] : [stack.current]
  const direction = stack.direction

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      {layers.map((layer) => {
        const leaving = layer.id === leavingId
        return (
          <div
            key={layer.id}
            data-slot="sidebar-layer"
            data-state={leaving ? "leaving" : "current"}
            aria-hidden={leaving || undefined}
            className={cn(
              "h-full",
              leaving ? "pointer-events-none absolute inset-0" : "relative",
              direction && motionClasses(direction, leaving)
            )}
            onAnimationEnd={
              leaving
                ? (event) => {
                    if (event.target === event.currentTarget) settle()
                  }
                : undefined
            }
          >
            {children(layer.id)}
          </div>
        )
      })}
    </div>
  )
}

function motionClasses(direction: Direction, leaving: boolean): string {
  if (direction === "push") {
    return leaving
      ? "z-0 animate-out fade-out slide-out-to-left-1/3 fill-mode-forwards duration-300 ease-out"
      : "z-10 animate-in slide-in-from-right duration-300 ease-out"
  }
  return leaving
    ? "z-10 animate-out slide-out-to-right fill-mode-forwards duration-300 ease-out"
    : "z-0 animate-in fade-in slide-in-from-left-1/3 duration-300 ease-out"
}
