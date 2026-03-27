import { useState, useRef } from 'react'
import type { Activity, Matter } from '@/lib/types'
import { LEGAL_CATEGORIES, getCategoryBarColor } from '@/lib/types'
import { formatDuration, roundToDecimalHours } from '@/lib/format'
import { UTBMS_CODE_LIST } from '@/lib/utbms'
import { api } from '@/lib/api'

interface ActivityRowProps {
  activity: Activity
  isLast: boolean
  matters?: Matter[]
  selected?: boolean
  onSelectToggle?: (activityId: string) => void
  onActivityUpdated?: (activity: Activity) => void
  onActivityDeleted?: (activityId: string) => void
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

export function ActivityRow({ activity, isLast, matters, selected, onSelectToggle, onActivityUpdated, onActivityDeleted }: ActivityRowProps) {
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
    ? `$${(roundToDecimalHours(activity.minutes) * activity.effective_rate).toFixed(0)}`
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

  async function handleMatterChange(matterId: string) {
    if (!activity.id) return
    const newMatterId = matterId === '' ? null : matterId
    try {
      const updated = await api.updateActivity(activity.id, { matter_id: newMatterId })
      onActivityUpdated?.(updated)
    } catch {}
  }

  async function handleCategoryChange(newCategory: string) {
    if (!activity.id) return
    try {
      const updated = await api.updateActivity(activity.id, { category: newCategory })
      onActivityUpdated?.(updated)
    } catch {}
  }

  async function handleActivityCodeChange(code: string) {
    if (!activity.id) return
    try {
      const updated = await api.updateActivity(activity.id, { activity_code: code || undefined })
      onActivityUpdated?.(updated)
    } catch {}
  }

  return (
    <div
      className={`grid grid-cols-[24px_1fr_80px_1.2fr] gap-4 py-3 text-[13px] items-start ${
        !isLast ? 'border-b border-border-subtle' : ''
      }`}
    >
      {/* Selection checkbox */}
      {activity.id && onSelectToggle ? (
        <input
          type="checkbox"
          checked={selected || false}
          onChange={() => onSelectToggle(activity.id!)}
          className="mt-1 w-3.5 h-3.5 rounded border-border accent-accent cursor-pointer"
        />
      ) : (
        <div />
      )}

      <div>
        <div className="flex items-center gap-2 font-semibold text-text-primary">
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
            style={{ backgroundColor: color }}
          >
            {getAppAbbrev(activity.app)}
          </div>
          {activity.app}
          {activity.activity_code && (
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-bg-inset text-text-muted">
              {activity.activity_code}
            </span>
          )}
        </div>
        <div className="text-xs text-text-muted mt-0.5 pl-7">{activity.context}</div>

        {/* Category dropdown */}
        {activity.id && (
          <div className="mt-1 pl-7">
            <select
              className="text-xs bg-transparent border border-border-subtle rounded px-1.5 py-0.5 text-text-muted cursor-pointer hover:border-border-default transition-colors"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              {LEGAL_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Activity code dropdown */}
            <select
              className="text-xs bg-transparent border border-border-subtle rounded px-1.5 py-0.5 text-text-muted cursor-pointer hover:border-border-default transition-colors ml-1"
              value={activity.activity_code || ''}
              onChange={(e) => handleActivityCodeChange(e.target.value)}
            >
              <option value="">No code</option>
              {UTBMS_CODE_LIST.map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Matter dropdown */}
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
  )
}
