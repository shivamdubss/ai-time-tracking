export type CategoryName = 'Coding' | 'Communication' | 'Research' | 'Meetings' | 'Browsing'

export interface Category {
  name: CategoryName
  minutes: number
  percentage: number
}

export interface Activity {
  app: string
  context: string
  minutes: number
  narrative: string
}

export interface Session {
  id: string
  startTime: string
  endTime: string
  status: 'completed' | 'processing'
  summary: string
  categories: Category[]
  activities: Activity[]
}

export type TrackingStatus = 'idle' | 'tracking' | 'processing'

export interface AppState {
  status: TrackingStatus
  elapsedSeconds: number
  sessions: Session[]
}

export const CATEGORY_COLORS: Record<CategoryName, { text: string; bg: string }> = {
  Coding: { text: 'var(--color-cat-coding)', bg: 'var(--color-cat-coding-bg)' },
  Communication: { text: 'var(--color-cat-comms)', bg: 'var(--color-cat-comms-bg)' },
  Research: { text: 'var(--color-cat-research)', bg: 'var(--color-cat-research-bg)' },
  Meetings: { text: 'var(--color-cat-meetings)', bg: 'var(--color-cat-meetings-bg)' },
  Browsing: { text: 'var(--color-cat-browsing)', bg: 'var(--color-cat-browsing-bg)' },
}

export const CATEGORY_BAR_COLORS: Record<CategoryName, string> = {
  Coding: '#0F766E',
  Communication: '#C2410C',
  Research: '#4F46E5',
  Meetings: '#BE123C',
  Browsing: '#475569',
}
