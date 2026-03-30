import { useState, useRef, useEffect } from 'react'
import type { Activity, Matter, Client } from '@/lib/types'
import { getCategoryBarColor } from '@/lib/types'
import { formatDuration } from '@/lib/format'
import { api } from '@/lib/api'
import { Pencil } from 'lucide-react'

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

export function ActivityRow({ activity, isLast, matters, clients, selected, onSelectToggle, onActivityUpdated, onActivityDeleted, onDataRefresh }: ActivityRowProps) {
  const category = activity.category || 'Administrative'
  const color = getCategoryBarColor(category)
  const hours = formatDuration(activity.minutes)
  const [isEditingNarrative, setIsEditingNarrative] = useState(false)
  const [narrativeValue, setNarrativeValue] = useState(activity.narrative)
  const [isEditingHours, setIsEditingHours] = useState(false)
  const [hoursValue, setHoursValue] = useState(formatDuration(activity.minutes))
  const [saveError, setSaveError] = useState(false)
  const [isEditingMatterName, setIsEditingMatterName] = useState(false)
  const [matterNameValue, setMatterNameValue] = useState('')
  const [isEditingClientName, setIsEditingClientName] = useState(false)
  const [clientNameValue, setClientNameValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const clientMap = new Map(clients?.map(c => [c.id, c]) || [])

  useEffect(() => {
    if (!isEditingHours) {
      setHoursValue(formatDuration(activity.minutes))
    }
  }, [activity.minutes, isEditingHours])

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

  const selectedMatter = matters?.find(m => m.id === activity.matter_id) || null
  const selectedClient = selectedMatter ? clientMap.get(selectedMatter.client_id) || null : null

  async function handleMatterNameSave() {
    setIsEditingMatterName(false)
    if (!selectedMatter || matterNameValue.trim() === selectedMatter.name) return
    if (!matterNameValue.trim()) { setMatterNameValue(selectedMatter.name); return }
    try {
      setSaveError(false)
      await api.updateMatter(selectedMatter.id, { name: matterNameValue.trim() })
      onDataRefresh?.()
    } catch {
      setSaveError(true)
      setMatterNameValue(selectedMatter.name)
      setTimeout(() => setSaveError(false), 3000)
    }
  }

  async function handleClientNameSave() {
    setIsEditingClientName(false)
    if (!selectedClient || clientNameValue.trim() === selectedClient.name) return
    if (!clientNameValue.trim()) { setClientNameValue(selectedClient.name); return }
    try {
      setSaveError(false)
      await api.updateClient(selectedClient.id, { name: clientNameValue.trim() })
      onDataRefresh?.()
    } catch {
      setSaveError(true)
      setClientNameValue(selectedClient.name)
      setTimeout(() => setSaveError(false), 3000)
    }
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

        {/* Matter dropdown + client name */}
        {matters && matters.length > 0 && (() => {
          const active = matters.filter(m => m.status === 'active')
          const billableMatters = active.filter(m => m.billing_type !== 'non-billable')
          const nonBillableMatters = active.filter(m => m.billing_type === 'non-billable')
          return (
            <div className="mt-1 pl-7">
              <div className="flex items-center gap-1.5">
                <select
                  className="text-xs bg-transparent border border-border-subtle rounded px-1.5 py-0.5 text-text-muted cursor-pointer hover:border-border-default transition-colors"
                  value={activity.matter_id || ''}
                  onChange={(e) => handleMatterChange(e.target.value)}
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
                {selectedMatter && (
                  <span title="Rename matter">
                    <Pencil
                      size={11}
                      className="shrink-0 text-text-faint hover:text-text-muted cursor-pointer transition-colors"
                      onClick={() => { setMatterNameValue(selectedMatter.name); setIsEditingMatterName(true) }}
                    />
                  </span>
                )}
              </div>
              {isEditingMatterName && selectedMatter && (
                <input
                  className="mt-1 w-full max-w-[240px] text-xs bg-bg-surface border border-border-default rounded px-1.5 py-0.5 text-text-secondary focus:outline-none focus:ring-1 focus:ring-text-faint"
                  value={matterNameValue}
                  onChange={(e) => setMatterNameValue(e.target.value)}
                  onBlur={handleMatterNameSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setMatterNameValue(selectedMatter.name); setIsEditingMatterName(false) }
                    if (e.key === 'Enter') { e.preventDefault(); handleMatterNameSave() }
                  }}
                  autoFocus
                  placeholder="Matter name"
                />
              )}
              {selectedClient && !isEditingClientName && (
                <div
                  className="mt-0.5 text-xs text-text-muted cursor-pointer hover:bg-bg-surface-hover rounded px-1 -mx-1 transition-colors inline-flex items-center gap-1 group"
                  onClick={() => { setClientNameValue(selectedClient.name); setIsEditingClientName(true) }}
                  title="Click to rename client"
                >
                  {selectedClient.name}
                  <Pencil size={10} className="shrink-0 text-text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
              {isEditingClientName && selectedClient && (
                <input
                  className="mt-0.5 w-full max-w-[200px] text-xs bg-bg-surface border border-border-default rounded px-1.5 py-0.5 text-text-muted focus:outline-none focus:ring-1 focus:ring-text-faint"
                  value={clientNameValue}
                  onChange={(e) => setClientNameValue(e.target.value)}
                  onBlur={handleClientNameSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setClientNameValue(selectedClient.name); setIsEditingClientName(false) }
                    if (e.key === 'Enter') { e.preventDefault(); handleClientNameSave() }
                  }}
                  autoFocus
                  placeholder="Client name"
                />
              )}
            </div>
          )
        })()}
      </div>

      <div className="font-mono text-[13px] text-text-muted tabular-nums">
        {isEditingHours ? (
          <input
            type="number"
            className="w-16 bg-bg-surface border border-border-default rounded px-2 py-0.5 text-[13px] font-mono tabular-nums text-text-secondary focus:outline-none focus:ring-1 focus:ring-text-faint"
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

      <div className="text-[13px] leading-relaxed text-text-secondary">
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
