import { useState, useRef, useEffect } from 'react'
import type { Activity } from '@/lib/types'
import { formatDuration, formatTimeRange } from '@/lib/format'
import { Pencil } from 'lucide-react'
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
  const [isEditingHours, setIsEditingHours] = useState(false)
  const [hoursValue, setHoursValue] = useState(formatDuration(activity.minutes))
  const [saveError, setSaveError] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isEditingHours) {
      setHoursValue(formatDuration(activity.minutes))
    }
  }, [activity.minutes, isEditingHours])

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

  async function handleHoursSave() {
    setIsEditingHours(false)
    const parsed = parseFloat(hoursValue)
    if (isNaN(parsed) || parsed < 0.1) {
      setHoursValue(formatDuration(activity.minutes))
      return
    }
    const newMinutes = Math.round(parsed * 60)
    if (newMinutes === activity.minutes) return
    if (!activity.id) return
    try {
      setSaveError(false)
      const updated = await api.updateActivity(activity.id, { minutes: newMinutes })
      onActivityUpdated?.(updated)
    } catch {
      setSaveError(true)
      setHoursValue(formatDuration(activity.minutes))
      setTimeout(() => setSaveError(false), 3000)
    }
  }

  return (
    <div className={`grid grid-cols-[1fr_80px_1.2fr] gap-4 px-5 py-3 items-start ${!isLast ? 'border-b border-border-subtle' : ''}`}>
      {/* Column 1: Matter context (checkbox + time range + activity code) */}
      <div className="flex items-center gap-2 min-w-0">
        {activity.id && onSelectToggle ? (
          <input
            type="checkbox"
            checked={selected || false}
            onChange={() => onSelectToggle(activity.id!)}
            className="w-3.5 h-3.5 rounded border-border accent-accent cursor-pointer shrink-0"
          />
        ) : (
          <div className="w-3.5 shrink-0" />
        )}
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

      {/* Column 2: Hours */}
      <div className="font-mono text-[15px] font-semibold text-text-primary tabular-nums">
        {isEditingHours ? (
          <input
            type="number"
            className="w-16 bg-bg-surface border border-border-default rounded px-2 py-0.5 text-[15px] font-mono tabular-nums text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
            value={hoursValue}
            onChange={(e) => setHoursValue(e.target.value)}
            onBlur={handleHoursSave}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setHoursValue(formatDuration(activity.minutes)); setIsEditingHours(false) }
              if (e.key === 'Enter') { e.preventDefault(); handleHoursSave() }
            }}
            min="0.1"
            step="0.1"
            autoFocus
          />
        ) : (
          <div
            className="cursor-pointer hover:bg-bg-surface-hover rounded px-1 -mx-1 transition-colors"
            onClick={() => { setHoursValue(formatDuration(activity.minutes)); setIsEditingHours(true) }}
            title="Click to edit hours"
          >
            {hours}
          </div>
        )}
      </div>

      {/* Column 3: Narrative */}
      <div className="text-[14px] leading-relaxed text-text-secondary min-w-0">
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
            className="group cursor-pointer hover:bg-bg-surface-hover rounded px-1 -mx-1 transition-colors flex items-start gap-1"
            onClick={() => setIsEditingNarrative(true)}
            title="Click to edit"
          >
            <span className="flex-1">
              {activity.narrative || <span className="italic text-text-faint">Click to add narrative</span>}
            </span>
            <Pencil size={13} className="mt-0.5 shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        {saveError && (
          <div className="text-xs text-error mt-0.5">Failed to save. Please try again.</div>
        )}
      </div>
    </div>
  )
}
