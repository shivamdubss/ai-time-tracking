/**
 * Web-mode API implementation: talks directly to Supabase instead of local FastAPI backend.
 * Used when VITE_DEPLOY_TARGET=web (Vercel deployment).
 */
import { supabase } from './supabase'
import {
  computeAnalyticsSummary,
  computeAnalyticsTrend,
  computeAnalyticsByMatter,
  computeAnalyticsByCategory,
} from './analytics-compute'
import { roundToDecimalHours } from './format'
import type {
  Session, TrackingStatus, Client, Matter, Activity,
  AnalyticsSummary, AnalyticsTrendPoint, AnalyticsByMatter, AnalyticsCategoryRow,
} from './types'

// ─── Helpers ──────────────────────────────────────────────────────────────

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

function generateId(): string {
  return crypto.randomUUID().slice(0, 8)
}

function nowISO(): string {
  return new Date().toISOString()
}

/** Convert a local YYYY-MM-DD date to UTC start/end ISO strings for that local day. */
function dayBoundsUTC(date: string): { start: string; end: string } {
  const localStart = new Date(date + 'T00:00:00')
  const localEnd = new Date(date + 'T23:59:59.999')
  return { start: localStart.toISOString(), end: localEnd.toISOString() }
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

async function resolveRate(matterId: string | null | undefined): Promise<number | null> {
  if (!matterId) return getDefaultHourlyRate()
  const { data: matter } = await supabase
    .from('matters')
    .select('hourly_rate, client_id, billing_type')
    .eq('id', matterId)
    .single()
  if (!matter) return getDefaultHourlyRate()
  if (matter.billing_type === 'non-billable') return null
  if (matter.hourly_rate != null) return matter.hourly_rate
  const { data: client } = await supabase
    .from('clients')
    .select('default_rate')
    .eq('id', matter.client_id)
    .single()
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

// ─── Sessions ────���────────────────────────────────────────────────────────

async function getSessions(date: string): Promise<Session[]> {
  const { start, end } = dayBoundsUTC(date)
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('*')
    .gte('start_time', start)
    .lt('start_time', end)
    .order('start_time', { ascending: false })

  if (error) throw new Error(error.message)
  if (!sessions || sessions.length === 0) return []

  const sessionIds = sessions.map(s => s.id)
  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .in('session_id', sessionIds)
    .order('sort_order', { ascending: true })

  const actsBySession = new Map<string, Activity[]>()
  for (const a of (activities || [])) {
    const list = actsBySession.get(a.session_id) || []
    list.push(a)
    actsBySession.set(a.session_id, list)
  }

  return sessions.map(s => ({
    id: s.id,
    start_time: s.start_time,
    end_time: s.end_time,
    status: s.status,
    summary: s.summary || '',
    categories: s.categories || [],
    activities: actsBySession.get(s.id) || [],
    matter_id: s.matter_id,
  }))
}

async function getSession(id: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function deleteSession(id: string) {
  await supabase.from('activities').delete().eq('session_id', id)
  const { error } = await supabase.from('sessions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return { deleted: true }
}

// ─── Clients ──────────────────────────────────────────────────────────────

async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*, matters(*)')
    .order('name')
  if (error) throw new Error(error.message)
  return (data || []).map(c => ({ ...c, is_internal: Boolean(c.is_internal) }))
}

async function createClient(input: { name: string; contact_info?: string; billing_address?: string; default_rate?: number; notes?: string }): Promise<Client> {
  const userId = await getUserId()
  const now = nowISO()
  const record = {
    id: generateId(),
    ...input,
    user_id: userId,
    created_at: now,
    updated_at: now,
  }
  const { data, error } = await supabase.from('clients').insert(record).select().single()
  if (error) throw new Error(error.message)
  return data
}

async function getClient(id: string): Promise<Client> {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}

async function updateClient(id: string, updates: Partial<Client>): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update({ ...updates, updated_at: nowISO() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function deleteClient(id: string) {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return { deleted: true }
}

// ─── Matters ─────���────────────────────────────────────────────────────────

async function getMatters(params?: { status?: string; client_id?: string }): Promise<Matter[]> {
  let query = supabase.from('matters').select('*').order('name')
  if (params?.status) query = query.eq('status', params.status)
  if (params?.client_id) query = query.eq('client_id', params.client_id)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

async function createMatter(input: {
  client_id: string; name: string; matter_number?: string; practice_area?: string;
  billing_type?: string; hourly_rate?: number; keywords?: string[];
  key_people?: Array<{ name: string; role: string }>; team_members?: Array<{ name: string; role: string }>;
  notes?: string;
}): Promise<Matter> {
  const userId = await getUserId()
  const now = nowISO()
  const record = {
    id: generateId(),
    ...input,
    status: 'active',
    keywords: input.keywords || [],
    key_people: input.key_people || [],
    team_members: input.team_members || [],
    user_id: userId,
    created_at: now,
    updated_at: now,
  }
  const { data, error } = await supabase.from('matters').insert(record).select().single()
  if (error) throw new Error(error.message)
  return data
}

async function getMatter(id: string): Promise<Matter> {
  const { data, error } = await supabase.from('matters').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}

async function updateMatter(id: string, updates: Partial<Matter>): Promise<Matter> {
  const { data, error } = await supabase
    .from('matters')
    .update({ ...updates, updated_at: nowISO() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function deleteMatter(id: string) {
  const { error } = await supabase.from('matters').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return { deleted: true }
}

// ─── Activities ───────────────────────────────────────────────────────────

async function getActivities(sessionId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

async function createActivity(sessionId: string, input: {
  app?: string; context?: string; minutes?: number; narrative?: string;
  category?: string; matter_id?: string | null;
  start_time?: string; end_time?: string; activity_code?: string;
}): Promise<Activity> {
  const userId = await getUserId()

  // Get next sort order
  const { data: existing } = await supabase
    .from('activities')
    .select('sort_order')
    .eq('session_id', sessionId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const sortOrder = existing && existing.length > 0 ? (existing[0].sort_order || 0) + 1 : 0

  // Resolve billable/rate
  let billable = true
  let effectiveRate: number | null = null
  if (input.matter_id) {
    const { data: matter } = await supabase
      .from('matters')
      .select('billing_type')
      .eq('id', input.matter_id)
      .single()
    if (matter?.billing_type === 'non-billable') {
      billable = false
    } else {
      effectiveRate = await resolveRate(input.matter_id)
    }
  } else {
    effectiveRate = getDefaultHourlyRate()
  }

  const category = input.activity_code ? utbmsToCategory(input.activity_code) : (input.category || 'Administrative')

  const now = nowISO()
  const record = {
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
    approval_status: null,
    user_id: userId,
    created_at: now,
    updated_at: now,
  }

  const { data, error } = await supabase.from('activities').insert(record).select().single()
  if (error) throw new Error(error.message)
  return data
}

async function createManualEntry(input: {
  date: string; app?: string; context?: string; minutes?: number;
  narrative?: string; category?: string; matter_id?: string | null;
  activity_code?: string;
}): Promise<Activity> {
  const userId = await getUserId()

  // Find existing session for this date or create one
  const { start: dayStart, end: dayEnd } = dayBoundsUTC(input.date)
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .gte('start_time', dayStart)
    .lt('start_time', dayEnd)
    .order('start_time', { ascending: false })
    .limit(1)

  let sessionId: string
  if (sessions && sessions.length > 0) {
    sessionId = sessions[0].id
  } else {
    sessionId = generateId()
    const startTime = new Date(input.date + 'T09:00:00').toISOString()
    const now = nowISO()
    const { error } = await supabase.from('sessions').insert({
      id: sessionId,
      start_time: startTime,
      end_time: startTime,
      status: 'completed',
      summary: 'Manual entries',
      categories: [],
      activities: [],
      user_id: userId,
      created_at: now,
      updated_at: now,
    })
    if (error) throw new Error(error.message)
  }

  return createActivity(sessionId, {
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
  const patch: Record<string, unknown> = { ...updates, updated_at: nowISO() }

  // Derive category from activity code
  if (updates.activity_code) {
    patch.category = utbmsToCategory(updates.activity_code)
  }

  // When matter changes, recalculate rate and billable
  if ('matter_id' in updates) {
    const newMatterId = updates.matter_id
    if (newMatterId) {
      const { data: matter } = await supabase
        .from('matters')
        .select('billing_type')
        .eq('id', newMatterId)
        .single()
      if (matter?.billing_type === 'non-billable') {
        patch.billable = false
        patch.effective_rate = null
      } else {
        patch.billable = true
        patch.effective_rate = await resolveRate(newMatterId)
      }
    } else {
      patch.billable = true
      patch.effective_rate = getDefaultHourlyRate()
    }
  }

  const { data, error } = await supabase
    .from('activities')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function deleteActivity(id: string) {
  const { error } = await supabase.from('activities').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return { deleted: true }
}

// ─── Analytics ──────���─────────────────────────────────────────────────────

async function fetchActivitiesForAnalytics(startDate: string, endDate: string) {
  // Fetch completed sessions in range (convert local dates to UTC bounds)
  const { start: rangeStart } = dayBoundsUTC(startDate)
  const { end: rangeEnd } = dayBoundsUTC(endDate)
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, start_time')
    .eq('status', 'completed')
    .gte('start_time', rangeStart)
    .lte('start_time', rangeEnd)

  if (!sessions || sessions.length === 0) return []
  const sessionIds = sessions.map(s => s.id)
  const sessionStartMap = new Map(sessions.map(s => [s.id, s.start_time]))

  // Fetch activities for these sessions
  const { data: activities } = await supabase
    .from('activities')
    .select('*, matters(name, client_id, clients(name))')
    .in('session_id', sessionIds)

  return (activities || []).map(a => ({
    minutes: a.minutes || 0,
    billable: Boolean(a.billable),
    effective_rate: a.effective_rate,
    category: a.category,
    matter_id: a.matter_id,
    session_start_time: sessionStartMap.get(a.session_id) || '',
    matter_name: a.matters?.name || null,
    client_name: a.matters?.clients?.name || null,
  }))
}

async function getAnalyticsSummary(startDate: string, endDate: string): Promise<AnalyticsSummary> {
  const activities = await fetchActivitiesForAnalytics(startDate, endDate)
  return computeAnalyticsSummary(activities, startDate, endDate)
}

async function getAnalyticsTrend(startDate: string, endDate: string, granularity = 'day'): Promise<{ data: AnalyticsTrendPoint[] }> {
  const activities = await fetchActivitiesForAnalytics(startDate, endDate)
  return { data: computeAnalyticsTrend(activities, granularity) }
}

async function getAnalyticsByMatter(startDate: string, endDate: string, limit = 10): Promise<AnalyticsByMatter> {
  const activities = await fetchActivitiesForAnalytics(startDate, endDate)
  return computeAnalyticsByMatter(activities, limit)
}

async function getAnalyticsByCategory(startDate: string, endDate: string): Promise<{ data: AnalyticsCategoryRow[] }> {
  const activities = await fetchActivitiesForAnalytics(startDate, endDate)
  return { data: computeAnalyticsByCategory(activities) }
}

// ─── CSV Export ────��──────────────────────────────────────────────────────

async function exportTimesheet(date: string) {
  const { start, end } = dayBoundsUTC(date)
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .gte('start_time', start)
    .lt('start_time', end)

  if (!sessions || sessions.length === 0) return

  const sessionIds = sessions.map(s => s.id)
  const { data: activities } = await supabase
    .from('activities')
    .select('*, matters(name, matter_number, client_id, clients(name))')
    .in('session_id', sessionIds)
    .order('sort_order', { ascending: true })

  if (!activities || activities.length === 0) return

  const rows = [
    ['Date', 'Client', 'Matter', 'Matter Number', 'Activity Code', 'Category', 'Hours', 'Narrative', 'Rate', 'Value'],
  ]

  for (const a of activities) {
    const hours = (a.minutes || 0) > 0 ? Math.max(Math.round((a.minutes || 0) / 60 * 10) / 10, 0.1) : 0
    const rate = a.effective_rate || ''
    const value = a.effective_rate ? Math.round(hours * a.effective_rate * 100) / 100 : ''
    rows.push([
      date,
      a.matters?.clients?.name || 'Unassigned',
      a.matters?.name || 'Unassigned',
      a.matters?.matter_number || '',
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
  const a = document.createElement('a')
  a.href = url
  a.download = `timesheet-${date}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Exported API object ─────────���────────────────────────────────────────

export const api = {
  // Tracking stubs (desktop-only)
  getStatus: () =>
    Promise.resolve({ status: 'idle' as TrackingStatus, elapsed_seconds: 0, session_id: null }),
  startSession: () => {
    throw new Error('Time tracking requires the desktop app')
  },
  stopSession: (_supabaseAccessToken?: string) => {
    throw new Error('Time tracking requires the desktop app')
  },
  getPermissions: () =>
    Promise.resolve({ accessibility: true, screen_recording: true, platform_supported: false }),

  // Sessions
  getSessions: getSessions as (date: string) => Promise<Session[]>,
  getSession,
  deleteSession,

  // Clients
  getClients: getClients as () => Promise<Client[]>,
  createClient,
  getClient,
  updateClient,
  deleteClient,

  // Matters
  getMatters: getMatters as (params?: { status?: string; client_id?: string }) => Promise<Matter[]>,
  createMatter,
  getMatter,
  updateMatter,
  deleteMatter,

  // Activities
  getActivities: getActivities as (sessionId: string) => Promise<Activity[]>,
  createActivity,
  createManualEntry,
  updateActivity,
  deleteActivity,

  // Analytics
  getAnalyticsSummary,
  getAnalyticsTrend,
  getAnalyticsByMatter,
  getAnalyticsByCategory,

  // Export
  exportTimesheet,
}

export async function initAuth(): Promise<string> {
  // No local auth token needed in web mode — Supabase handles auth
  return ''
}

export class TimeTrackWebSocket {
  connect() {}
  on(_type: string, _handler: (data: any) => void) {
    return () => {}
  }
  disconnect() {}
}
