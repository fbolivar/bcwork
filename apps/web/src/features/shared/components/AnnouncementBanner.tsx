'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { AlertTriangle, Sparkles, Info, Wrench, X, ExternalLink, Pin } from 'lucide-react'
import Link from 'next/link'

const TYPE_CONFIG = {
  info: {
    icon: Info,
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    sub: 'text-blue-600',
    dot: 'bg-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    sub: 'text-amber-600',
    dot: 'bg-amber-400',
  },
  feature: {
    icon: Sparkles,
    bg: 'bg-violet-50 border-violet-200',
    text: 'text-violet-800',
    sub: 'text-violet-600',
    dot: 'bg-violet-400',
  },
  maintenance: {
    icon: Wrench,
    bg: 'bg-gray-50 border-gray-200',
    text: 'text-gray-700',
    sub: 'text-gray-500',
    dot: 'bg-gray-400',
  },
} as const

interface Props {
  tenantPlan?: string
  tenantTags?: string[]
}

export function AnnouncementBanner({ tenantPlan, tenantTags }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const { data: announcements } = trpc.platform.getActiveAnnouncements.useQuery(
    { tenantPlan, tenantTags },
    { staleTime: 5 * 60 * 1000 },
  )

  const visible = (announcements ?? []).filter((a) => !dismissed.has(a.id))

  if (visible.length === 0) return null

  return (
    <div className="mb-4 space-y-2">
      {visible.map((ann) => {
        const cfg = TYPE_CONFIG[ann.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.info
        const Icon = cfg.icon
        return (
          <div
            key={ann.id}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cfg.bg}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.sub}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {ann.pinned && <Pin className={`h-3 w-3 ${cfg.sub}`} />}
                <p className={`text-sm font-semibold ${cfg.text}`}>{ann.title}</p>
              </div>
              <p className={`mt-0.5 text-xs ${cfg.sub}`}>{ann.body}</p>
              {ann.cta_label && ann.cta_url && (
                <Link
                  href={ann.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium underline ${cfg.sub}`}
                >
                  {ann.cta_label}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
            {!ann.pinned && (
              <button
                type="button"
                onClick={() => setDismissed((p) => new Set([...p, ann.id]))}
                className={`shrink-0 rounded p-0.5 hover:opacity-70 ${cfg.sub}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
