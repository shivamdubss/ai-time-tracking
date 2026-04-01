import { useState, useEffect } from 'react'
import { X, Calendar, Mail, Check, ChevronDown } from 'lucide-react'
import { LEGAL_CATEGORIES } from '@/lib/types'
import { cn } from '@/lib/utils'

type Stage = 'configure' | 'fetching' | 'review'
type Confidence = 'high' | 'medium' | 'low'
type Source = 'calendar' | 'email'

interface ProposedEntry {
  id: string
  source: Source
  date: string
  time: string
  duration: number // minutes
  category: string
  matter: string | null
  narrative: string
  confidence: Confidence
  overlap?: boolean
}

const MOCK_ENTRIES: ProposedEntry[] = [
  // Smith v. Jones
  { id: '1', source: 'calendar', date: 'Mon Apr 1', time: '9:00 – 11:00am', duration: 120, category: 'Court & Hearings', matter: 'Smith v. Jones', narrative: 'Attended hearing in Smith v. Jones; appeared on behalf of client', confidence: 'high' },
  { id: '2', source: 'email', date: 'Mon Apr 1', time: '10:15am', duration: 15, category: 'Administrative', matter: 'Smith v. Jones', narrative: 'Filed motion during hearing', confidence: 'medium', overlap: true },
  { id: '3', source: 'email', date: 'Mon Apr 1', time: '11:15am', duration: 15, category: 'Client Communication', matter: 'Smith v. Jones', narrative: 'Post-hearing correspondence with client re: case outcome', confidence: 'high' },
  { id: '4', source: 'email', date: 'Tue Apr 2', time: '2:30pm', duration: 30, category: 'Client Communication', matter: 'Smith v. Jones', narrative: 'Responded to opposing counsel re: discovery request', confidence: 'medium' },
  // Thompson Matter
  { id: '5', source: 'calendar', date: 'Mon Apr 1', time: '1:00 – 3:00pm', duration: 120, category: 'Document Drafting', matter: 'Thompson Matter', narrative: 'Deposition preparation for Thompson v. Rivera', confidence: 'high' },
  { id: '6', source: 'email', date: 'Mon Apr 1', time: '3:30pm', duration: 30, category: 'Client Communication', matter: 'Thompson Matter', narrative: 'Follow-up correspondence re: exhibit list', confidence: 'medium' },
  { id: '7', source: 'email', date: 'Wed Apr 3', time: '10:45am', duration: 15, category: 'Client Communication', matter: 'Thompson Matter', narrative: 'Reviewed and responded to client inquiry re: deposition schedule', confidence: 'medium' },
  // Rivera Matter
  { id: '8', source: 'email', date: 'Wed Apr 3', time: '4:45pm', duration: 15, category: 'Administrative', matter: 'Rivera Matter', narrative: 'Court portal filing — Notice of Appearance', confidence: 'high' },
  { id: '9', source: 'email', date: 'Thu Apr 4', time: '9:15am', duration: 30, category: 'Legal Research', matter: 'Rivera Matter', narrative: 'Email to co-counsel re: case strategy and applicable precedents', confidence: 'medium' },
  // Unassigned
  { id: '10', source: 'email', date: 'Tue Apr 2', time: '11:30am', duration: 15, category: 'Client Communication', matter: null, narrative: 'RE: billing question — no matter matched', confidence: 'low' },
  { id: '11', source: 'email', date: 'Thu Apr 4', time: '3:00pm', duration: 15, category: 'Administrative', matter: null, narrative: 'RE: scheduling — no matter identified', confidence: 'low' },
]

const MATTERS = ['Smith v. Jones', 'Thompson Matter', 'Rivera Matter']

const FETCH_STEPS = [
  { label: 'Fetching Google Calendar', result: '9 events' },
  { label: 'Fetching M365 sent items', result: '38 emails' },
  { label: 'Analyzing with AI', result: 'Done — 11 proposed entries' },
]

function fmtDuration(minutes: number) {
  return (minutes / 60).toFixed(2) + 'h'
}

function SourceIcon({ source }: { source: Source }) {
  if (source === 'calendar') {
    return <Calendar size={13} className="shrink-0" style={{ color: '#15803D' }} />
  }
  return <Mail size={13} className="shrink-0" style={{ color: '#2563EB' }} />
}


interface ImportModalProps {
  open: boolean
  onClose: () => void
}

export function ImportModal({ open, onClose }: ImportModalProps) {
  const [stage, setStage] = useState<Stage>('configure')
  const [entries, setEntries] = useState<ProposedEntry[]>(MOCK_ENTRIES)
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
  const [deniedIds, setDeniedIds] = useState<Set<string>>(new Set())
  const [fetchStep, setFetchStep] = useState(0)
  const [calEnabled, setCalEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<'duration' | 'narrative' | null>(null)

  useEffect(() => {
    if (open) {
      setStage('configure')
      setEntries(MOCK_ENTRIES)
      setApprovedIds(new Set())
      setDeniedIds(new Set())
      setFetchStep(0)
      setEditingId(null)
      setEditingField(null)
    }
  }, [open])

  // Drive the fetch animation
  useEffect(() => {
    if (stage !== 'fetching') return
    if (fetchStep >= FETCH_STEPS.length) {
      const t = setTimeout(() => setStage('review'), 500)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setFetchStep(s => s + 1), 900)
    return () => clearTimeout(t)
  }, [stage, fetchStep])

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
    const confidentIds = entries.filter(e => e.confidence === 'high').map(e => e.id)
    setApprovedIds(prev => new Set([...prev, ...confidentIds]))
    setDeniedIds(prev => { const s = new Set(prev); confidentIds.forEach(id => s.delete(id)); return s })
  }

  function updateEntry(id: string, field: keyof ProposedEntry, value: string | number | null) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  // Group: named matters first (in original order), then unassigned
  const matterOrder = Array.from(new Set(MOCK_ENTRIES.filter(e => e.matter).map(e => e.matter as string)))
  const grouped: Record<string, ProposedEntry[]> = {}
  for (const m of matterOrder) {
    const rows = entries.filter(e => e.matter === m)
    if (rows.length) grouped[m] = rows
  }
  const unassigned = entries.filter(e => e.matter === null)
  if (unassigned.length) grouped['__unassigned__'] = unassigned

  const highCount = entries.filter(e => e.confidence === 'high' && !approvedIds.has(e.id) && !deniedIds.has(e.id)).length
  const approvedCount = approvedIds.size
  const deniedCount = deniedIds.size
  const pendingCount = entries.length - approvedCount - deniedCount

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className={cn(
          'bg-surface border border-border rounded-[var(--radius-md)] shadow-lg flex flex-col max-h-[90vh] transition-all duration-150',
          stage === 'review' ? 'w-full max-w-4xl' : 'w-full max-w-md'
        )}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-display font-semibold text-sm text-text-primary">
            {stage === 'review' ? 'Review imported entries' : 'Import from connected accounts'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-sm)] text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Stage 1: Configure ── */}
        {stage === 'configure' && (
          <div className="flex flex-col gap-5 px-5 py-5">
            {/* Date range */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-text-muted">Date range</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  defaultValue="March 25, 2026"
                  className="flex-1 bg-page border border-border rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
                />
                <span className="text-xs text-text-muted shrink-0">to</span>
                <input
                  type="text"
                  defaultValue="April 1, 2026"
                  className="flex-1 bg-page border border-border rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
                />
              </div>
            </div>

            {/* Sources */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-text-muted">Sources</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={calEnabled}
                    onChange={e => setCalEnabled(e.target.checked)}
                    className="w-4 h-4 rounded accent-neutral-800 cursor-pointer"
                  />
                  <Calendar size={15} style={{ color: '#15803D' }} />
                  <span className="text-sm text-text-primary">Google Calendar</span>
                  <span className="text-xs text-text-muted ml-auto">shivani@smithlegal.com</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={e => setEmailEnabled(e.target.checked)}
                    className="w-4 h-4 rounded accent-neutral-800 cursor-pointer"
                  />
                  <Mail size={15} style={{ color: '#2563EB' }} />
                  <span className="text-sm text-text-primary">Microsoft 365</span>
                  <span className="text-xs text-text-muted ml-auto">shivani@smithlegal.com</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => { setFetchStep(0); setStage('fetching') }}
                disabled={!calEnabled && !emailEnabled}
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
              {FETCH_STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 shrink-0 flex items-center justify-center">
                    {i < fetchStep ? (
                      <Check size={14} className="text-emerald-600" />
                    ) : i === fetchStep ? (
                      <span className="w-3 h-3 rounded-full border-2 border-text-muted border-t-transparent animate-spin block" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-border block mx-auto" />
                    )}
                  </div>
                  <span className={cn('text-sm', i < fetchStep ? 'text-text-primary' : 'text-text-muted')}>
                    {step.label}
                    {i < fetchStep && (
                      <span className="text-text-muted ml-2">· {step.result}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Stage 3: Review ── */}
        {stage === 'review' && (
          <>
            {/* Review sub-header */}
            {highCount > 0 && (
              <div className="px-5 py-3 border-b border-border shrink-0 flex items-center justify-end">
                <button
                  onClick={approveAllConfident}
                  className="text-xs font-medium text-text-secondary border border-border px-2.5 py-1 rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  Approve all confident ({highCount})
                </button>
              </div>
            )}

            {/* Entry list */}
            <div className="overflow-y-auto flex-1 min-h-0">
              {Object.keys(grouped).length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-text-muted">
                  No entries remaining
                </div>
              ) : (
                Object.entries(grouped).map(([matter, rows]) => (
                  <div key={matter}>
                    {/* Matter group header */}
                    <div className="px-5 py-2 bg-inset border-b border-border">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                        {matter === '__unassigned__' ? 'Unassigned — needs matter' : matter}
                      </span>
                    </div>

                    {/* Rows */}
                    {rows.map(entry => {
                      const isApproved = approvedIds.has(entry.id)
                      const isDenied = deniedIds.has(entry.id)
                      return (
                      <div
                        key={entry.id}
                        className={cn(
                          'border-b border-border-subtle last:border-0 transition-colors relative',
                          isApproved && 'bg-emerald-50/60',
                          isDenied && 'bg-neutral-50 opacity-50',
                          !isApproved && !isDenied && 'hover:bg-surface-hover/40',
                        )}
                      >
                        {isApproved && (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500 rounded-full" />
                        )}
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
                              <input
                                type="number"
                                min={5}
                                step={5}
                                autoFocus
                                defaultValue={entry.duration}
                                onBlur={e => {
                                  updateEntry(entry.id, 'duration', Number(e.target.value) || entry.duration)
                                  setEditingId(null)
                                  setEditingField(null)
                                }}
                                className="w-full bg-page border border-border rounded px-1.5 py-0.5 text-xs font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
                              />
                            ) : (
                              <button
                                onClick={() => { setEditingId(entry.id); setEditingField('duration') }}
                                className="text-xs font-mono text-text-primary hover:text-accent hover:underline cursor-pointer"
                              >
                                {fmtDuration(entry.duration)}
                              </button>
                            )}
                          </div>

                          {/* Narrative */}
                          <div className="flex-1 min-w-0">
                            {editingId === entry.id && editingField === 'narrative' ? (
                              <textarea
                                autoFocus
                                defaultValue={entry.narrative}
                                rows={2}
                                onBlur={e => {
                                  updateEntry(entry.id, 'narrative', e.target.value)
                                  setEditingId(null)
                                  setEditingField(null)
                                }}
                                className="w-full bg-page border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint resize-none"
                              />
                            ) : (
                              <button
                                onClick={() => { setEditingId(entry.id); setEditingField('narrative') }}
                                className="text-xs text-text-secondary text-left hover:text-text-primary cursor-pointer w-full leading-relaxed"
                              >
                                {entry.narrative}
                              </button>
                            )}
                          </div>

                          {/* Matter dropdown — all rows */}
                          <div className="shrink-0 w-36">
                            <div className="relative">
                              <select
                                value={entry.matter ?? ''}
                                onChange={e => updateEntry(entry.id, 'matter', e.target.value || null)}
                                className="w-full appearance-none bg-page border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint pr-5 cursor-pointer"
                              >
                                {entry.matter === null && <option value="">Select matter…</option>}
                                {MATTERS.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                              <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isApproved ? (
                              <>
                                <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                                  <Check size={12} />
                                  Approved
                                </span>
                                <button onClick={() => undoEntry(entry.id)} className="text-xs text-text-muted hover:text-text-primary underline cursor-pointer ml-1">Undo</button>
                              </>
                            ) : isDenied ? (
                              <>
                                <span className="text-xs font-medium text-text-muted">Denied</span>
                                <button onClick={() => undoEntry(entry.id)} className="text-xs text-text-muted hover:text-text-primary underline cursor-pointer ml-1">Undo</button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => approveEntry(entry.id)}
                                  className="px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-[var(--radius-sm)] hover:bg-emerald-100 transition-colors cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => denyEntry(entry.id)}
                                  className="px-2.5 py-1 text-xs font-medium text-text-muted border border-border rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer"
                                >
                                  Deny
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                ))
              )}
            </div>

            {/* Review footer */}
            <div className="px-5 py-4 border-t border-border shrink-0 flex items-center justify-between gap-4">
              <span className="text-xs text-text-muted flex items-center gap-2">
                {approvedCount > 0 && <span className="text-emerald-700 font-medium">{approvedCount} approved</span>}
                {deniedCount > 0 && <span className="text-text-muted">{deniedCount} denied</span>}
                {pendingCount > 0 && <span>{pendingCount} pending</span>}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={onClose}
                  disabled={approvedCount === 0}
                  className="px-4 py-2 text-sm font-medium text-surface bg-accent rounded-[var(--radius-sm)] hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirm {approvedCount > 0 ? `${approvedCount} entries` : 'entries'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
