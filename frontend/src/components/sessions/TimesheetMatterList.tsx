import { useMemo } from 'react'
import type { Session, Matter, Client, Activity } from '@/lib/types'
import { formatDuration } from '@/lib/format'
import { TimesheetMatterCard } from './TimesheetMatterCard'
import { Plus } from 'lucide-react'

interface TimesheetMatterListProps {
  sessions: Session[]
  matters: Matter[]
  clients: Client[]
  onSwitchToTimeline?: () => void
  onActivityUpdated: (activity: Activity) => void
  onActivityDeleted: (activityId: string) => void
}

interface MatterGroup {
  matterId: string | null
  matter: Matter | null
  client: Client | null
  activities: Activity[]
  totalMinutes: number
}

export function TimesheetMatterList({ sessions, matters, clients, onSwitchToTimeline, onActivityUpdated, onActivityDeleted }: TimesheetMatterListProps) {
  const clientMap = useMemo(
    () => new Map(clients.map(c => [c.id, c])),
    [clients],
  )
  const matterMap = useMemo(
    () => new Map(matters.map(m => [m.id, m])),
    [matters],
  )

  const matterGroups = useMemo(() => {
    // Flatten all activities
    const allActivities: Activity[] = []
    for (const session of sessions) {
      for (const act of session.activities || []) {
        allActivities.push(act)
      }
    }

    // Group by matter_id
    const groupMap = new Map<string, Activity[]>()
    for (const act of allActivities) {
      const key = act.matter_id || '__unassigned__'
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key)!.push(act)
    }

    // Build matter groups
    const result: MatterGroup[] = []
    for (const [key, activities] of groupMap) {
      const matterId = key === '__unassigned__' ? null : key
      const matter = matterId ? matterMap.get(matterId) || null : null
      const client = matter?.client_id ? clientMap.get(matter.client_id) || null : null
      const totalMinutes = activities.reduce((sum, a) => sum + a.minutes, 0)
      result.push({ matterId, matter, client, activities, totalMinutes })
    }

    // Sort: alphabetically by matter name, unassigned last
    result.sort((a, b) => {
      if (!a.matter && b.matter) return 1
      if (a.matter && !b.matter) return -1
      const nameA = a.matter?.name || ''
      const nameB = b.matter?.name || ''
      return nameA.localeCompare(nameB)
    })

    return result
  }, [sessions, matterMap, clientMap])

  const totalEntries = matterGroups.reduce((sum, mg) => sum + mg.activities.length, 0)
  const totalMinutes = matterGroups.reduce((sum, mg) => sum + mg.totalMinutes, 0)

  if (matterGroups.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] py-12 text-center text-text-muted text-sm">
        No activities to display.
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden">
      {matterGroups.map((mg, i) => (
        <TimesheetMatterCard
          key={mg.matterId || '__unassigned__'}
          matter={mg.matter}
          client={mg.client}
          activities={mg.activities}
          isFirst={i === 0}
          matters={matters}
          clients={clients}
          onActivityUpdated={onActivityUpdated}
          onActivityDeleted={onActivityDeleted}
        />
      ))}

      {/* Add Entry link */}
      {onSwitchToTimeline && (
        <button
          onClick={onSwitchToTimeline}
          className="flex items-center gap-1 px-5 py-2 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer border-t border-border-subtle w-full"
        >
          <Plus size={13} />
          Add Entry
        </button>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center px-5 py-3 border-t border-border text-[13px] text-text-muted">
        <span>
          {matterGroups.length} {matterGroups.length === 1 ? 'matter' : 'matters'} &middot;{' '}
          {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}
        </span>
        <span className="font-mono tabular-nums font-semibold text-text-primary">
          {formatDuration(totalMinutes)}
        </span>
      </div>
    </div>
  )
}
