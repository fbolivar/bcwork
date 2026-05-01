'use client'

import { useState } from 'react'
import { ApiTokensPanel } from '@/features/admin/components/ApiTokensPanel'
import { WebhooksPanel } from '@/features/admin/components/WebhooksPanel'

type Tab = 'tokens' | 'webhooks'

export default function ApiIntegrationsPage() {
  const [tab, setTab] = useState<Tab>('tokens')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Integraciones y API</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tokens de acceso para sistemas externos (nómina, RRHH, SAP) y webhooks de eventos.
        </p>
      </div>

      <div className="flex w-fit gap-1 rounded-lg border border-gray-200 bg-white p-1">
        {(['tokens', 'webhooks'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {t === 'tokens' ? 'Tokens de API' : 'Webhooks'}
          </button>
        ))}
      </div>

      {tab === 'tokens' ? <ApiTokensPanel /> : <WebhooksPanel />}
    </div>
  )
}
