import type {
  Session, TrackingStatus, Client, Matter, Activity,
  AnalyticsSummary, AnalyticsTrendPoint, AnalyticsByMatter, AnalyticsCategoryRow,
} from './types'
import { isWebMode } from './platform'
import {
  api as webApi,
  initAuth as webInitAuth,
  TimeTrackWebSocket as WebTimeTrackWebSocket,
} from './api-web'

// ─── Desktop implementation (local FastAPI backend) ───────────────────────

const API_BASE = '/api'

// Auth token — fetched once from /api/init on startup
let authToken: string = ''

async function desktopInitAuth(): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/init`)
    const data = await res.json()
    authToken = data.token || ''
  } catch {
    // Auth not available — proceed without
  }
  return authToken
}

async function notifyDesktopSync(userId: string, accessToken: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, access_token: accessToken }),
    })
  } catch { /* best-effort — don't block auth flow */ }
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  return headers
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || 'Request failed')
  }
  return res.json()
}

const desktopApi = {
  // Sessions
  getStatus: () =>
    request<{ status: TrackingStatus; elapsed_seconds: number; session_id: string | null }>('/status'),

  startSession: () =>
    request<{ id: string; start_time: string; status: string }>('/sessions/start', { method: 'POST' }),

  stopSession: (supabaseAccessToken?: string) =>
    request<{ id: string; status: string }>('/sessions/stop', {
      method: 'POST',
      body: JSON.stringify({ supabase_access_token: supabaseAccessToken || '' }),
    }),

  getSessions: (date: string) =>
    request<Session[]>(`/sessions?date=${date}`),

  getSession: (id: string) =>
    request<Session>(`/sessions/${id}`),

  deleteSession: (id: string) =>
    request<{ deleted: boolean }>(`/sessions/${id}`, { method: 'DELETE' }),

  getPermissions: () =>
    request<{ accessibility: boolean; screen_recording: boolean; platform_supported: boolean }>('/permissions'),

  // Clients
  getClients: () =>
    request<Client[]>('/clients'),

  createClient: (data: { name: string; contact_info?: string; billing_address?: string; default_rate?: number; notes?: string }) =>
    request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),

  getClient: (id: string) =>
    request<Client>(`/clients/${id}`),

  updateClient: (id: string, data: Partial<Client>) =>
    request<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteClient: (id: string) =>
    request<{ deleted: boolean }>(`/clients/${id}`, { method: 'DELETE' }),

  // Matters
  getMatters: (params?: { status?: string; client_id?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.client_id) searchParams.set('client_id', params.client_id)
    const qs = searchParams.toString()
    return request<Matter[]>(`/matters${qs ? `?${qs}` : ''}`)
  },

  createMatter: (data: {
    client_id: string; name: string; matter_number?: string; practice_area?: string;
    billing_type?: string; hourly_rate?: number; keywords?: string[];
    key_people?: Array<{ name: string; role: string }>; team_members?: Array<{ name: string; role: string }>;
    notes?: string;
  }) =>
    request<Matter>('/matters', { method: 'POST', body: JSON.stringify(data) }),

  getMatter: (id: string) =>
    request<Matter>(`/matters/${id}`),

  updateMatter: (id: string, data: Partial<Matter>) =>
    request<Matter>(`/matters/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteMatter: (id: string) =>
    request<{ deleted: boolean }>(`/matters/${id}`, { method: 'DELETE' }),

  // Activities
  getActivities: (sessionId: string) =>
    request<Activity[]>(`/sessions/${sessionId}/activities`),

  createActivity: (sessionId: string, data: {
    app?: string; context?: string; minutes?: number; narrative?: string;
    category?: string; matter_id?: string | null;
    start_time?: string; end_time?: string; activity_code?: string;
  }) =>
    request<Activity>(`/sessions/${sessionId}/activities`, { method: 'POST', body: JSON.stringify(data) }),

  createManualEntry: (data: {
    date: string; app?: string; context?: string; minutes?: number;
    narrative?: string; category?: string; matter_id?: string | null;
    activity_code?: string;
  }) =>
    request<Activity>('/manual-entry', { method: 'POST', body: JSON.stringify(data) }),

  updateActivity: (id: string, data: {
    matter_id?: string | null; narrative?: string; billable?: boolean;
    category?: string; minutes?: number; activity_code?: string;
    start_time?: string; end_time?: string;
  }) =>
    request<Activity>(`/activities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteActivity: (id: string) =>
    request<{ deleted: boolean }>(`/activities/${id}`, { method: 'DELETE' }),

  // Analytics
  getAnalyticsSummary: (startDate: string, endDate: string) =>
    request<AnalyticsSummary>(`/analytics/summary?start_date=${startDate}&end_date=${endDate}`),

  getAnalyticsTrend: (startDate: string, endDate: string, granularity: string = 'day') =>
    request<{ data: AnalyticsTrendPoint[] }>(`/analytics/trend?start_date=${startDate}&end_date=${endDate}&granularity=${granularity}`),

  getAnalyticsByMatter: (startDate: string, endDate: string, limit: number = 10) =>
    request<AnalyticsByMatter>(`/analytics/by-matter?start_date=${startDate}&end_date=${endDate}&limit=${limit}`),

  getAnalyticsByCategory: (startDate: string, endDate: string) =>
    request<{ data: AnalyticsCategoryRow[] }>(`/analytics/by-category?start_date=${startDate}&end_date=${endDate}`),

  exportTimesheet: async (date: string) => {
    const res = await fetch(`${API_BASE}/export?date=${date}&format=csv`, {
      headers: authHeaders(),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timesheet-${date}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },
}

class DesktopTimeTrackWebSocket {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const tokenParam = authToken ? `?token=${authToken}` : ''
    this.ws = new WebSocket(`${protocol}//${window.location.host}/ws${tokenParam}`)

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const handlers = this.listeners.get(data.type)
        if (handlers) {
          handlers.forEach((fn) => fn(data))
        }
      } catch {}
    }

    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.connect(), 3000)
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  on(type: string, handler: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(handler)
    return () => this.listeners.get(type)?.delete(handler)
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
  }
}

// ─── Route exports based on deploy target ─────────────────────────────────

export const api = isWebMode ? webApi : desktopApi
export const initAuth = isWebMode ? webInitAuth : desktopInitAuth
export const TimeTrackWebSocket = isWebMode ? WebTimeTrackWebSocket : DesktopTimeTrackWebSocket
export const notifySync = isWebMode ? async (_userId: string, _accessToken: string) => {} : notifyDesktopSync
