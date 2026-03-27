import { useState, useRef } from 'react'
import type { Activity } from '@/lib/types'
import { formatDuration, formatTimeRange } from '@/lib/format'
import { api } from '@/lib/api'

interface MatterActivityRowProps {
  activity: Activity
  isLast: boolean
  selected?: boolean
  onSelectToggle?: (activityId: string) => void
  onActivityUpdated?: (activity: Activity) => void
}

export function MatterActivityRow({ activity, isLast, selected, onSelectToggle, onActivityUpdated }: MatterActivityRowProps) {
  const hours = formatDuration(activity.minutes)
  const [isEditingNarrative, setIsEditingNarrative] = useState(false)
  const [narrativeValue, setNarrativeValue] = useState(activity.narrative)
  const [saveError, setSaveError] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const timeRange = activity.start_time && activity.end_time
    ? formatTimeRange(activity.start_time, activity.end_time)
    : null

  async function handleNarrativeSave() {
    setIsEditingNarrative(false)
    if (narrativeValue === activity.narrative) return
    if (!activity.id) return
    try {
      setSaveError(false)
      const updated = await api.updateActivity(activity.id, { narrative: narrativeValue })
      onActivityUpdated?.(updated)
    } catch {
      setSaveError(true)
      setNarrativeValue(activity.narrative)
      setTimeout(() => setSaveError(false), 3000)
    }
  }

  return (
    <div className={`flex gap-3 py-4 items-start ${!isLast ? 'border-b border-border-subtle' : ''}`}>
      {/* Selection checkbox */}
      {activity.id && onSelectToggle ? (
        <input
          type="checkbox"
          checked={selected || false}
          onChange={() => onSelectToggle(activity.id!)}
          className="mt-1 w-3.5 h-3.5 rounded border-border accent-accent cursor-pointer shrink-0"
        />
      ) : (
        <div className="w-3.5 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
      {/* Top row: time range + code + hours + status */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {timeRange && (
            <span className="text-[13px] font-mono text-text-muted tabular-nums">
              {timeRange}
            </span>
          )}
          {activity.activity_code && (
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-bg-inset text-text-secondary">
              {activity.activity_code}
            </span>
          )}
        </div>
        <span className="text-[22px] font-mono font-semibold text-text-primary tabular-nums">
          {hours}
        </span>
      </div>

      {/* Narrative */}
      <div className="text-[14px] leading-relaxed text-text-secondary">
        {isEditingNarrative ? (
          <textarea
            ref={inputRef}
            className="w-full bg-bg-surface border border-border-default rounded px-2 py-1 text-[14px] text-text-secondary resize-none focus:outline-none focus:ring-1 focus:ring-text-faint"
            value={narrativeValue}
            onChange={(e) => setNarrativeValue(e.target.value)}
            onBlur={handleNarrativeSave}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setNarrativeValue(activity.narrative); setIsEditingNarrative(false) }
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNarrativeSave() }
            }}
            rows={2}
            autoFocus
          />
        ) : (
          <div
            className="cursor-pointer hover:bg-bg-surface-hover rounded px-1 -mx-1 transition-colors"
            onClick={() => setIsEditingNarrative(true)}
            title="Click to edit"
          >
            {activity.narrative || <span className="italic text-text-faint">Click to add narrative</span>}
          </div>
        )}
        {saveError && (
          <div className="text-xs text-error mt-0.5">Failed to save. Please try again.</div>
        )}
      </div>
      </div>
    </div>
  )
}
