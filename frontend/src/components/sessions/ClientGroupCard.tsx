import { useState } from 'react'
import type { Activity, Matter, Client } from '@/lib/types'
import { formatDuration } from '@/lib/format'
import { ChevronDown, Plus } from 'lucide-react'
import { MatterActivityRow } from './MatterActivityRow'
import { cn } from '@/lib/utils'

interface MatterGroup {
  matterId: string | null
  matter: Matter | null
  activities: Activity[]
}

interface ClientGroupCardProps {
  clientId: string | null
  client: Client | null
  matters: MatterGroup[]
  totalMinutes: number
  isFirst: boolean
  selectedActivities?: Set<string>
  onSelectToggle?: (activityId: string) => void
  onActivityUpdated?: (activity: Activity) => void
  onSwitchToTimeline?: () => void
}

export function ClientGroupCard({ client, matters, totalMinutes, isFirst, selectedActivities, onSelectToggle, onActivityUpdated, onSwitchToTimeline }: ClientGroupCardProps) {
  const [expandedClient, setExpandedClient] = useState(true)
  const [expandedMatters, setExpandedMatters] = useState<Set<string>>(new Set())

  function toggleMatter(matterId: string) {
    setExpandedMatters(prev => {
      const next = new Set(prev)
      if (next.has(matterId)) next.delete(matterId)
      else next.add(matterId)
      return next
    })
  }

  return (
    <div>
      {/* Client header */}
      <div
        className={cn(
          'flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-surface-hover transition-colors bg-bg-inset',
          !isFirst && 'border-t border-border',
        )}
        onClick={() => setExpandedClient(!expandedClient)}
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            size={14}
            className={cn(
              'text-text-faint transition-transform duration-200',
              !expandedClient && '-rotate-90',
            )}
          />
          <span className="font-display font-bold text-sm text-text-primary">
            {client?.name || 'Unassigned'}
          </span>
          <span className="text-xs text-text-muted">
            {matters.length} {matters.length === 1 ? 'matter' : 'matters'}
          </span>
        </div>
        <span className="font-mono text-sm font-semibold text-text-primary tabular-nums">
          {formatDuration(totalMinutes)}
        </span>
      </div>

      {/* Matters list */}
      {expandedClient && matters.map((group) => {
        const matterKey = group.matterId || '__unassigned__'
        const isExpanded = expandedMatters.has(matterKey)
        const matterMinutes = group.activities.reduce((sum, a) => sum + a.minutes, 0)

        return (
          <div key={matterKey}>
            {/* Matter header */}
            <div
              className="flex items-center justify-between px-5 pl-10 py-2.5 cursor-pointer hover:bg-surface-hover transition-colors border-t border-border-subtle"
              onClick={() => toggleMatter(matterKey)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ChevronDown
                  size={12}
                  className={cn(
                    'text-text-faint transition-transform duration-200 shrink-0',
                    !isExpanded && '-rotate-90',
                  )}
                />
                <div className="w-2 h-2 rounded-full bg-accent-link shrink-0" />
                <span className="text-sm text-text-primary font-medium truncate">
                  {group.matter?.name || 'Unassigned'}
                </span>
                {group.matter?.matter_number && (
                  <span className="text-xs font-mono text-text-muted tabular-nums shrink-0">
                    {group.matter.matter_number}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">
                  {group.activities.length} {group.activities.length === 1 ? 'entry' : 'entries'}
                </span>
                <span className="font-mono text-sm font-semibold text-text-primary tabular-nums">
                  {formatDuration(matterMinutes)}
                </span>
              </div>
            </div>

            {/* Activity rows (expanded) */}
            {isExpanded && (
              <div className="pl-8">
                {group.activities.map((activity, i) => (
                  <MatterActivityRow
                    key={activity.id || i}
                    activity={activity}
                    isLast={i === group.activities.length - 1}
                    selected={activity.id ? selectedActivities?.has(activity.id) : false}
                    onSelectToggle={onSelectToggle}
                    onActivityUpdated={onActivityUpdated}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Add Entry link */}
      {expandedClient && onSwitchToTimeline && (
        <button
          onClick={onSwitchToTimeline}
          className="flex items-center gap-1 px-5 pl-10 py-2 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer border-t border-border-subtle"
        >
          <Plus size={13} />
          Add Entry
        </button>
      )}
    </div>
  )
}
