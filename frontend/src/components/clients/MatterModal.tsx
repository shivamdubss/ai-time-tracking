import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import type { Matter } from '@/lib/types'
import { Button } from '@/components/ui/Button'

interface MatterModalProps {
  clientId: string
  matter: Matter | null
  onClose: () => void
  onSaved: () => void
}

export function MatterModal({ clientId, matter, onClose, onSaved }: MatterModalProps) {
  const isEditing = matter !== null
  const [name, setName] = useState(matter?.name || '')
  const [matterNumber, setMatterNumber] = useState(matter?.matter_number || '')
  const [practiceArea, setPracticeArea] = useState(matter?.practice_area || '')
  const [billingType, setBillingType] = useState(matter?.billing_type || 'hourly')
  const [hourlyRate, setHourlyRate] = useState(matter?.hourly_rate?.toString() || '')
  const [keywordsInput, setKeywordsInput] = useState((matter?.keywords || []).join(', '))
  const [notes, setNotes] = useState(matter?.notes || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      setError('Matter name is required')
      return
    }
    setSaving(true)
    setError('')

    const keywords = keywordsInput
      .split(',')
      .map(k => k.trim())
      .filter(Boolean)

    try {
      const data = {
        client_id: clientId,
        name: name.trim(),
        matter_number: matterNumber.trim() || undefined,
        practice_area: practiceArea.trim() || undefined,
        billing_type: billingType,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
        notes: notes.trim() || undefined,
      }
      if (isEditing) {
        await api.updateMatter(matter.id, data)
      } else {
        await api.createMatter(data)
      }
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-[var(--radius-lg)] shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg text-text-primary">
            {isEditing ? 'Edit Matter' : 'New Matter'}
          </h2>
          <button onClick={onClose} className="text-text-faint hover:text-text-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Matter Name *</label>
            <input
              className="w-full bg-bg-page border border-border-default rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Smith v. Jones"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Matter Number</label>
              <input
                className="w-full bg-bg-page border border-border-default rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
                value={matterNumber}
                onChange={(e) => setMatterNumber(e.target.value)}
                placeholder="e.g., 2024-CV-1234"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Practice Area</label>
              <input
                className="w-full bg-bg-page border border-border-default rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
                value={practiceArea}
                onChange={(e) => setPracticeArea(e.target.value)}
                placeholder="e.g., Litigation"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Billing Type</label>
              <select
                className="w-full bg-bg-page border border-border-default rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
                value={billingType}
                onChange={(e) => setBillingType(e.target.value)}
              >
                <option value="hourly">Hourly</option>
                <option value="flat">Flat Fee</option>
                <option value="contingency">Contingency</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Hourly Rate Override</label>
              <input
                className="w-full bg-bg-page border border-border-default rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="Leave blank to use client rate"
                type="number"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">
              Keywords <span className="text-text-faint">(for auto-matching window titles)</span>
            </label>
            <input
              className="w-full bg-bg-page border border-border-default rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
              placeholder="e.g., smith, jones, 2024-CV-1234 (comma-separated)"
            />
            <div className="text-xs text-text-faint mt-1">
              The matter name is always matched automatically. Add extra keywords for document names, case numbers, etc.
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Notes</label>
            <textarea
              className="w-full bg-bg-page border border-border-default rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Matter notes, billing instructions, etc."
              rows={3}
            />
          </div>

          {error && <div className="text-xs text-red-500">{error}</div>}

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Matter'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
