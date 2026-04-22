import { useMemo } from 'react'
import type { Session, Matter, Client, Activity } from '@/lib/types'
import { ActivityRow } from './ActivityRow'
import { EmptyState } from './EmptyState'
import { InlineProcessingRow } from './InlineProcessingRow'

interface SessionTableProps {
  sessions: Session[]
  matters?: Matter[]
  clients?: Client[]
  selectedActivities?: Set<string>
  onSelectToggle?: (activityId: string) => void
  onSessionUpdated?: (session: Session) => void
  onDataRefresh?: () => void
  isProcessing?: boolean
  viewMode?: 'chronological' | 'by-matter'
  searchQuery?: string
}

const UNASSIGNED_KEY = '__unassigned__'

type ActivityEntry = { session: Session; activity: Activity }

export function SessionTable({ sessions, matters, clients, selectedActivities, onSelectToggle, onSessionUpdated, onDataRefresh, isProcessing, viewMode = 'chronological', searchQuery = '' }: SessionTableProps) {
  const matterMap = useMemo(() => new Map((matters || []).map(m => [m.id, m])), [matters])
  const clientMap = useMemo(() => new Map((clients || []).map(c => [c.id, c])), [clients])

  // Flatten
  const allEntries: ActivityEntry[] = useMemo(() => {
    const out: ActivityEntry[] = []
    for (const session of sessions) {
      for (const activity of session.activities) {
        out.push({ session, activity })
      }
    }
    return out
  }, [sessions])

  // Filter by search
  const filteredEntries: ActivityEntry[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return allEntries
    return allEntries.filter(({ activity }) => {
      const matter = activity.matter_id ? matterMap.get(activity.matter_id) : null
      const client = matter ? clientMap.get(matter.client_id) : null
      return (
        activity.narrative.toLowerCase().includes(q) ||
        activity.app.toLowerCase().includes(q) ||
        (activity.context?.toLowerCase().includes(q) ?? false) ||
        (matter?.name.toLowerCase().includes(q) ?? false) ||
        (client?.name.toLowerCase().includes(q) ?? false)
      )
    })
  }, [allEntries, searchQuery, matterMap, clientMap])

  // Chronological order
  const chronologicalEntries: ActivityEntry[] = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      const at = a.activity.start_time || a.session.startTime
      const bt = b.activity.start_time || b.session.startTime
      return (at || '').localeCompare(bt || '')
    })
  }, [filteredEntries])

  // Grouped by matter (each group's activities stay chronological)
  const groupedByMatter: Array<{ matterId: string; matter: Matter | null; entries: ActivityEntry[]; totalMinutes: number }> = useMemo(() => {
    const buckets = new Map<string, ActivityEntry[]>()
    for (const entry of chronologicalEntries) {
      const key = entry.activity.matter_id || UNASSIGNED_KEY
      const arr = buckets.get(key) || []
      arr.push(entry)
      buckets.set(key, arr)
    }
    const groups = Array.from(buckets.entries()).map(([matterId, entries]) => {
      const matter = matterId === UNASSIGNED_KEY ? null : matterMap.get(matterId) || null
      const totalMinutes = entries.reduce((sum, e) => sum + e.activity.minutes, 0)
      return { matterId, matter, entries, totalMinutes }
    })
    // Sort: billable matters first, then non-billable, then unassigned last. Within each, by total minutes desc.
    groups.sort((a, b) => {
      const aRank = a.matterId === UNASSIGNED_KEY ? 2 : a.matter?.billing_type === 'non-billable' ? 1 : 0
      const bRank = b.matterId === UNASSIGNED_KEY ? 2 : b.matter?.billing_type === 'non-billable' ? 1 : 0
      if (aRank !== bRank) return aRank - bRank
      return b.totalMinutes - a.totalMinutes
    })
    return groups
  }, [chronologicalEntries, matterMap])

  if (sessions.length === 0 && !isProcessing) {
    return <EmptyState />
  }

  function handleActivityUpdated(session: Session, updated: Activity) {
    if (!onSessionUpdated) return
    onSessionUpdated({
      ...session,
      activities: session.activities.map(a => (a.id === updated.id ? updated : a)),
    })
  }

  function handleActivityDeleted(session: Session, activityId: string) {
    if (!onSessionUpdated) return
    onSessionUpdated({
      ...session,
      activities: session.activities.filter(a => a.id !== activityId),
    })
  }

  function renderRow(entry: ActivityEntry, index: number, isLast: boolean) {
    const { session, activity } = entry
    return (
      <ActivityRow
        key={activity.id || `${session.id}-${index}`}
        activity={activity}
        isLast={isLast}
        matters={matters}
        clients={clients}
        selected={activity.id ? selectedActivities?.has(activity.id) : false}
        onSelectToggle={onSelectToggle}
        onActivityUpdated={(updated) => handleActivityUpdated(session, updated)}
        onActivityDeleted={(id) => handleActivityDeleted(session, id)}
        onDataRefresh={onDataRefresh}
      />
    )
  }

  const hasResults = filteredEntries.length > 0
  const isFiltered = searchQuery.trim().length > 0

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)]">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[24px_1fr_200px_80px_1.2fr] gap-4 px-5 py-2.5 border-b border-border text-xs font-bold tracking-wider uppercase text-text-muted">
        <div />
        <div>Matter</div>
        <div>Time</div>
        <div>Hours</div>
        <div>Narrative</div>
      </div>

      {/* Processing row (inline, at top) */}
      {isProcessing && <InlineProcessingRow />}

      {!hasResults && !isProcessing && isFiltered && (
        <div className="px-5 py-10 text-center text-sm text-text-muted">
          No activities match "{searchQuery}".
        </div>
      )}

      {/* Rows */}
      {hasResults && viewMode === 'chronological' && (
        <div className="px-5">
          {chronologicalEntries.map((entry, i) =>
            renderRow(entry, i, i === chronologicalEntries.length - 1),
          )}
        </div>
      )}

      {hasResults && viewMode === 'by-matter' && (
        <div>
          {groupedByMatter.map(({ matterId, matter, entries, totalMinutes }) => {
            const client = matter ? clientMap.get(matter.client_id) : null
            const label = matter ? matter.name : 'Unassigned'
            const clientLabel = client && !client.is_internal ? client.name : null
            return (
              <div key={matterId} className="border-b border-border last:border-b-0">
                <div className="flex items-baseline justify-between gap-4 px-5 py-2.5 bg-inset/60">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-sm font-semibold text-text-primary truncate">{label}</span>
                    {clientLabel && (
                      <span className="text-xs text-text-muted truncate">{clientLabel}</span>
                    )}
                    {matter?.billing_type === 'non-billable' && (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-text-faint">Non-billable</span>
                    )}
                  </div>
                  <span className="font-mono tabular-nums text-sm text-text-muted shrink-0">
                    {(totalMinutes / 60).toFixed(1)} hrs · {entries.length} {entries.length === 1 ? 'activity' : 'activities'}
                  </span>
                </div>
                <div className="px-5">
                  {entries.map((entry, i) =>
                    renderRow(entry, i, i === entries.length - 1),
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
