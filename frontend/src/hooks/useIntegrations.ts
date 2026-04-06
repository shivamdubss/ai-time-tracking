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
    let base: IntegrationsStatus = { google: false, google_email: null, m365: false, m365_email: null }
    try {
      const res = await fetch('/api/integrations/status', {
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) base = await res.json()
    } catch {}
    // Merge localStorage stub state on top of backend state
    const g = localStorage.getItem('integration-google')
    const m = localStorage.getItem('integration-m365')
    setStatus({
      google: base.google || !!g,
      google_email: base.google_email || (g ? JSON.parse(g).email : null),
      m365: base.m365 || !!m,
      m365_email: base.m365_email || (m ? JSON.parse(m).email : null),
    })
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  function connectGoogle() {
    localStorage.setItem('integration-google', JSON.stringify({ email: 'user@gmail.com' }))
    setStatus(prev => ({ ...prev, google: true, google_email: 'user@gmail.com' }))
  }

  function disconnectGoogle() {
    localStorage.removeItem('integration-google')
    setStatus(prev => ({ ...prev, google: false, google_email: null }))
  }

  function connectM365() {
    localStorage.setItem('integration-m365', JSON.stringify({ email: 'user@outlook.com' }))
    setStatus(prev => ({ ...prev, m365: true, m365_email: 'user@outlook.com' }))
  }

  function disconnectM365() {
    localStorage.removeItem('integration-m365')
    setStatus(prev => ({ ...prev, m365: false, m365_email: null }))
  }

  async function fetchPreview(startDate: string, endDate: string, sources: string[]) {
    // Try real backend first
    try {
      const res = await fetch('/api/integrations/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate, end_date: endDate, sources }),
      })
      if (res.ok) return (await res.json()).entries as any[]
    } catch {}

    // Stub demo data
    await new Promise(r => setTimeout(r, 600))
    const start = new Date(startDate)
    const end = new Date(endDate)
    const entries: any[] = []
    const calendarEvents = [
      { title: 'Deposition prep — Williams v. Acme Corp', matter: 'Williams v. Acme Corp', dur: 90 },
      { title: 'Client call — estate planning review', matter: 'Henderson Estate', dur: 30 },
      { title: 'Court hearing — motion to dismiss', matter: 'Williams v. Acme Corp', dur: 120 },
      { title: 'Team standup', matter: null, dur: 18 },
      { title: 'Contract review meeting', matter: 'Oakridge Commercial Lease', dur: 60 },
    ]
    const emailEvents = [
      { title: 'Drafted response to opposing counsel re: discovery requests', matter: 'Williams v. Acme Corp', dur: 48 },
      { title: 'Reviewed and revised engagement letter', matter: 'Henderson Estate', dur: 30 },
      { title: 'Correspondence with title company re: closing docs', matter: 'Oakridge Commercial Lease', dur: 24 },
    ]
    let id = 1
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue
      const dateStr = d.toISOString().slice(0, 10)
      if (sources.includes('calendar')) {
        const pick = calendarEvents[id % calendarEvents.length]
        entries.push({
          id: `demo-${id++}`, source: 'calendar', date: dateStr,
          time: '09:00 – 10:30', duration: pick.dur, category: 'Meeting',
          matter_name: pick.matter, narrative: pick.title,
          confidence: pick.matter ? 'high' : 'low',
        })
      }
      if (sources.includes('email')) {
        const pick = emailEvents[id % emailEvents.length]
        entries.push({
          id: `demo-${id++}`, source: 'email', date: dateStr,
          time: '14:00 – 14:45', duration: pick.dur, category: 'Correspondence',
          matter_name: pick.matter, narrative: pick.title,
          confidence: 'medium',
        })
      }
    }
    return entries
  }

  async function confirmEntries(entries: any[]) {
    try {
      const res = await fetch('/api/integrations/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      })
      if (res.ok) return await res.json() as { created: number; errors: string[] }
    } catch {}
    // Stub: pretend all entries were created
    return { created: entries.length, errors: [] }
  }

  return { status, loading, refresh, connectGoogle, disconnectGoogle, connectM365, disconnectM365, fetchPreview, confirmEntries }
}
