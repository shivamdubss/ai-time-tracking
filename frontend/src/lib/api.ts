import type { Session, TrackingStatus } from './types'

const API_BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  getStatus: () => request<{ status: TrackingStatus; elapsed_seconds: number; session_id: string | null }>('/status'),

  startSession: () => request<{ id: string; start_time: string; status: string }>('/sessions/start', { method: 'POST' }),

  stopSession: () => request<{ id: string; status: string }>('/sessions/stop', { method: 'POST' }),

  getSessions: (date: string) => request<Session[]>(`/sessions?date=${date}`),

  getSession: (id: string) => request<Session>(`/sessions/${id}`),

  deleteSession: (id: string) => request<{ deleted: boolean }>(`/sessions/${id}`, { method: 'DELETE' }),
}


export class TimeTrackWebSocket {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    this.ws = new WebSocket(`${protocol}//${window.location.host}/ws`)

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
