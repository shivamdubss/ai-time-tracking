import { useState, useRef } from 'react'
import type { Activity, Matter } from '@/lib/types'
import { getCategoryBarColor } from '@/lib/types'
import { formatDuration } from '@/lib/format'
import { api } from '@/lib/api'

interface ActivityRowProps {
  activity: Activity
  isLast: boolean
  matters?: Matter[]
  onActivityUpdated?: (activity: Activity) => void
}

function getAppAbbrev(app: string): string {
  const lower = app.toLowerCase()
  if (lower.includes('code')) return 'VS'
  if (lower.includes('slack')) return 'Sl'
  if (lower.includes('chrome')) return 'Ch'
  if (lower.includes('zoom')) return 'Zm'
  if (lower.includes('word')) return 'Wo'
  if (lower.includes('acrobat') || lower.includes('pdf')) return 'Pd'
  if (lower.includes('outlook') || lower.includes('mail')) return 'Ma'
  if (lower.includes('safari')) return 'Sa'
  if (lower.includes('excel')) return 'Ex'
  if (lower.includes('teams')) return 'Tm'
  return app.slice(0, 2)
}

export function ActivityRow({ activity, isLast, matters, onActivityUpdated }: ActivityRowProps) {
  const category = activity.category || 'Administrative'
  const color = getCategoryBarColor(category)
  const hours = formatDuration(activity.minutes)
  const [isEditingNarrative, setIsEditingNarrative] = useState(false)
  const [narrativeValue, setNarrativeValue] = useState(activity.narrative)
  const [saveError, setSaveError] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const matterName = activity.matter_id
    ? matters?.find(m => m.id === activity.matter_id)?.name || 'Unknown'
    : null

  const billableValue = activity.effective_rate != null && activity.minutes > 0
    ? `$${((activity.minutes / 60) * activity.effective_rate).toFixed(0)}`
    : null

  async function handleNarrativeSave() {
    setIsEditingNarrative(false)
    if (narrativeValue === activity.narrative) return
    if (!activity.id) {
      // Legacy activity from JSON blob — no ID to update
      return
    }
    try {
      setSaveError(false)
      const updated = await api.updateActivity(activity.id, { narrative: narrativeValue })
      onActivityUpdated?.(updated)
    } catch {
      setSaveError(true)
      setNarrativeValue(activity.narrative) // Revert on error
      setTimeout(() => setSaveError(false), 3000)
    }
  }

  async function handleMatterChange(matterId: string) {
    if (!activity.id) return
    const newMatterId = matterId === '' ? null : matterId
    try {
      const updated = await api.updateActivity(activity.id, { matter_id: newMatterId })
      onActivityUpdated?.(updated)
    } catch {
      // Silently fail — matter dropdown reverts on next render
    }
  }

  return (
    <div
      className={`grid grid-cols-[1fr_80px_1.2fr] gap-4 py-3 text-[13px] ${
        !isLast ? 'border-b border-border-subtle' : ''
      }`}
    >
      <div>
        <div className="flex items-center gap-2 font-semibold text-text-primary">
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
            style={{ backgroundColor: color }}
          >
            {getAppAbbrev(activity.app)}
          </div>
          {activity.app}
        </div>
        <div className="text-xs text-text-muted mt-0.5 pl-7">{activity.context}</div>
        {matters && matters.length > 0 && (() => {
          const active = matters.filter(m => m.status === 'active')
          const billableMatters = active.filter(m => m.billing_type !== 'non-billable')
          const nonBillableMatters = active.filter(m => m.billing_type === 'non-billable')
          return (
            <div className="mt-1 pl-7">
              <select
                className="text-xs bg-transparent border border-border-subtle rounded px-1.5 py-0.5 text-text-muted cursor-pointer hover:border-border-default transition-colors"
                value={activity.matter_id || ''}
                onChange={(e) => handleMatterChange(e.target.value)}
              >
                <option value="">Unassigned</option>
                {billableMatters.length > 0 && (
                  <optgroup label="Client Matters">
                    {billableMatters.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                )}
                {nonBillableMatters.length > 0 && (
                  <optgroup label="Non-Billable">
                    {nonBillableMatters.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )
        })()}
      </div>

      <div className="font-mono text-[13px] text-text-muted tabular-nums">
        <div>{hours}</div>
        {billableValue && (
          <div className="text-xs text-text-faint">{billableValue}</div>
        )}
        {activity.billable === false && (
          <div className="text-[10px] text-text-faint italic font-sans">Non-billable</div>
        )}
      </div>

      <div className="text-[13px] leading-relaxed text-text-secondary">
        {matterName && (
          <div className="text-xs text-text-muted mb-1 font-medium">{matterName}</div>
        )}
        {isEditingNarrative ? (
          <textarea
            ref={inputRef}
            className="w-full bg-bg-surface border border-border-default rounded px-2 py-1 text-[13px] text-text-secondary resize-none focus:outline-none focus:ring-1 focus:ring-text-faint"
            value={narrativeValue}
            onChange={(e) => setNarrativeValue(e.target.value)}
            onBlur={handleNarrativeSave}
            onKeyDown={(e) => { if (e.key === 'Escape') { setNarrativeValue(activity.narrative); setIsEditingNarrative(false) } }}
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
          <div className="text-xs text-red-500 mt-0.5">Failed to save. Please try again.</div>
        )}
      </div>
    </div>
  )
}
