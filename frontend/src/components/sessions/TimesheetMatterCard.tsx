import { useState, useRef, useEffect } from 'react'
import type { Activity, Matter, Client } from '@/lib/types'
import { formatDuration, formatTimeRange, joinNarratives } from '@/lib/format'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { DropdownMenu } from '@/components/ui/DropdownMenu'

interface TimesheetMatterCardProps {
  matter: Matter | null
  client: Client | null
  activities: Activity[]
  isFirst: boolean
  matters: Matter[]
  clients: Client[]
  onActivityUpdated: (activity: Activity) => void
  onActivityDeleted: (activityId: string) => void
  onDataRefresh?: () => void
}

export function TimesheetMatterCard({
  matter, client, activities, isFirst,
  matters, clients, onActivityUpdated, onActivityDeleted, onDataRefresh,
}: TimesheetMatterCardProps) {
  const totalMinutes = activities.reduce((sum, a) => sum + a.minutes, 0)
  const narrative = joinNarratives(activities.map(a => a.narrative))

  // Editing state
  const [isEditingMatter, setIsEditingMatter] = useState(false)
  const [isEditingNarrative, setIsEditingNarrative] = useState(false)
  const [narrativeValue, setNarrativeValue] = useState(narrative)
  const [isEditingHours, setIsEditingHours] = useState(false)
  const [hoursValue, setHoursValue] = useState(formatDuration(totalMinutes))
  const [expanded, setExpanded] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditingMatterName, setIsEditingMatterName] = useState(false)
  const [matterNameValue, setMatterNameValue] = useState(matter?.name || '')
  const [isEditingClientName, setIsEditingClientName] = useState(false)
  const [clientNameValue, setClientNameValue] = useState(client?.name || '')
  const narrativeRef = useRef<HTMLTextAreaElement>(null)

  // Sync external changes
  useEffect(() => {
    if (!isEditingNarrative) setNarrativeValue(narrative)
  }, [narrative, isEditingNarrative])
  useEffect(() => {
    if (!isEditingHours) setHoursValue(formatDuration(totalMinutes))
  }, [totalMinutes, isEditingHours])

  function showError(msg: string) {
    setSaveError(msg)
    setTimeout(() => setSaveError(null), 3000)
  }

  // Matter name rename
  async function handleMatterNameSave() {
    setIsEditingMatterName(false)
    if (!matter || matterNameValue.trim() === matter.name) return
    if (!matterNameValue.trim()) { setMatterNameValue(matter.name); return }
    setIsSaving(true)
    try {
      await api.updateMatter(matter.id, { name: matterNameValue.trim() })
      onDataRefresh?.()
    } catch {
      showError('Failed to rename matter')
      setMatterNameValue(matter.name)
    } finally {
      setIsSaving(false)
    }
  }

  // Client name rename
  async function handleClientNameSave() {
    setIsEditingClientName(false)
    if (!client || clientNameValue.trim() === client.name) return
    if (!clientNameValue.trim()) { setClientNameValue(client.name); return }
    setIsSaving(true)
    try {
      await api.updateClient(client.id, { name: clientNameValue.trim() })
      onDataRefresh?.()
    } catch {
      showError('Failed to rename client')
      setClientNameValue(client.name)
    } finally {
      setIsSaving(false)
    }
  }

  // Matter reassignment
  const clientMap = new Map(clients.map(c => [c.id, c]))
  const activeMatters = matters.filter(m => m.status === 'active')
  const billableMatters = activeMatters.filter(m => m.billing_type !== 'non-billable')
  const nonBillableMatters = activeMatters.filter(m => m.billing_type === 'non-billable')

  async function handleMatterChange(newMatterId: string) {
    setIsEditingMatter(false)
    const matterId = newMatterId || null
    if (matterId === (matter?.id || null)) return
    setIsSaving(true)
    try {
      const results = await Promise.allSettled(
        activities.map(a => api.updateActivity(a.id, { matter_id: matterId }))
      )
      for (const r of results) {
        if (r.status === 'fulfilled') onActivityUpdated(r.value)
      }
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) showError(`Failed to reassign ${failed} ${failed === 1 ? 'entry' : 'entries'}`)
    } catch {
      showError('Failed to reassign matter')
    } finally {
      setIsSaving(false)
    }
  }

  // Narrative save
  async function handleNarrativeSave() {
    setIsEditingNarrative(false)
    if (narrativeValue === narrative) return

    setIsSaving(true)
    try {
      if (activities.length === 1) {
        const updated = await api.updateActivity(activities[0].id, { narrative: narrativeValue })
        onActivityUpdated(updated)
      } else {
        // Save combined text to first activity; leave others untouched so
        // individual narratives survive reassignment and CSV export.
        // joinNarratives() handles dedup on next render via subsumption check.
        const first = activities[0]
        const updated = await api.updateActivity(first.id, { narrative: narrativeValue })
        onActivityUpdated(updated)
      }
    } catch {
      showError('Failed to save narrative')
      setNarrativeValue(narrative)
    } finally {
      setIsSaving(false)
    }
  }

  // Hours save
  async function handleHoursSave() {
    setIsEditingHours(false)
    const parsed = parseFloat(hoursValue)
    if (isNaN(parsed) || parsed < 0.1) {
      setHoursValue(formatDuration(totalMinutes))
      return
    }
    const newTotalMinutes = Math.round(parsed * 60)
    if (newTotalMinutes === totalMinutes) return

    setIsSaving(true)
    try {
      if (activities.length === 1) {
        const updated = await api.updateActivity(activities[0].id, { minutes: newTotalMinutes })
        onActivityUpdated(updated)
      } else {
        // Distribute proportionally
        const ratio = totalMinutes > 0 ? newTotalMinutes / totalMinutes : 1
        const distributed = activities.map(a => ({
          ...a,
          minutes: Math.max(1, Math.round(a.minutes * ratio)),
        }))
        // Fix rounding error on the largest activity
        const distTotal = distributed.reduce((s, a) => s + a.minutes, 0)
        if (distTotal !== newTotalMinutes) {
          const largest = distributed.reduce((max, a) => a.minutes > max.minutes ? a : max, distributed[0])
          largest.minutes += newTotalMinutes - distTotal
        }
        const results = await Promise.allSettled(
          distributed.map(a => api.updateActivity(a.id, { minutes: a.minutes }))
        )
        for (const r of results) {
          if (r.status === 'fulfilled') onActivityUpdated(r.value)
        }
        const failed = results.filter(r => r.status === 'rejected').length
        if (failed > 0) showError('Some entries failed to update')
      }
    } catch {
      showError('Failed to save hours')
      setHoursValue(formatDuration(totalMinutes))
    } finally {
      setIsSaving(false)
    }
  }

  // Delete all activities in this group
  async function handleDelete() {
    const count = activities.length
    const msg = count === 1
      ? 'Delete this entry?'
      : `Delete all ${count} entries for this matter?`
    if (!confirm(msg)) return

    setIsSaving(true)
    try {
      const results = await Promise.allSettled(
        activities.map(a => api.deleteActivity(a.id))
      )
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'fulfilled') onActivityDeleted(activities[i].id)
      }
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) showError(`Failed to delete ${failed} ${failed === 1 ? 'entry' : 'entries'}`)
    } catch {
      showError('Failed to delete')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className={cn(
        'px-5 py-3.5',
        !isFirst && 'border-t border-border-subtle',
        isSaving && 'opacity-60 pointer-events-none',
      )}
    >
      {/* Top row: matter info + hours + menu */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-2 h-2 rounded-full bg-accent-link shrink-0" />
          {isEditingMatter ? (
            <select
              className="text-sm bg-surface border border-border rounded-[var(--radius-sm)] px-2 py-1 text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint max-w-[240px]"
              value={matter?.id || ''}
              onChange={(e) => handleMatterChange(e.target.value)}
              onBlur={() => setIsEditingMatter(false)}
              onKeyDown={(e) => { if (e.key === 'Escape') setIsEditingMatter(false) }}
              autoFocus
            >
              <option value="">Unassigned</option>
              {billableMatters.length > 0 && (
                <optgroup label="Client Matters">
                  {billableMatters.map(m => {
                    const c = clientMap.get(m.client_id)
                    return (
                      <option key={m.id} value={m.id}>
                        {m.name}{c ? ` (${c.name})` : ''}
                      </option>
                    )
                  })}
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
          ) : isEditingMatterName && matter ? (
            <input
              className="text-sm bg-surface border border-border rounded-[var(--radius-sm)] px-2 py-1 font-display font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint max-w-[240px]"
              value={matterNameValue}
              onChange={(e) => setMatterNameValue(e.target.value)}
              onBlur={handleMatterNameSave}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setMatterNameValue(matter.name); setIsEditingMatterName(false) }
                if (e.key === 'Enter') { e.preventDefault(); handleMatterNameSave() }
              }}
              autoFocus
              placeholder="Matter name"
            />
          ) : (
            <div className="group flex items-center gap-1 min-w-0">
              <span
                className="font-display font-bold text-sm text-text-primary truncate cursor-pointer hover:bg-surface-hover rounded px-1 -mx-1 transition-colors"
                onClick={() => setIsEditingMatter(true)}
                title="Click to change matter"
              >
                {matter?.name || 'Unassigned'}
              </span>
              {matter && (
                <span title="Rename matter">
                  <Pencil
                    size={12}
                    className="shrink-0 text-text-faint hover:text-text-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => { setMatterNameValue(matter.name); setIsEditingMatterName(true) }}
                  />
                </span>
              )}
            </div>
          )}
          {!isEditingMatter && matter?.matter_number && (
            <span className="text-xs font-mono text-text-muted tabular-nums shrink-0">
              {matter.matter_number}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            aria-expanded={expanded}
          >
            <ChevronDown
              size={12}
              className={cn(
                'text-text-faint transition-transform duration-200',
                expanded && 'rotate-180',
              )}
            />
            {activities.length} {activities.length === 1 ? 'entry' : 'entries'}
          </button>
          {isEditingHours ? (
            <input
              type="number"
              className="w-16 bg-surface border border-border rounded px-2 py-0.5 text-sm font-mono font-semibold tabular-nums text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
              value={hoursValue}
              onChange={(e) => setHoursValue(e.target.value)}
              onBlur={handleHoursSave}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setHoursValue(formatDuration(totalMinutes)); setIsEditingHours(false) }
                if (e.key === 'Enter') { e.preventDefault(); handleHoursSave() }
              }}
              min="0.1"
              step="0.1"
              autoFocus
            />
          ) : (
            <span
              className="font-mono text-sm font-semibold text-text-primary tabular-nums cursor-pointer hover:bg-surface-hover rounded px-1 -mx-1 transition-colors"
              onClick={() => { setHoursValue(formatDuration(totalMinutes)); setIsEditingHours(true) }}
              title="Click to edit hours"
            >
              {formatDuration(totalMinutes)}
            </span>
          )}
          <DropdownMenu
            items={[
              { label: 'Delete', icon: <Trash2 size={14} />, onClick: handleDelete, variant: 'danger' },
            ]}
          />
        </div>
      </div>

      {/* Client name — click to rename */}
      {client && (
        <div className="ml-4 mt-0.5">
          {isEditingClientName ? (
            <input
              className="text-xs bg-surface border border-border rounded-[var(--radius-sm)] px-1.5 py-0.5 text-text-muted focus:outline-none focus:ring-1 focus:ring-text-faint"
              value={clientNameValue}
              onChange={(e) => setClientNameValue(e.target.value)}
              onBlur={handleClientNameSave}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setClientNameValue(client.name); setIsEditingClientName(false) }
                if (e.key === 'Enter') { e.preventDefault(); handleClientNameSave() }
              }}
              autoFocus
              placeholder="Client name"
            />
          ) : (
            <span
              className="text-xs text-text-muted cursor-pointer hover:bg-surface-hover rounded px-1 -mx-1 transition-colors inline-flex items-center gap-1 group"
              onClick={() => { setClientNameValue(client.name); setIsEditingClientName(true) }}
              title="Click to rename client"
            >
              {client.name}
              <Pencil size={10} className="shrink-0 text-text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
          )}
        </div>
      )}

      {/* Narrative draft — editable */}
      <div className="ml-4 mt-1.5">
        {isEditingNarrative ? (
          <textarea
            ref={narrativeRef}
            className="w-full bg-surface border border-border rounded px-2 py-1 text-[13px] leading-relaxed text-text-secondary resize-none focus:outline-none focus:ring-1 focus:ring-text-faint"
            value={narrativeValue}
            onChange={(e) => setNarrativeValue(e.target.value)}
            onBlur={handleNarrativeSave}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setNarrativeValue(narrative); setIsEditingNarrative(false) }
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNarrativeSave() }
            }}
            rows={3}
            autoFocus
          />
        ) : (
          <div
            className="group cursor-pointer hover:bg-surface-hover rounded px-1 -mx-1 transition-colors flex items-start gap-1"
            onClick={() => setIsEditingNarrative(true)}
            title="Click to edit narrative"
          >
            <p className="flex-1 text-[13px] leading-relaxed text-text-secondary line-clamp-2">
              {narrative || <span className="italic text-text-faint">Click to add narrative</span>}
            </p>
            <Pencil size={12} className="mt-0.5 shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>

      {/* Error message */}
      {saveError && (
        <div className="ml-4 mt-1 text-xs text-error">{saveError}</div>
      )}

      {/* Expanded activity audit list */}
      {expanded && (
        <div className="ml-4 mt-2 animate-in fade-in duration-200">
          <div className="border-t border-border-subtle pt-2">
            {(() => {
              const sorted = [...activities].sort((a, b) => {
                if (!a.start_time || !b.start_time) return 0
                return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
              })

              // Check if activities span multiple days
              const dates = new Set(sorted.map(a =>
                a.start_time ? new Date(a.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''
              ).filter(Boolean))
              const isMultiDay = dates.size > 1

              let lastDateLabel = ''
              return sorted.map((activity, i) => {
                const dateLabel = activity.start_time
                  ? new Date(activity.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                  : ''
                const showDateHeader = isMultiDay && dateLabel && dateLabel !== lastDateLabel
                if (dateLabel) lastDateLabel = dateLabel

                return (
                  <div key={activity.id || i}>
                    {showDateHeader && (
                      <div className={cn(
                        'flex items-center gap-2 py-1.5 text-[11px] font-medium text-text-muted uppercase tracking-wider',
                        i > 0 && 'mt-1 border-t border-border-subtle pt-2',
                      )}>
                        <span className="h-px flex-1 bg-border-subtle" />
                        <span>{dateLabel}</span>
                        <span className="h-px flex-1 bg-border-subtle" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'flex items-baseline gap-3 py-1.5 text-[13px]',
                        !showDateHeader && i > 0 && 'border-t border-border-subtle',
                      )}
                    >
                      <span className="font-mono text-text-muted tabular-nums shrink-0 text-xs">
                        {activity.start_time && activity.end_time
                          ? formatTimeRange(activity.start_time, activity.end_time)
                          : '---'}
                      </span>
                      <span className="font-mono text-text-primary tabular-nums shrink-0 text-xs font-semibold">
                        {formatDuration(activity.minutes)}
                      </span>
                      <span className="text-text-secondary truncate text-xs">
                        {activity.narrative || activity.app}
                      </span>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
