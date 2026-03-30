import { useState } from 'react'
import type { Activity, Matter } from '@/lib/types'

import { api } from '@/lib/api'

interface TimesheetAddEntryFormProps {
  dateStr: string
  matters?: Matter[]
  onEntryAdded: (activity: Activity) => void
  onCancel: () => void
}

export function TimesheetAddEntryForm({ dateStr, matters, onEntryAdded, onCancel }: TimesheetAddEntryFormProps) {
  const [narrative, setNarrative] = useState('')
  const [hours, setHours] = useState('0.1')
  const [matterId, setMatterId] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const activeMatters = matters?.filter(m => m.status === 'active') || []
  const billableMatters = activeMatters.filter(m => m.billing_type !== 'non-billable')
  const nonBillableMatters = activeMatters.filter(m => m.billing_type === 'non-billable')

  async function handleSave() {
    if (!narrative.trim()) {
      setError('Narrative is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const minutes = Math.round(parseFloat(hours) * 60)
      const result = await api.createManualEntry({
        date: dateStr,
        app: 'Manual Entry',
        context: 'Offline work',
        minutes,
        narrative: narrative.trim(),
        matter_id: matterId || undefined,
      })
      onEntryAdded(result)
    } catch {
      setError('Failed to add entry')
      setSaving(false)
    }
  }

  return (
    <div className="border-b border-border-subtle px-5 py-4">
      <div className="space-y-3">
        <textarea
          className="w-full bg-bg-surface border border-border-default rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-secondary resize-none focus:outline-none focus:ring-1 focus:ring-text-faint"
          placeholder="Describe the work performed..."
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          rows={2}
          autoFocus
        />

        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-text-muted">Hours:</label>
            <input
              type="number"
              className="w-16 bg-bg-surface border border-border-default rounded-[var(--radius-sm)] px-2 py-1 text-sm font-mono tabular-nums text-text-secondary focus:outline-none focus:ring-1 focus:ring-text-faint"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              min="0.1"
              step="0.1"
            />
          </div>

          <select
            className="text-xs bg-transparent border border-border-subtle rounded-[var(--radius-sm)] px-2 py-1 text-text-muted cursor-pointer hover:border-border-default transition-colors"
            value={matterId}
            onChange={(e) => setMatterId(e.target.value)}
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

        {error && <div className="text-xs text-error">{error}</div>}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium bg-accent text-inverse rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
