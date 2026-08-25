'use client'

import { useRef } from 'react'

// Inclinación 3D que sigue el mouse (desactivado en pantallas táctiles pequeñas).
export function TiltCard({
  children,
  className = '',
  max = 8,
}: {
  children: React.ReactNode
  className?: string
  max?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(1100px) rotateY(${px * max}deg) rotateX(${-py * max}deg) scale(1.01)`
  }
  const reset = () => {
    if (ref.current) ref.current.style.transform = 'perspective(1100px) rotateY(0deg) rotateX(0deg)'
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={className}
      style={{ transition: 'transform 0.25s ease-out', transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  )
}
