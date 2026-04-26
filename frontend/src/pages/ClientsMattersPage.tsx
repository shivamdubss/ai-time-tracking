import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, Plus, Pencil, Trash2, Briefcase, Search } from 'lucide-react'
import { api } from '@/lib/api'
import type { Client, Matter } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ClientModal } from '@/components/clients/ClientModal'
import { MatterModal } from '@/components/clients/MatterModal'

export function ClientsMattersPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
  const [showClientModal, setShowClientModal] = useState(false)
  const [showMatterModal, setShowMatterModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editingMatter, setEditingMatter] = useState<Matter | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      const data = await api.getClients()
      // Sort internal client to top
      const sorted = [...data].sort((a, b) => {
        if (a.is_internal && !b.is_internal) return -1
        if (!a.is_internal && b.is_internal) return 1
        return a.name.localeCompare(b.name)
      })
      setClients(sorted)
      // Auto-expand the internal client
      const internal = sorted.find(c => c.is_internal)
      if (internal) {
        setExpandedClients(prev => new Set([...prev, internal.id]))
      }
    } catch (e) {
      console.error('Failed to fetch clients:', e)
      setClients([])
    }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  function toggleClient(id: string) {
    setExpandedClients(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAddMatter(clientId: string) {
    setSelectedClientId(clientId)
    setEditingMatter(null)
    setShowMatterModal(true)
  }

  function handleEditMatter(matter: Matter) {
    setSelectedClientId(matter.client_id)
    setEditingMatter(matter)
    setShowMatterModal(true)
  }

  async function handleDeleteClient(clientId: string) {
    if (!confirm('Are you sure you want to delete this client?')) return
    try {
      await api.deleteClient(clientId)
      fetchClients()
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function handleDeleteMatter(matterId: string) {
    if (!confirm('Are you sure? Matters with time entries will be closed, not deleted.')) return
    try {
      await api.deleteMatter(matterId)
      fetchClients()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return clients
    return clients
      .map(c => {
        const clientMatch = c.name.toLowerCase().includes(q)
        const matchedMatters = (c.matters || []).filter(m =>
          m.name.toLowerCase().includes(q) ||
          (m.matter_number || '').toLowerCase().includes(q) ||
          (m.practice_area || '').toLowerCase().includes(q),
        )
        if (clientMatch) return c
        if (matchedMatters.length > 0) return { ...c, matters: matchedMatters }
        return null
      })
      .filter((c): c is Client => c !== null)
  }, [clients, searchQuery])

  return (
    <div className="flex flex-col gap-6 p-6 flex-1 min-h-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display font-bold text-xl text-text-primary">Clients & Matters</h1>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients and matters…"
              className="w-full h-9 pl-9 pr-3 text-sm bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-border-default focus:ring-1 focus:ring-border-default"
            />
          </div>
          <button
            onClick={() => { setEditingClient(null); setShowClientModal(true) }}
            className="h-9 inline-flex items-center gap-1.5 px-3 text-sm font-medium text-text-primary bg-surface border border-border rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
          >
            <Plus size={14} />
            Add Client
          </button>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Briefcase size={48} strokeWidth={1} className="mb-4 text-text-faint" />
          <p className="text-sm font-medium mb-1">No clients yet</p>
          <p className="text-xs text-text-faint mb-4">Add a client to start tracking time by matter</p>
          <Button variant="primary" onClick={() => { setEditingClient(null); setShowClientModal(true) }}>
            <Plus size={14} className="mr-1" />
            Add Your First Client
          </Button>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted bg-surface border border-border rounded-[var(--radius-md)]">
          <p className="text-sm">No clients or matters match "{searchQuery}"</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden">
          {filteredClients.map((client) => {
            const isExpanded = expandedClients.has(client.id)
            const activeMatters = (client.matters || []).filter(m => m.status === 'active')
            const closedMatters = (client.matters || []).filter(m => m.status === 'closed')

            return (
              <div key={client.id} className="border-b border-border-subtle last:border-b-0">
                {/* Client row */}
                <div
                  className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-surface-hover transition-colors"
                  onClick={() => toggleClient(client.id)}
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown
                      size={14}
                      className={cn(
                        'text-text-faint transition-transform duration-200',
                        isExpanded && 'rotate-180',
                      )}
                    />
                    <div>
                      <div className="font-display font-semibold text-sm text-text-primary">
                        {client.name}
                      </div>
                      <div className="text-xs text-text-muted">
                        {activeMatters.length} active {activeMatters.length === 1 ? 'matter' : 'matters'}
                        {client.default_rate ? ` · $${client.default_rate}/hr` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {!client.is_internal && (
                      <button
                        className="p-1.5 rounded hover:bg-bg-inset transition-colors text-text-faint hover:text-text-muted"
                        onClick={() => { setEditingClient(client); setShowClientModal(true) }}
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {!client.is_internal && (
                      <button
                        className="p-1.5 rounded hover:bg-bg-inset transition-colors text-text-faint hover:text-error"
                        onClick={() => handleDeleteClient(client.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Matters */}
                {isExpanded && (
                  <div className="pb-2">
                    {activeMatters.map((matter) => (
                      <div
                        key={matter.id}
                        className="flex items-center justify-between px-5 pl-12 py-2.5 hover:bg-surface-hover transition-colors"
                      >
                        <div>
                          <div className="text-sm text-text-primary font-medium">{matter.name}</div>
                          <div className="text-xs text-text-muted flex gap-2">
                            {matter.matter_number && <span>{matter.matter_number}</span>}
                            {matter.practice_area && <span>{matter.practice_area}</span>}
                            {matter.billing_type === 'non-billable'
                              ? <span className="text-text-faint italic">Non-billable</span>
                              : matter.hourly_rate && <span>${matter.hourly_rate}/hr</span>
                            }
                            {matter.keywords.length > 0 && (
                              <span className="text-text-faint">
                                Keywords: {matter.keywords.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        {!client.is_internal && (
                          <div className="flex items-center gap-1">
                            <button
                              className="p-1.5 rounded hover:bg-bg-inset transition-colors text-text-faint hover:text-text-muted"
                              onClick={() => handleEditMatter(matter)}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              className="p-1.5 rounded hover:bg-bg-inset transition-colors text-text-faint hover:text-error"
                              onClick={() => handleDeleteMatter(matter.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {closedMatters.length > 0 && (
                      <div className="px-5 pl-12 py-1.5 text-xs text-text-faint">
                        {closedMatters.length} closed {closedMatters.length === 1 ? 'matter' : 'matters'}
                      </div>
                    )}

                    <div className="px-5 pl-12 py-2">
                      <button
                        className="text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
                        onClick={() => handleAddMatter(client.id)}
                      >
                        <Plus size={12} />
                        Add Matter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showClientModal && (
        <ClientModal
          client={editingClient}
          onClose={() => setShowClientModal(false)}
          onSaved={() => { setShowClientModal(false); fetchClients() }}
        />
      )}

      {showMatterModal && selectedClientId && (
        <MatterModal
          clientId={selectedClientId}
          matter={editingMatter}
          onClose={() => setShowMatterModal(false)}
          onSaved={() => { setShowMatterModal(false); fetchClients() }}
        />
      )}

    </div>
  )
}
