import { useState } from 'react'
import type { Activity, Matter } from '@/lib/types'
import { LEGAL_CATEGORIES } from '@/lib/types'
import { UTBMS_CODE_LIST } from '@/lib/utbms'
import { api } from '@/lib/api'

interface AddActivityFormProps {
  sessionId: string
  matters?: Matter[]
  onActivityAdded: (activity: Activity) => void
  onCancel: () => void
}

export function AddActivityForm({ sessionId, matters, onActivityAdded, onCancel }: AddActivityFormProps) {
  const [narrative, setNarrative] = useState('')
  const [hours, setHours] = useState('0.1')
  const [category, setCategory] = useState('Administrative')
  const [matterId, setMatterId] = useState('')
  const [activityCode, setActivityCode] = useState('')
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
      const result = await api.createActivity(sessionId, {
        app: 'Manual Entry',
        context: 'Offline work',
        minutes,
        narrative: narrative.trim(),
        category,
        matter_id: matterId || undefined,
        activity_code: activityCode || undefined,
      })
      onActivityAdded(result)
    } catch {
      setError('Failed to add activity')
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-border-subtle pt-3 pb-2 px-1">
      <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
        Add Entry
      </div>

      <div className="space-y-2">
        {/* Narrative */}
        <textarea
          className="w-full bg-bg-surface border border-border-default rounded px-2 py-1.5 text-[13px] text-text-secondary resize-none focus:outline-none focus:ring-1 focus:ring-text-faint"
          placeholder="Describe the work performed..."
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          rows={2}
          autoFocus
        />

        <div className="flex gap-2 flex-wrap items-center">
          {/* Hours */}
          <div className="flex items-center gap-1">
            <label className="text-xs text-text-muted">Hours:</label>
            <input
              type="number"
              className="w-16 bg-bg-surface border border-border-default rounded px-1.5 py-0.5 text-[13px] font-mono tabular-nums text-text-secondary focus:outline-none focus:ring-1 focus:ring-text-faint"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              min="0.1"
              step="0.1"
            />
          </div>

          {/* Category */}
          <select
            className="text-xs bg-transparent border border-border-subtle rounded px-1.5 py-0.5 text-text-muted cursor-pointer hover:border-border-default transition-colors"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {LEGAL_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Activity code */}
          <select
            className="text-xs bg-transparent border border-border-subtle rounded px-1.5 py-0.5 text-text-muted cursor-pointer hover:border-border-default transition-colors"
            value={activityCode}
            onChange={(e) => setActivityCode(e.target.value)}
          >
            <option value="">No code</option>
            {UTBMS_CODE_LIST.map(({ code, label }) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>

          {/* Matter */}
          <select
            className="text-xs bg-transparent border border-border-subtle rounded px-1.5 py-0.5 text-text-muted cursor-pointer hover:border-border-default transition-colors"
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

        {error && <div className="text-xs text-red-500">{error}</div>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-xs font-medium bg-accent text-inverse rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
