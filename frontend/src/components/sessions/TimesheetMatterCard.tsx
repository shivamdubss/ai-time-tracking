import { useState, useRef, useEffect } from 'react'
import type { Activity, Matter, Client } from '@/lib/types'
import { formatDuration, joinNarratives } from '@/lib/format'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { Pencil, Trash2 } from 'lucide-react'
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
}

export function TimesheetMatterCard({
  matter, client, activities, isFirst,
  matters, clients, onActivityUpdated, onActivityDeleted,
}: TimesheetMatterCardProps) {
  const totalMinutes = activities.reduce((sum, a) => sum + a.minutes, 0)
  const narrative = joinNarratives(activities.map(a => a.narrative))

  // Editing state
  const [isEditingMatter, setIsEditingMatter] = useState(false)
  const [isEditingNarrative, setIsEditingNarrative] = useState(false)
  const [narrativeValue, setNarrativeValue] = useState(narrative)
  const [isEditingHours, setIsEditingHours] = useState(false)
  const [hoursValue, setHoursValue] = useState(formatDuration(totalMinutes))
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
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
        // Save full text to first activity, clear the rest
        const [first, ...rest] = activities
        const results = await Promise.allSettled([
          api.updateActivity(first.id, { narrative: narrativeValue }),
          ...rest.map(a => api.updateActivity(a.id, { narrative: '' })),
        ])
        for (const r of results) {
          if (r.status === 'fulfilled') onActivityUpdated(r.value)
        }
        const failed = results.filter(r => r.status === 'rejected').length
        if (failed > 0) showError('Some entries failed to update')
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
          ) : (
            <div
              className="group flex items-center gap-1 cursor-pointer hover:bg-surface-hover rounded px-1 -mx-1 transition-colors min-w-0"
              onClick={() => setIsEditingMatter(true)}
              title="Click to change matter"
            >
              <span className="font-display font-bold text-sm text-text-primary truncate">
                {matter?.name || 'Unassigned'}
              </span>
              <Pencil size={12} className="shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
          {!isEditingMatter && matter?.matter_number && (
            <span className="text-xs font-mono text-text-muted tabular-nums shrink-0">
              {matter.matter_number}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-text-muted">
            {activities.length} {activities.length === 1 ? 'entry' : 'entries'}
          </span>
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

      {/* Client name */}
      {client && (
        <div className="ml-4 mt-0.5 text-xs text-text-muted">
          {client.name}
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
    </div>
  )
}
