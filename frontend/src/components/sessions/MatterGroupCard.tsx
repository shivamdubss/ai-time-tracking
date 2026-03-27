import type { Activity, Matter, Client } from '@/lib/types'
import { formatDuration } from '@/lib/format'
import { Plus } from 'lucide-react'
import { MatterActivityRow } from './MatterActivityRow'

interface MatterGroupCardProps {
  matter: Matter | null
  client: Client | null
  activities: Activity[]
  isFirst: boolean
  selectedActivities?: Set<string>
  onSelectToggle?: (activityId: string) => void
  onActivityUpdated?: (activity: Activity) => void
  onSwitchToTimeline?: () => void
}

export function MatterGroupCard({ matter, client, activities, isFirst, selectedActivities, onSelectToggle, onActivityUpdated, onSwitchToTimeline }: MatterGroupCardProps) {
  const totalMinutes = activities.reduce((sum, a) => sum + a.minutes, 0)
  const totalHours = formatDuration(totalMinutes)

  const clientName = client?.name || 'Unassigned'
  const matterName = matter?.name
  const matterNumber = matter?.matter_number

  return (
    <div>
      {/* Group header */}
      <div className={`grid grid-cols-[1fr_80px_1.2fr] gap-4 px-5 py-3 bg-bg-inset ${!isFirst ? 'border-t border-border' : ''}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-accent-link shrink-0" />
          <span className="font-display font-bold text-sm text-text-primary truncate">
            {clientName}
            {matterName && <span className="text-text-muted font-normal"> — {matterName}</span>}
          </span>
          {matterNumber && (
            <span className="text-xs font-mono text-text-muted tabular-nums shrink-0">{matterNumber}</span>
          )}
        </div>
        <div className="font-mono text-sm font-semibold text-text-primary tabular-nums">
          {totalHours}
        </div>
        <div className="text-xs text-text-muted">
          {activities.length} {activities.length === 1 ? 'entry' : 'entries'}
        </div>
      </div>

      {/* Activity rows */}
      {activities.map((activity, i) => (
        <MatterActivityRow
          key={activity.id || i}
          activity={activity}
          isLast={!onSwitchToTimeline && i === activities.length - 1}
          selected={activity.id ? selectedActivities?.has(activity.id) : false}
          onSelectToggle={onSelectToggle}
          onActivityUpdated={onActivityUpdated}
        />
      ))}

      {/* Add Entry link */}
      {onSwitchToTimeline && (
        <button
          onClick={onSwitchToTimeline}
          className="flex items-center gap-1 px-5 py-2 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <Plus size={13} />
          Add Entry
        </button>
      )}
    </div>
  )
}
