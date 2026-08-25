'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'

const LINKS = [
  { href: '#features', label: 'Características' },
  { href: '#roi', label: 'ROI' },
  { href: '#pricing', label: 'Precios' },
  { href: '#faq', label: 'FAQ' },
]

export function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0b1220]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2.5">
          <Image src="/brand/icon.svg" alt="BCWork" width={32} height={32} className="shrink-0" />
          <span className="text-lg font-bold tracking-tight text-white">BCWork</span>
        </div>

        {/* Desktop */}
        <div className="hidden items-center gap-8 text-sm text-gray-300 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm text-gray-200 transition-colors hover:text-white">
            Ingresar
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-colors hover:bg-cyan-400"
          >
            Empieza gratis
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label="Menú"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-gray-200 hover:bg-white/10 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile panel */}
      {open && (
        <div className="border-t border-white/10 bg-[#0b1220] px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm text-gray-200 hover:bg-white/10 hover:text-white"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/15 px-4 py-2.5 text-center text-sm text-gray-200 hover:bg-white/10"
              >
                Ingresar
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-cyan-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-cyan-400"
              >
                Empieza gratis
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
