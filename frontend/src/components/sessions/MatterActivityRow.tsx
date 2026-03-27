import { useState, useRef } from 'react'
import { Pencil } from 'lucide-react'
import type { Activity } from '@/lib/types'
import { formatDuration, formatTimeRange } from '@/lib/format'
import { api } from '@/lib/api'

interface MatterActivityRowProps {
  activity: Activity
  isLast: boolean
  onActivityUpdated?: (activity: Activity) => void
}

export function MatterActivityRow({ activity, isLast, onActivityUpdated }: MatterActivityRowProps) {
  const hours = formatDuration(activity.minutes)
  const [isEditingNarrative, setIsEditingNarrative] = useState(false)
  const [narrativeValue, setNarrativeValue] = useState(activity.narrative)
  const [saveError, setSaveError] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const isPending = activity.approval_status !== 'approved'

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

  async function handleApprove() {
    if (!activity.id) return
    try {
      const updated = await api.updateActivity(activity.id, {
        approval_status: isPending ? 'approved' : 'pending',
      })
      onActivityUpdated?.(updated)
    } catch {}
  }

  return (
    <div className={`py-4 ${!isLast ? 'border-b border-border-subtle' : ''}`}>
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
        <div className="flex items-center gap-3">
          <span className="text-[22px] font-mono font-semibold text-text-primary tabular-nums">
            {hours}
          </span>
          <button
            onClick={handleApprove}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-[var(--radius-sm)] border transition-colors cursor-pointer ${
              isPending
                ? 'border-warning/30 text-warning bg-warning-bg hover:opacity-80'
                : 'border-success/30 text-success bg-success-bg hover:opacity-80'
            }`}
          >
            {isPending ? 'PENDING REVIEW' : 'APPROVED'}
          </button>
        </div>
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
