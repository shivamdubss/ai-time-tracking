import { useState, useEffect, useRef } from 'react'
import { X, Calendar, Mail, Check, ChevronDown, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIntegrations } from '@/hooks/useIntegrations'
import { useTracking } from '@/hooks/useTrackingContext'

type Stage = 'configure' | 'fetching' | 'review'
type Source = 'calendar' | 'email'

interface ProposedEntry {
  id: string
  source: Source
  date: string
  time: string
  start_time?: string | null
  end_time?: string | null
  duration: number // minutes
  category: string
  matter_id?: string | null
  matter_name?: string | null
  // local-only UI fields
  matter: string | null        // display name shown in dropdown
  narrative: string
  confidence: 'high' | 'medium' | 'low'
}

function fmtDuration(minutes: number) {
  return (minutes / 60).toFixed(2) + 'h'
}

function fmtDateToISO(display: string): string {
  // "March 25, 2026" → "2026-03-25"
  try {
    return new Date(display).toISOString().slice(0, 10)
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

function SourceIcon({ source }: { source: Source }) {
  if (source === 'calendar') return <Calendar size={13} className="shrink-0" style={{ color: '#15803D' }} />
  return <Mail size={13} className="shrink-0" style={{ color: '#2563EB' }} />
}

interface ImportModalProps {
  open: boolean
  onClose: () => void
  onImported?: () => void
}

export function ImportModal({ open, onClose, onImported }: ImportModalProps) {
  const { status, fetchPreview, confirmEntries } = useIntegrations()
  const { matters } = useTracking()

  const [stage, setStage] = useState<Stage>('configure')
  const [entries, setEntries] = useState<ProposedEntry[]>([])
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
  const [deniedIds, setDeniedIds] = useState<Set<string>>(new Set())
  const [calEnabled, setCalEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [startDateDisplay, setStartDateDisplay] = useState('')
  const [endDateDisplay, setEndDateDisplay] = useState('')
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'fetching' | 'analyzing' | 'done' | 'error'>('idle')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<'duration' | 'narrative' | null>(null)

  // Initialize default date range to last 7 days
  useEffect(() => {
    if (open) {
      const end = new Date()
      const start = new Date()
      start.setDate(end.getDate() - 6)
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      setStartDateDisplay(fmt(start))
      setEndDateDisplay(fmt(end))
      setStage('configure')
      setEntries([])
      setApprovedIds(new Set())
      setDeniedIds(new Set())
      setFetchStatus('idle')
      setFetchError(null)
      setEditingId(null)
      setEditingField(null)
    }
  }, [open])

  async function handleFetch() {
    const sources: string[] = []
    if (calEnabled) sources.push('calendar')
    if (emailEnabled) sources.push('email')

    const startISO = fmtDateToISO(startDateDisplay)
    const endISO = fmtDateToISO(endDateDisplay)

    setFetchError(null)
    setStage('fetching')
    setFetchStatus('fetching')

    try {
      // Short delay so the "fetching" step is visible
      await new Promise(r => setTimeout(r, 700))
      setFetchStatus('analyzing')

      const raw = await fetchPreview(startISO, endISO, sources)

      // Normalize entries: map matter_name → matter for the dropdown
      const normalized: ProposedEntry[] = raw.map((e: any) => ({
        ...e,
        matter: e.matter_name ?? e.matter ?? null,
      }))

      setEntries(normalized)
      setFetchStatus('done')
      await new Promise(r => setTimeout(r, 400))
      setStage('review')
    } catch (err: any) {
      setFetchError(err.message || 'Unknown error')
      setFetchStatus('error')
    }
  }

  async function handleConfirm() {
    const toConfirm = entries.filter(e => approvedIds.has(e.id))
    if (!toConfirm.length) return
    setConfirming(true)
    try {
      await confirmEntries(toConfirm)
      onImported?.()
      onClose()
    } catch (err: any) {
      setFetchError(err.message || 'Failed to save entries')
    } finally {
      setConfirming(false)
    }
  }

  function approveEntry(id: string) {
    setApprovedIds(prev => new Set([...prev, id]))
    setDeniedIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }
  function denyEntry(id: string) {
    setDeniedIds(prev => new Set([...prev, id]))
    setApprovedIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }
  function undoEntry(id: string) {
    setApprovedIds(prev => { const s = new Set(prev); s.delete(id); return s })
    setDeniedIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }
  function approveAllConfident() {
    const ids = entries.filter(e => e.confidence === 'high' && !approvedIds.has(e.id) && !deniedIds.has(e.id)).map(e => e.id)
    setApprovedIds(prev => new Set([...prev, ...ids]))
  }
  function updateEntry(id: string, field: keyof ProposedEntry, value: string | number | null) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  // Group by matter name, unassigned last
  const matterOrder = Array.from(new Set(entries.filter(e => e.matter).map(e => e.matter as string)))
  const grouped: Record<string, ProposedEntry[]> = {}
  for (const m of matterOrder) {
    const rows = entries.filter(e => e.matter === m)
    if (rows.length) grouped[m] = rows
  }
  const unassigned = entries.filter(e => !e.matter)
  if (unassigned.length) grouped['__unassigned__'] = unassigned

  const highCount = entries.filter(e => e.confidence === 'high' && !approvedIds.has(e.id) && !deniedIds.has(e.id)).length
  const approvedCount = approvedIds.size
  const deniedCount = deniedIds.size
  const pendingCount = entries.length - approvedCount - deniedCount

  // Matter names for the dropdown
  const matterNames = matters.map(m => m.name)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className={cn(
        'bg-surface border border-border rounded-[var(--radius-md)] shadow-lg flex flex-col max-h-[90vh] transition-all duration-150',
        stage === 'review' ? 'w-full max-w-4xl' : 'w-full max-w-md',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-display font-semibold text-sm text-text-primary">
            {stage === 'review' ? 'Review imported entries' : 'Import from connected accounts'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-[var(--radius-sm)] text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* ── Stage 1: Configure ── */}
        {stage === 'configure' && (
          <div className="flex flex-col gap-5 px-5 py-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-text-muted">Date range</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={startDateDisplay}
                  onChange={e => setStartDateDisplay(e.target.value)}
                  className="flex-1 bg-page border border-border rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
                />
                <span className="text-xs text-text-muted shrink-0">to</span>
                <input
                  type="text"
                  value={endDateDisplay}
                  onChange={e => setEndDateDisplay(e.target.value)}
                  className="flex-1 bg-page border border-border rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-text-muted">Sources</label>
              <div className="flex flex-col gap-2">
                <label className={cn('flex items-center gap-3 cursor-pointer', !status.google && 'opacity-40 pointer-events-none')}>
                  <input type="checkbox" checked={calEnabled && status.google} onChange={e => setCalEnabled(e.target.checked)}
                    className="w-4 h-4 rounded accent-neutral-800 cursor-pointer" disabled={!status.google} />
                  <Calendar size={15} style={{ color: '#15803D' }} />
                  <span className="text-sm text-text-primary">Google Calendar</span>
                  <span className="text-xs text-text-muted ml-auto">
                    {status.google ? status.google_email : 'Not connected'}
                  </span>
                </label>
                <label className={cn('flex items-center gap-3 cursor-pointer', !status.m365 && 'opacity-40 pointer-events-none')}>
                  <input type="checkbox" checked={emailEnabled && status.m365} onChange={e => setEmailEnabled(e.target.checked)}
                    className="w-4 h-4 rounded accent-neutral-800 cursor-pointer" disabled={!status.m365} />
                  <Mail size={15} style={{ color: '#2563EB' }} />
                  <span className="text-sm text-text-primary">Microsoft 365</span>
                  <span className="text-xs text-text-muted ml-auto">
                    {status.m365 ? status.m365_email : 'Not connected'}
                  </span>
                </label>
              </div>
              {!status.google && !status.m365 && (
                <p className="text-xs text-text-muted mt-1">Connect accounts in Settings → Integrations first.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleFetch}
                disabled={(!calEnabled || !status.google) && (!emailEnabled || !status.m365)}
                className="px-4 py-2 text-sm font-medium text-surface bg-accent rounded-[var(--radius-sm)] hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Fetch &amp; Analyze
              </button>
            </div>
          </div>
        )}

        {/* ── Stage 2: Fetching ── */}
        {stage === 'fetching' && (
          <div className="flex flex-col gap-4 px-5 py-6">
            <div className="flex flex-col gap-3">
              {[
                { key: 'fetching', label: calEnabled && status.google ? 'Fetching Google Calendar' : 'Fetching M365 sent items' },
                { key: 'analyzing', label: 'Analyzing with AI' },
              ].map((step, i) => {
                const stepKeys = ['fetching', 'analyzing', 'done']
                const currentIdx = stepKeys.indexOf(fetchStatus)
                const stepIdx = i
                const isDone = currentIdx > stepIdx
                const isCurrent = currentIdx === stepIdx
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className="w-4 shrink-0 flex items-center justify-center">
                      {isDone ? <Check size={14} className="text-emerald-600" /> :
                       isCurrent ? <span className="w-3 h-3 rounded-full border-2 border-text-muted border-t-transparent animate-spin block" /> :
                       <span className="w-2 h-2 rounded-full bg-border block mx-auto" />}
                    </div>
                    <span className={cn('text-sm', isDone ? 'text-text-primary' : 'text-text-muted')}>{step.label}</span>
                  </div>
                )
              })}
              {fetchStatus === 'error' && (
                <div className="flex items-start gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded-[var(--radius-sm)]">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{fetchError}</p>
                </div>
              )}
              {fetchStatus === 'error' && (
                <div className="flex justify-end mt-2">
                  <button onClick={() => setStage('configure')} className="text-xs text-text-secondary border border-border px-3 py-1.5 rounded-[var(--radius-sm)] hover:bg-surface-hover cursor-pointer">
                    Back
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Stage 3: Review ── */}
        {stage === 'review' && (
          <>
            {highCount > 0 && (
              <div className="px-5 py-3 border-b border-border shrink-0 flex items-center justify-end">
                <button onClick={approveAllConfident} className="text-xs font-medium text-text-secondary border border-border px-2.5 py-1 rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer">
                  Approve all confident ({highCount})
                </button>
              </div>
            )}

            <div className="overflow-y-auto flex-1 min-h-0">
              {Object.keys(grouped).length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-text-muted">No entries found</div>
              ) : (
                Object.entries(grouped).map(([matter, rows]) => (
                  <div key={matter}>
                    <div className="px-5 py-2 bg-inset border-b border-border">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                        {matter === '__unassigned__' ? 'Unassigned — needs matter' : matter}
                      </span>
                    </div>

                    {rows.map(entry => {
                      const isApproved = approvedIds.has(entry.id)
                      const isDenied = deniedIds.has(entry.id)
                      return (
                        <div key={entry.id} className={cn(
                          'border-b border-border-subtle last:border-0 transition-colors relative',
                          isApproved && 'bg-emerald-50/60',
                          isDenied && 'bg-neutral-50 opacity-50',
                          !isApproved && !isDenied && 'hover:bg-surface-hover/40',
                        )}>
                          {isApproved && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500 rounded-full" />}
                          <div className="flex items-start gap-3 px-5 py-3">
                            {/* Source + time */}
                            <div className="flex flex-col gap-0.5 shrink-0 w-36">
                              <div className="flex items-center gap-1.5">
                                <SourceIcon source={entry.source} />
                                <span className="text-xs font-mono text-text-muted">{entry.date}</span>
                              </div>
                              <span className="text-xs font-mono text-text-faint">{entry.time}</span>
                            </div>

                            {/* Duration */}
                            <div className="shrink-0 w-14">
                              {editingId === entry.id && editingField === 'duration' ? (
                                <input type="number" min={5} step={5} autoFocus defaultValue={entry.duration}
                                  onBlur={e => { updateEntry(entry.id, 'duration', Number(e.target.value) || entry.duration); setEditingId(null); setEditingField(null) }}
                                  className="w-full bg-page border border-border rounded px-1.5 py-0.5 text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint" />
                              ) : (
                                <button onClick={() => { setEditingId(entry.id); setEditingField('duration') }}
                                  className="text-xs font-mono text-text-primary hover:text-accent hover:underline cursor-pointer">
                                  {fmtDuration(entry.duration)}
                                </button>
                              )}
                            </div>

                            {/* Narrative */}
                            <div className="flex-1 min-w-0">
                              {editingId === entry.id && editingField === 'narrative' ? (
                                <textarea autoFocus defaultValue={entry.narrative} rows={2}
                                  onBlur={e => { updateEntry(entry.id, 'narrative', e.target.value); setEditingId(null); setEditingField(null) }}
                                  className="w-full bg-page border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint resize-none" />
                              ) : (
                                <button onClick={() => { setEditingId(entry.id); setEditingField('narrative') }}
                                  className="text-xs text-text-secondary text-left hover:text-text-primary cursor-pointer w-full leading-relaxed">
                                  {entry.narrative}
                                </button>
                              )}
                            </div>

                            {/* Matter dropdown */}
                            <div className="shrink-0 w-36">
                              <div className="relative">
                                <select value={entry.matter ?? ''} onChange={e => updateEntry(entry.id, 'matter', e.target.value || null)}
                                  className="w-full appearance-none bg-page border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint pr-5 cursor-pointer">
                                  {!entry.matter && <option value="">Select matter…</option>}
                                  {matterNames.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isApproved ? (
                                <>
                                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-700"><Check size={12} />Approved</span>
                                  <button onClick={() => undoEntry(entry.id)} className="text-xs text-text-muted hover:text-text-primary underline cursor-pointer ml-1">Undo</button>
                                </>
                              ) : isDenied ? (
                                <>
                                  <span className="text-xs font-medium text-text-muted">Denied</span>
                                  <button onClick={() => undoEntry(entry.id)} className="text-xs text-text-muted hover:text-text-primary underline cursor-pointer ml-1">Undo</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => approveEntry(entry.id)} className="px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-[var(--radius-sm)] hover:bg-emerald-100 transition-colors cursor-pointer">
                                    Approve
                                  </button>
                                  <button onClick={() => denyEntry(entry.id)} className="px-2.5 py-1 text-xs font-medium text-text-muted border border-border rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer">
                                    Deny
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border shrink-0 flex items-center justify-between gap-4">
              <span className="text-xs text-text-muted flex items-center gap-2">
                {approvedCount > 0 && <span className="text-emerald-700 font-medium">{approvedCount} approved</span>}
                {deniedCount > 0 && <span>{deniedCount} denied</span>}
                {pendingCount > 0 && <span>{pendingCount} pending</span>}
                {fetchError && <span className="text-red-600">{fetchError}</span>}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleConfirm} disabled={approvedCount === 0 || confirming}
                  className="px-4 py-2 text-sm font-medium text-surface bg-accent rounded-[var(--radius-sm)] hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  {confirming ? 'Saving…' : `Confirm ${approvedCount > 0 ? `${approvedCount} entries` : 'entries'}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
