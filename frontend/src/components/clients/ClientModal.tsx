import { useState } from 'react'
import { X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Client } from '@/lib/types'
import { Button } from '@/components/ui/Button'

interface ClientModalProps {
  client: Client | null
  onClose: () => void
  onSaved: () => void
}

export function ClientModal({ client, onClose, onSaved }: ClientModalProps) {
  const isEditing = client !== null
  const [name, setName] = useState(client?.name || '')
  const [contactInfo, setContactInfo] = useState(client?.contact_info || '')
  const [billingAddress, setBillingAddress] = useState(client?.billing_address || '')
  const [defaultRate, setDefaultRate] = useState(client?.default_rate?.toString() || '')
  const [notes, setNotes] = useState(client?.notes || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      setError('Client name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = {
        name: name.trim(),
        contact_info: contactInfo.trim() || undefined,
        billing_address: billingAddress.trim() || undefined,
        default_rate: defaultRate ? parseFloat(defaultRate) : undefined,
        notes: notes.trim() || undefined,
      }
      if (isEditing) {
        await api.updateClient(client.id, data)
      } else {
        await api.createClient(data)
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
        className="bg-surface border border-border rounded-[var(--radius-lg)] shadow-lg w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg text-text-primary">
            {isEditing ? 'Edit Client' : 'New Client'}
          </h2>
          <button onClick={onClose} className="text-text-faint hover:text-text-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Name *</label>
            <input
              className="w-full bg-bg-page border border-border-default rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Acme Corporation"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Default Hourly Rate</label>
            <input
              className="w-full bg-bg-page border border-border-default rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
              value={defaultRate}
              onChange={(e) => setDefaultRate(e.target.value)}
              placeholder="e.g., 350"
              type="number"
              step="0.01"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Contact Info</label>
            <input
              className="w-full bg-bg-page border border-border-default rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Email, phone, or other contact details"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Billing Address</label>
            <input
              className="w-full bg-bg-page border border-border-default rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Billing address"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Notes</label>
            <textarea
              className="w-full bg-bg-page border border-border-default rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes"
              rows={2}
            />
          </div>

          {error && <div className="text-xs text-error">{error}</div>}

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Client'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
