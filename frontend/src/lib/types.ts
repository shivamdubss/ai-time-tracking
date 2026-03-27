// Legal activity categories
export type CategoryName =
  | 'Legal Research'
  | 'Document Drafting'
  | 'Client Communication'
  | 'Court & Hearings'
  | 'Case Review'
  | 'Administrative'

export interface Category {
  name: string  // Use string to allow fallback for unknown categories
  minutes: number
  percentage: number
}

export interface Activity {
  id: string
  app: string
  context: string
  minutes: number
  narrative: string
  category?: string
  matter_id?: string | null
  billable?: boolean
  effective_rate?: number | null
  sort_order?: number
}

export interface Session {
  id: string
  startTime: string
  endTime: string
  status: 'completed' | 'processing'
  summary: string
  categories: Category[]
  activities: Activity[]
  matter_id?: string | null
}

export type TrackingStatus = 'idle' | 'tracking' | 'paused' | 'processing'

export interface AppState {
  status: TrackingStatus
  elapsedSeconds: number
  sessions: Session[]
}

// Client & Matter types
export interface Client {
  id: string
  name: string
  contact_info?: string | null
  billing_address?: string | null
  default_rate?: number | null
  notes?: string | null
  matters?: Matter[]
  created_at?: string
  updated_at?: string
}

export interface Matter {
  id: string
  client_id: string
  name: string
  matter_number?: string | null
  status: 'active' | 'closed' | 'pending'
  practice_area?: string | null
  billing_type: string
  hourly_rate?: number | null
  keywords: string[]
  key_people: Array<{ name: string; role: string }>
  team_members: Array<{ name: string; role: string }>
  notes?: string | null
  created_at?: string
  updated_at?: string
}

// Category colors — legal categories
const LEGAL_CATEGORY_COLORS: Record<string, { text: string; bg: string }> = {
  'Legal Research': { text: 'var(--color-cat-research)', bg: 'var(--color-cat-research-bg)' },
  'Document Drafting': { text: 'var(--color-cat-coding)', bg: 'var(--color-cat-coding-bg)' },
  'Client Communication': { text: 'var(--color-cat-comms)', bg: 'var(--color-cat-comms-bg)' },
  'Court & Hearings': { text: 'var(--color-cat-meetings)', bg: 'var(--color-cat-meetings-bg)' },
  'Case Review': { text: 'var(--color-cat-browsing)', bg: 'var(--color-cat-browsing-bg)' },
  'Administrative': { text: '#737373', bg: '#F5F5F5' },
}

// Fallback for unknown categories
const FALLBACK_COLOR = { text: '#737373', bg: '#F5F5F5' }
const FALLBACK_BAR_COLOR = '#737373'

export function getCategoryColors(name: string): { text: string; bg: string } {
  return LEGAL_CATEGORY_COLORS[name] || FALLBACK_COLOR
}

// Keep CATEGORY_COLORS and CATEGORY_BAR_COLORS as Record<string, ...> for backward compat
export const CATEGORY_COLORS: Record<string, { text: string; bg: string }> = {
  ...LEGAL_CATEGORY_COLORS,
  // Legacy dev categories — in case old data appears
  Coding: { text: '#737373', bg: '#F5F5F5' },
  Communication: LEGAL_CATEGORY_COLORS['Client Communication'],
  Research: LEGAL_CATEGORY_COLORS['Legal Research'],
  Meetings: LEGAL_CATEGORY_COLORS['Court & Hearings'],
  Browsing: LEGAL_CATEGORY_COLORS['Case Review'],
}

export const CATEGORY_BAR_COLORS: Record<string, string> = {
  'Legal Research': '#4F46E5',
  'Document Drafting': '#0F766E',
  'Client Communication': '#C2410C',
  'Court & Hearings': '#BE123C',
  'Case Review': '#475569',
  'Administrative': '#737373',
  // Legacy
  Coding: '#737373',
  Communication: '#C2410C',
  Research: '#4F46E5',
  Meetings: '#BE123C',
  Browsing: '#475569',
}

export function getCategoryBarColor(name: string): string {
  return CATEGORY_BAR_COLORS[name] || FALLBACK_BAR_COLOR
}
