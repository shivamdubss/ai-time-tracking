import { useState, useEffect, useCallback } from 'react'

export interface IntegrationsStatus {
  google: boolean
  google_email: string | null
  m365: boolean
  m365_email: string | null
}

export function useIntegrations() {
  const [status, setStatus] = useState<IntegrationsStatus>({
    google: false, google_email: null,
    m365: false, m365_email: null,
  })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/status', {
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) setStatus(await res.json())
    } catch {
      // backend not available (web mode) — stay disconnected
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function connectGoogle() {
    const res = await fetch('/api/integrations/google/connect', { method: 'POST' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Failed to start Google OAuth')
    }
    const { auth_url } = await res.json()
    window.open(auth_url, '_blank')
    // Poll for connection (user completes OAuth in the opened tab)
    const poll = setInterval(async () => {
      try {
        const r = await fetch('/api/integrations/status')
        if (r.ok) {
          const s: IntegrationsStatus = await r.json()
          if (s.google) { setStatus(s); clearInterval(poll) }
        }
      } catch { clearInterval(poll) }
    }, 2000)
    // Stop polling after 3 minutes
    setTimeout(() => clearInterval(poll), 180_000)
  }

  async function disconnectGoogle() {
    await fetch('/api/integrations/google', { method: 'DELETE' })
    await refresh()
  }

  async function connectM365() {
    const res = await fetch('/api/integrations/m365/connect', { method: 'POST' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Failed to start M365 OAuth')
    }
    const { auth_url } = await res.json()
    window.open(auth_url, '_blank')
    const poll = setInterval(async () => {
      try {
        const r = await fetch('/api/integrations/status')
        if (r.ok) {
          const s: IntegrationsStatus = await r.json()
          if (s.m365) { setStatus(s); clearInterval(poll) }
        }
      } catch { clearInterval(poll) }
    }, 2000)
    setTimeout(() => clearInterval(poll), 180_000)
  }

  async function disconnectM365() {
    await fetch('/api/integrations/m365', { method: 'DELETE' })
    await refresh()
  }

  async function fetchPreview(startDate: string, endDate: string, sources: string[]) {
    const res = await fetch('/api/integrations/import/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: startDate, end_date: endDate, sources }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Import failed')
    }
    return (await res.json()).entries as any[]
  }

  async function confirmEntries(entries: any[]) {
    const res = await fetch('/api/integrations/import/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Confirm failed')
    }
    return await res.json() as { created: number; errors: string[] }
  }

  return { status, loading, refresh, connectGoogle, disconnectGoogle, connectM365, disconnectM365, fetchPreview, confirmEntries }
}
