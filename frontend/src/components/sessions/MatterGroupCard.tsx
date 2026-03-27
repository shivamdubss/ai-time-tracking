import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Activity, Matter, Client } from '@/lib/types'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { MatterActivityRow } from './MatterActivityRow'

interface MatterGroupCardProps {
  matter: Matter | null
  client: Client | null
  activities: Activity[]
  selectedActivities?: Set<string>
  onSelectToggle?: (activityId: string) => void
  onActivityUpdated?: (activity: Activity) => void
}

export function MatterGroupCard({ matter, client, activities, selectedActivities, onSelectToggle, onActivityUpdated }: MatterGroupCardProps) {
  const [expanded, setExpanded] = useState(true)

  const totalMinutes = activities.reduce((sum, a) => sum + a.minutes, 0)
  const totalHours = formatDuration(totalMinutes)

  const clientName = client?.name || 'Unassigned'
  const matterNumber = matter?.matter_number
  const practiceArea = matter?.practice_area

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-link shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base text-text-primary truncate">
                {clientName}
                {matter && <span className="text-text-primary">. </span>}
              </span>
              {matterNumber && (
                <span className="text-sm font-mono text-text-muted tabular-nums">{matterNumber}</span>
              )}
              <ChevronDown
                size={14}
                className={cn(
                  'text-text-faint transition-transform duration-200',
                  expanded && 'rotate-180',
                )}
              />
            </div>
            {practiceArea && (
              <div className="text-xs text-text-muted mt-0.5">{practiceArea}</div>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 ml-4">
          <div className="font-mono text-[28px] font-bold text-text-primary tabular-nums leading-none">
            {totalHours}
            <span className="text-sm font-normal text-text-muted ml-1">hrs</span>
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            {activities.length} {activities.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>
      </div>

      {/* Activities */}
      {expanded && activities.length > 0 && (
        <div className="px-5 pb-3 border-t border-border-subtle">
          {activities.map((activity, i) => (
            <MatterActivityRow
              key={activity.id || i}
              activity={activity}
              isLast={i === activities.length - 1}
              selected={activity.id ? selectedActivities?.has(activity.id) : false}
              onSelectToggle={onSelectToggle}
              onActivityUpdated={onActivityUpdated}
            />
          ))}
        </div>
      )}
    </div>
  )
}
