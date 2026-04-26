/**
 * Demo-mode API: mirrors api-web.ts interface but reads/writes from the
 * in-memory fixture in demo-fixtures.ts. Activated when ?demo URL param
 * is present (no Supabase auth required).
 */
import { demoState } from './demo-fixtures'
import {
  computeAnalyticsSummary,
  computeAnalyticsTrend,
  computeAnalyticsByMatter,
  computeAnalyticsByCategory,
} from './analytics-compute'
import type {
  Session, TrackingStatus, Client, Matter, Activity,
  AnalyticsSummary, AnalyticsTrendPoint, AnalyticsByMatter, AnalyticsCategoryRow,
} from './types'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function nowISO(): string {
  return new Date().toISOString()
}

function dayBoundsLocal(date: string): { start: number; end: number } {
  const start = new Date(date + 'T00:00:00').getTime()
  const end = new Date(date + 'T23:59:59.999').getTime()
  return { start, end }
}

function getDefaultHourlyRate(): number | null {
  try {
    const raw = localStorage.getItem('timetrack-settings')
    if (raw) {
      const rate = JSON.parse(raw).defaultHourlyRate
      return rate != null ? rate : null
    }
  } catch {}
  return null
}

function resolveRate(matterId: string | null | undefined): number | null {
  if (!matterId) return getDefaultHourlyRate()
  const matter = demoState.matters.find(m => m.id === matterId)
  if (!matter) return getDefaultHourlyRate()
  if (matter.billing_type === 'non-billable') return null
  if (matter.hourly_rate != null) return matter.hourly_rate
  const client = demoState.clients.find(c => c.id === matter.client_id)
  if (client && client.default_rate != null) return client.default_rate
  return getDefaultHourlyRate()
}

function utbmsToCategory(code: string | null | undefined): string {
  if (!code) return 'Administrative'
  const prefix = code[0]
  const num = parseInt(code.slice(1), 10)
  if (isNaN(num)) return 'Administrative'
  if (prefix === 'L') {
    if (num >= 100 && num <= 190) return 'Case Review'
    if (num >= 200 && num <= 250) return 'Document Drafting'
    if (num >= 300 && num <= 340) return 'Case Review'
    if (num >= 400 && num <= 440) return 'Court & Hearings'
    if (num >= 500 && num <= 520) return 'Court & Hearings'
  }
  if (prefix === 'A') {
    const map: Record<string, string> = {
      A101: 'Court & Hearings',
      A102: 'Client Communication',
      A103: 'Document Drafting',
      A104: 'Legal Research',
      A106: 'Administrative',
    }
    return map[code] || 'Administrative'
  }
  return 'Administrative'
}

function buildSession(s: any): Session {
  const acts = demoState.activities
    .filter(a => a.session_id === s.id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  return {
    id: s.id,
    start_time: s.start_time,
    end_time: s.end_time,
    status: s.status,
    summary: s.summary || '',
    categories: s.categories || [],
    activities: acts,
    matter_id: s.matter_id,
  } as unknown as Session
}

// ─── Sessions ────────────────────────────────────────────────────────────

async function getSessions(date: string): Promise<Session[]> {
  const { start, end } = dayBoundsLocal(date)
  return demoState.sessions
    .filter(s => {
      const t = new Date(s.start_time).getTime()
      return t >= start && t < end
    })
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    .map(buildSession)
}

async function getSessionsForRange(startDate: string, endDate: string): Promise<Session[]> {
  const { start } = dayBoundsLocal(startDate)
  const { end } = dayBoundsLocal(endDate)
  return demoState.sessions
    .filter(s => {
      const t = new Date(s.start_time).getTime()
      return t >= start && t < end
    })
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    .map(buildSession)
}

async function getSession(id: string) {
  const s = demoState.sessions.find(x => x.id === id)
  if (!s) throw new Error('Session not found')
  return s
}

async function deleteSession(id: string) {
  demoState.activities = demoState.activities.filter(a => a.session_id !== id)
  demoState.sessions = demoState.sessions.filter(s => s.id !== id)
  return { deleted: true }
}

// ─── Clients ──────────────────────────────────────────────────────────────

async function getClients(): Promise<Client[]> {
  return demoState.clients
    .map(c => ({
      ...c,
      matters: demoState.matters.filter(m => m.client_id === c.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function createClient(input: { name: string; contact_info?: string; billing_address?: string; default_rate?: number; notes?: string }): Promise<Client> {
  const now = nowISO()
  const record: Client = {
    id: generateId(),
    name: input.name,
    contact_info: input.contact_info ?? null,
    billing_address: input.billing_address ?? null,
    default_rate: input.default_rate ?? null,
    notes: input.notes ?? null,
    is_internal: false,
    created_at: now,
    updated_at: now,
  }
  demoState.clients.push(record)
  return record
}

async function getClient(id: string): Promise<Client> {
  const c = demoState.clients.find(x => x.id === id)
  if (!c) throw new Error('Client not found')
  return c
}

async function updateClient(id: string, updates: Partial<Client>): Promise<Client> {
  const idx = demoState.clients.findIndex(x => x.id === id)
  if (idx < 0) throw new Error('Client not found')
  demoState.clients[idx] = { ...demoState.clients[idx], ...updates, updated_at: nowISO() }
  return demoState.clients[idx]
}

async function deleteClient(id: string) {
  demoState.clients = demoState.clients.filter(c => c.id !== id)
  return { deleted: true }
}

// ─── Matters ──────────────────────────────────────────────────────────────

async function getMatters(params?: { status?: string; client_id?: string }): Promise<Matter[]> {
  let result = [...demoState.matters]
  if (params?.status) result = result.filter(m => m.status === params.status)
  if (params?.client_id) result = result.filter(m => m.client_id === params.client_id)
  return result.sort((a, b) => a.name.localeCompare(b.name))
}

async function createMatter(input: {
  client_id: string; name: string; matter_number?: string; practice_area?: string;
  billing_type?: string; hourly_rate?: number; keywords?: string[];
  key_people?: Array<{ name: string; role: string }>; team_members?: Array<{ name: string; role: string }>;
  notes?: string;
}): Promise<Matter> {
  const now = nowISO()
  const record: Matter = {
    id: generateId(),
    client_id: input.client_id,
    name: input.name,
    matter_number: input.matter_number ?? null,
    status: 'active',
    practice_area: input.practice_area ?? null,
    billing_type: input.billing_type || 'hourly',
    hourly_rate: input.hourly_rate ?? null,
    keywords: input.keywords || [],
    key_people: input.key_people || [],
    team_members: input.team_members || [],
    notes: input.notes ?? null,
    created_at: now,
    updated_at: now,
  }
  demoState.matters.push(record)
  return record
}

async function getMatter(id: string): Promise<Matter> {
  const m = demoState.matters.find(x => x.id === id)
  if (!m) throw new Error('Matter not found')
  return m
}

async function updateMatter(id: string, updates: Partial<Matter>): Promise<Matter> {
  const idx = demoState.matters.findIndex(x => x.id === id)
  if (idx < 0) throw new Error('Matter not found')
  demoState.matters[idx] = { ...demoState.matters[idx], ...updates, updated_at: nowISO() }
  return demoState.matters[idx]
}

async function deleteMatter(id: string) {
  demoState.matters = demoState.matters.filter(m => m.id !== id)
  return { deleted: true }
}

// ─── Activities ───────────────────────────────────────────────────────────

async function getActivities(sessionId: string): Promise<Activity[]> {
  return demoState.activities
    .filter(a => a.session_id === sessionId)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
}

async function createActivity(sessionId: string, input: {
  app?: string; context?: string; minutes?: number; narrative?: string;
  category?: string; matter_id?: string | null;
  start_time?: string; end_time?: string; activity_code?: string;
}): Promise<Activity> {
  // Next sort order
  const existing = demoState.activities.filter(a => a.session_id === sessionId)
  const sortOrder = existing.length > 0 ? Math.max(...existing.map(e => e.sort_order || 0)) + 1 : 0

  let billable = true
  let effectiveRate: number | null = null
  if (input.matter_id) {
    const matter = demoState.matters.find(m => m.id === input.matter_id)
    if (matter?.billing_type === 'non-billable') {
      billable = false
    } else {
      effectiveRate = resolveRate(input.matter_id)
    }
  } else {
    effectiveRate = getDefaultHourlyRate()
  }

  const category = input.activity_code ? utbmsToCategory(input.activity_code) : (input.category || 'Administrative')

  const record: Activity = {
    id: generateId(),
    session_id: sessionId,
    app: input.app || 'Manual Entry',
    context: input.context || '',
    minutes: input.minutes || 6,
    narrative: input.narrative || '',
    category,
    matter_id: input.matter_id || null,
    billable,
    effective_rate: effectiveRate,
    activity_code: input.activity_code || null,
    sort_order: sortOrder,
    start_time: input.start_time || null,
    end_time: input.end_time || null,
  }
  demoState.activities.push(record)
  return record
}

async function createManualEntry(input: {
  date: string; app?: string; context?: string; minutes?: number;
  narrative?: string; category?: string; matter_id?: string | null;
  activity_code?: string;
}): Promise<Activity> {
  // Find existing session for this date or create one
  const { start: dayStart, end: dayEnd } = dayBoundsLocal(input.date)
  let session = demoState.sessions.find(s => {
    const t = new Date(s.start_time).getTime()
    return t >= dayStart && t < dayEnd
  })

  if (!session) {
    const startTime = new Date(input.date + 'T09:00:00').toISOString()
    session = {
      id: generateId(),
      start_time: startTime,
      end_time: startTime,
      status: 'completed',
      summary: 'Manual entries',
      categories: [],
      activities: [],
      matter_id: input.matter_id || null,
    }
    demoState.sessions.push(session)
  }

  return createActivity(session.id, {
    app: input.app || 'Manual Entry',
    context: input.context || 'Offline work',
    minutes: input.minutes || 6,
    narrative: input.narrative || '',
    category: input.category || 'Administrative',
    matter_id: input.matter_id,
    activity_code: input.activity_code,
  })
}

async function updateActivity(id: string, updates: {
  matter_id?: string | null; narrative?: string; billable?: boolean;
  category?: string; minutes?: number; activity_code?: string;
  start_time?: string; end_time?: string;
}): Promise<Activity> {
  const idx = demoState.activities.findIndex(a => a.id === id)
  if (idx < 0) throw new Error('Activity not found')
  const patch: Partial<Activity> = { ...updates }

  if (updates.activity_code) {
    patch.category = utbmsToCategory(updates.activity_code)
  }

  if ('matter_id' in updates) {
    const newMatterId = updates.matter_id
    if (newMatterId) {
      const matter = demoState.matters.find(m => m.id === newMatterId)
      if (matter?.billing_type === 'non-billable') {
        patch.billable = false
        patch.effective_rate = null
      } else {
        patch.billable = true
        patch.effective_rate = resolveRate(newMatterId)
      }
    } else {
      patch.billable = true
      patch.effective_rate = getDefaultHourlyRate()
    }
  }

  demoState.activities[idx] = { ...demoState.activities[idx], ...patch }
  return demoState.activities[idx]
}

async function deleteActivity(id: string) {
  demoState.activities = demoState.activities.filter(a => a.id !== id)
  return { deleted: true }
}

// ─── Analytics ────────────────────────────────────────────────────────────

function fetchActivitiesForAnalytics(startDate: string, endDate: string) {
  const { start } = dayBoundsLocal(startDate)
  const { end } = dayBoundsLocal(endDate)
  const sessions = demoState.sessions.filter(s => {
    if (s.status !== 'completed') return false
    const t = new Date(s.start_time).getTime()
    return t >= start && t <= end
  })
  const sessionStartMap = new Map(sessions.map(s => [s.id, s.start_time]))
  const sessionIds = new Set(sessions.map(s => s.id))

  return demoState.activities
    .filter(a => a.session_id && sessionIds.has(a.session_id))
    .map(a => {
      const matter = a.matter_id ? demoState.matters.find(m => m.id === a.matter_id) : null
      const client = matter ? demoState.clients.find(c => c.id === matter.client_id) : null
      return {
        minutes: a.minutes || 0,
        billable: Boolean(a.billable),
        effective_rate: a.effective_rate,
        category: a.category,
        matter_id: a.matter_id,
        session_start_time: a.session_id ? (sessionStartMap.get(a.session_id) || '') : '',
        matter_name: matter?.name || null,
        client_name: client?.name || null,
      }
    })
}

async function getAnalyticsSummary(startDate: string, endDate: string): Promise<AnalyticsSummary> {
  const activities = fetchActivitiesForAnalytics(startDate, endDate)
  return computeAnalyticsSummary(activities, startDate, endDate)
}

async function getAnalyticsTrend(startDate: string, endDate: string, granularity = 'day'): Promise<{ data: AnalyticsTrendPoint[] }> {
  const activities = fetchActivitiesForAnalytics(startDate, endDate)
  return { data: computeAnalyticsTrend(activities, granularity) }
}

async function getAnalyticsByMatter(startDate: string, endDate: string, limit = 10): Promise<AnalyticsByMatter> {
  const activities = fetchActivitiesForAnalytics(startDate, endDate)
  return computeAnalyticsByMatter(activities, limit)
}

async function getAnalyticsByCategory(startDate: string, endDate: string): Promise<{ data: AnalyticsCategoryRow[] }> {
  const activities = fetchActivitiesForAnalytics(startDate, endDate)
  return { data: computeAnalyticsByCategory(activities) }
}

// ─── CSV Export ───────────────────────────────────────────────────────────

async function exportTimesheet(startDate: string, endDate?: string) {
  const effectiveEnd = endDate || startDate
  const { start } = dayBoundsLocal(startDate)
  const { end } = dayBoundsLocal(effectiveEnd)
  const sessions = demoState.sessions.filter(s => {
    const t = new Date(s.start_time).getTime()
    return t >= start && t < end
  })
  if (sessions.length === 0) return

  const sessionStartMap = new Map(sessions.map(s => [s.id, s.start_time]))
  const sessionIds = new Set(sessions.map(s => s.id))
  const acts = demoState.activities
    .filter(a => a.session_id && sessionIds.has(a.session_id))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  if (acts.length === 0) return

  const rows: string[][] = [
    ['Date', 'Client', 'Matter', 'Matter Number', 'Activity Code', 'Category', 'Hours', 'Narrative', 'Rate', 'Value'],
  ]
  for (const a of acts) {
    const matter = a.matter_id ? demoState.matters.find(m => m.id === a.matter_id) : null
    const client = matter ? demoState.clients.find(c => c.id === matter.client_id) : null
    const sessionStart = a.session_id ? sessionStartMap.get(a.session_id) : undefined
    const actDate = a.start_time
      ? new Date(a.start_time).toISOString().slice(0, 10)
      : (sessionStart ? new Date(sessionStart).toISOString().slice(0, 10) : startDate)
    const hours = (a.minutes || 0) > 0 ? Math.max(Math.round((a.minutes || 0) / 60 * 10) / 10, 0.1) : 0
    const rate = a.effective_rate || ''
    const value = a.effective_rate ? Math.round(hours * a.effective_rate * 100) / 100 : ''
    rows.push([
      actDate,
      client?.name || 'Unassigned',
      matter?.name || 'Unassigned',
      matter?.matter_number || '',
      a.activity_code || '',
      a.category || '',
      String(hours),
      a.narrative || '',
      String(rate),
      String(value),
    ])
  }

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const filename = startDate === effectiveEnd ? `timesheet-${startDate}.csv` : `timesheet-${startDate}-to-${effectiveEnd}.csv`
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// ─── Exported demo API ────────────────────────────────────────────────────

export const demoApi = {
  getStatus: () =>
    Promise.resolve({ status: 'idle' as TrackingStatus, elapsed_seconds: 0, session_id: null }),
  startSession: () => Promise.resolve({ id: generateId(), start_time: nowISO(), status: 'tracking' }),
  stopSession: (_t?: string) => Promise.resolve({ id: 'demo', status: 'completed' }),
  getPermissions: () =>
    Promise.resolve({ accessibility: true, screen_recording: true, platform_supported: false }),

  getSessions,
  getSessionsForRange,
  getSession,
  deleteSession,

  getClients,
  createClient,
  getClient,
  updateClient,
  deleteClient,

  getMatters,
  createMatter,
  getMatter,
  updateMatter,
  deleteMatter,

  getActivities,
  createActivity,
  createManualEntry,
  updateActivity,
  deleteActivity,

  getAnalyticsSummary,
  getAnalyticsTrend,
  getAnalyticsByMatter,
  getAnalyticsByCategory,

  exportTimesheet,
}
