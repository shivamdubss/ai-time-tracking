import { useState, useRef, useEffect, useMemo } from 'react'
import type { Activity, Matter, Client } from '@/lib/types'
import { getCategoryBarColor } from '@/lib/types'
import { formatDuration } from '@/lib/format'
import { formatTimeRange } from '@/lib/utils'
import { api } from '@/lib/api'
import { Select, type SelectOption } from '@/components/ui/Select'
import { MatterModal } from '@/components/clients/MatterModal'

interface ActivityRowProps {
  activity: Activity
  isLast: boolean
  matters?: Matter[]
  clients?: Client[]
  selected?: boolean
  onSelectToggle?: (activityId: string) => void
  onActivityUpdated?: (activity: Activity) => void
  onActivityDeleted?: (activityId: string) => void
  onDataRefresh?: () => void
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

function extractHHMM(iso?: string | null): string {
  if (!iso) return ''
  // Expecting "YYYY-MM-DDTHH:MM:SS" — take positions 11..16 for HH:MM
  const match = iso.match(/T(\d{2}:\d{2})/)
  return match?.[1] || ''
}

function extractDatePart(iso?: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

export function ActivityRow({ activity, isLast, matters, clients, selected, onSelectToggle, onActivityUpdated, onDataRefresh }: ActivityRowProps) {
  const category = activity.category || 'Administrative'
  const color = getCategoryBarColor(category)
  const hours = formatDuration(activity.minutes)
  const [isEditingNarrative, setIsEditingNarrative] = useState(false)
  const [narrativeValue, setNarrativeValue] = useState(activity.narrative)
  const [isEditingHours, setIsEditingHours] = useState(false)
  const [hoursValue, setHoursValue] = useState(formatDuration(activity.minutes))
  const [isEditingTime, setIsEditingTime] = useState(false)
  const [startTimeValue, setStartTimeValue] = useState(extractHHMM(activity.start_time))
  const [endTimeValue, setEndTimeValue] = useState(extractHHMM(activity.end_time))
  const [saveError, setSaveError] = useState(false)
  const [showMatterModal, setShowMatterModal] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const clientMap = useMemo(() => new Map(clients?.map(c => [c.id, c]) || []), [clients])
  const matterMap = useMemo(() => new Map(matters?.map(m => [m.id, m]) || []), [matters])
  const selectedMatter = activity.matter_id ? matterMap.get(activity.matter_id) || null : null
  const selectedClientId = selectedMatter?.client_id || ''

  // Optional client filter — derived from the matter, but user can override to filter matter options
  const [clientFilter, setClientFilter] = useState<string>(selectedClientId)
  useEffect(() => { setClientFilter(selectedClientId) }, [selectedClientId])

  useEffect(() => {
    if (!isEditingHours) {
      setHoursValue(formatDuration(activity.minutes))
    }
  }, [activity.minutes, isEditingHours])

  useEffect(() => {
    if (!isEditingTime) {
      setStartTimeValue(extractHHMM(activity.start_time))
      setEndTimeValue(extractHHMM(activity.end_time))
    }
  }, [activity.start_time, activity.end_time, isEditingTime])

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

  function handleClientChange(clientId: string) {
    setClientFilter(clientId)
    if (clientId && selectedMatter && selectedMatter.client_id !== clientId) {
      handleMatterChange('')
    } else if (!clientId && selectedMatter) {
      handleMatterChange('')
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

  async function handleTimeSave() {
    if (!activity.id) { setIsEditingTime(false); return }

    const origStart = extractHHMM(activity.start_time)
    const origEnd = extractHHMM(activity.end_time)
    const unchanged = startTimeValue === origStart && endTimeValue === origEnd
    if (unchanged) { setIsEditingTime(false); return }

    if (!/^\d{2}:\d{2}$/.test(startTimeValue) || !/^\d{2}:\d{2}$/.test(endTimeValue)) {
      setStartTimeValue(origStart)
      setEndTimeValue(origEnd)
      setIsEditingTime(false)
      return
    }

    const datePart = extractDatePart(activity.start_time) || extractDatePart(activity.end_time)
    if (!datePart) { setIsEditingTime(false); return }

    const newStart = `${datePart}T${startTimeValue}:00`
    const newEnd = `${datePart}T${endTimeValue}:00`
    const startMs = new Date(newStart).getTime()
    const endMs = new Date(newEnd).getTime()
    if (!isFinite(startMs) || !isFinite(endMs) || endMs <= startMs) {
      setStartTimeValue(origStart)
      setEndTimeValue(origEnd)
      setIsEditingTime(false)
      setSaveError(true)
      setTimeout(() => setSaveError(false), 3000)
      return
    }
    const newMinutes = Math.round((endMs - startMs) / 60000)

    setIsEditingTime(false)
    try {
      setSaveError(false)
      const updated = await api.updateActivity(activity.id, {
        start_time: newStart,
        end_time: newEnd,
        minutes: newMinutes,
      })
      onActivityUpdated?.(updated)
    } catch {
      setSaveError(true)
      setStartTimeValue(origStart)
      setEndTimeValue(origEnd)
      setTimeout(() => setSaveError(false), 3000)
    }
  }

  const activeMatters = useMemo(
    () => (matters || []).filter(m => m.status === 'active'),
    [matters],
  )
  const visibleMatters = useMemo(
    () => (clientFilter ? activeMatters.filter(m => m.client_id === clientFilter) : activeMatters),
    [activeMatters, clientFilter],
  )
  const billableMatters = visibleMatters.filter(m => m.billing_type !== 'non-billable')
  const nonBillableMatters = visibleMatters.filter(m => m.billing_type === 'non-billable')
  const billableClients = (clients || []).filter(c => !c.is_internal)
  const timeLabel = activity.start_time && activity.end_time
    ? formatTimeRange(activity.start_time, activity.end_time)
    : null

  const matterOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [{ value: '', label: 'Unassigned' }]
    for (const m of billableMatters) opts.push({ value: m.id, label: m.name, group: 'Client Matters' })
    for (const m of nonBillableMatters) opts.push({ value: m.id, label: m.name, group: 'Non-Billable' })
    return opts
  }, [billableMatters, nonBillableMatters])

  const clientOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [{ value: '', label: 'No client' }]
    for (const c of billableClients) opts.push({ value: c.id, label: c.name })
    return opts
  }, [billableClients])

  return (
    <div
      className={`grid grid-cols-[24px_1fr_200px_80px_1.2fr] gap-4 py-3 text-[13px] items-start ${
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

      <div className="min-w-0 flex items-start gap-3">
        {/* App badge with custom tooltip */}
        <div className="relative group mt-0.5 shrink-0">
          <div
            className="w-5 h-5 rounded-[var(--radius-sm)] flex items-center justify-center text-[9px] font-bold text-white cursor-help"
            style={{ backgroundColor: color }}
          >
            {getAppAbbrev(activity.app)}
          </div>
          <span className="pointer-events-none absolute left-0 top-full mt-1 z-20 whitespace-nowrap rounded-[var(--radius-sm)] px-2 py-1 text-[11px] font-medium bg-text-primary text-text-inverse opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
            {activity.app}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Matter — primary label */}
          {matters && matters.length > 0 ? (
            <Select
              ariaLabel="Matter"
              value={activity.matter_id || ''}
              options={matterOptions}
              onChange={handleMatterChange}
              onCreateNew={() => setShowMatterModal(true)}
              createNewLabel="New matter…"
              className="font-body font-medium text-sm text-text-primary bg-transparent hover:bg-surface-hover focus:bg-surface-hover focus:outline-none rounded-[var(--radius-sm)] px-1.5 py-0.5 -mx-1.5 max-w-full"
            />
          ) : null}

          {/* Secondary line: client */}
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
            {selectedMatter?.billing_type === 'non-billable' ? (
              <span className="text-text-muted">Non-billable</span>
            ) : (
              <Select
                ariaLabel="Client"
                value={clientFilter}
                options={clientOptions}
                onChange={handleClientChange}
                className="bg-transparent hover:bg-surface-hover focus:bg-surface-hover focus:outline-none rounded-[var(--radius-sm)] px-1 py-0.5 -mx-1 max-w-[220px] text-xs text-text-muted"
              />
            )}
          </div>
        </div>
      </div>

      {/* Time column — editable start – end range */}
      <div className="font-mono text-[13px] text-text-muted tabular-nums pt-0.5">
        {isEditingTime ? (
          <div
            className="flex items-center gap-1.5"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) handleTimeSave()
            }}
          >
            <input
              type="time"
              value={startTimeValue}
              onChange={(e) => setStartTimeValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setStartTimeValue(extractHHMM(activity.start_time))
                  setEndTimeValue(extractHHMM(activity.end_time))
                  setIsEditingTime(false)
                }
                if (e.key === 'Enter') { e.preventDefault(); handleTimeSave() }
              }}
              className="w-[90px] bg-surface border border-border rounded-[var(--radius-sm)] px-2 py-1 text-[12px] font-mono tabular-nums text-text-secondary focus:outline-none focus:ring-1 focus:ring-border-default"
              autoFocus
            />
            <span className="text-text-faint">–</span>
            <input
              type="time"
              value={endTimeValue}
              onChange={(e) => setEndTimeValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setStartTimeValue(extractHHMM(activity.start_time))
                  setEndTimeValue(extractHHMM(activity.end_time))
                  setIsEditingTime(false)
                }
                if (e.key === 'Enter') { e.preventDefault(); handleTimeSave() }
              }}
              className="w-[90px] bg-surface border border-border rounded-[var(--radius-sm)] px-2 py-1 text-[12px] font-mono tabular-nums text-text-secondary focus:outline-none focus:ring-1 focus:ring-border-default"
            />
          </div>
        ) : timeLabel ? (
          <div
            className="cursor-pointer hover:bg-surface-hover rounded-[var(--radius-sm)] px-1 -mx-1 transition-colors"
            onClick={() => {
              setStartTimeValue(extractHHMM(activity.start_time))
              setEndTimeValue(extractHHMM(activity.end_time))
              setIsEditingTime(true)
            }}
            title="Click to edit times"
          >
            {timeLabel}
          </div>
        ) : (
          <span className="text-text-faint">—</span>
        )}
      </div>

      <div className="font-mono text-[13px] text-text-muted tabular-nums">
        {isEditingHours ? (
          <input
            type="number"
            className="w-16 bg-surface border border-border rounded-[var(--radius-sm)] px-2 py-0.5 text-[13px] font-mono tabular-nums text-text-secondary focus:outline-none focus:ring-1 focus:ring-border-default"
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
            className="cursor-pointer hover:bg-surface-hover rounded-[var(--radius-sm)] px-1 -mx-1 transition-colors"
            onClick={() => { setHoursValue(formatDuration(activity.minutes)); setIsEditingHours(true) }}
            title="Click to edit hours"
          >
            {hours}
          </div>
        )}
      </div>

      <div className="text-[13px] leading-relaxed text-text-secondary">
        {isEditingNarrative ? (
          <textarea
            ref={inputRef}
            className="w-full bg-surface border border-border rounded-[var(--radius-sm)] px-2 py-1 text-[13px] text-text-secondary resize-none focus:outline-none focus:ring-1 focus:ring-border-default"
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
            className="cursor-pointer hover:bg-surface-hover rounded-[var(--radius-sm)] px-1 -mx-1 transition-colors"
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

      {showMatterModal && (
        <MatterModal
          matter={null}
          clients={clients}
          clientId={selectedClientId || undefined}
          onClose={() => setShowMatterModal(false)}
          onSaved={async (newMatter) => {
            setShowMatterModal(false)
            if (activity.id) {
              try {
                const updated = await api.updateActivity(activity.id, { matter_id: newMatter.id })
                onActivityUpdated?.(updated)
              } catch {}
            }
            onDataRefresh?.()
          }}
        />
      )}
    </div>
  )
}
