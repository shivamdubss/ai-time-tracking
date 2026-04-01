import { useState, useEffect } from 'react'
import { X, Calendar, Mail, Check, Trash2, AlertTriangle, ChevronDown } from 'lucide-react'
import { getCategoryColors, LEGAL_CATEGORIES } from '@/lib/types'
import { cn } from '@/lib/utils'

type Stage = 'configure' | 'fetching' | 'review'
type FilterTab = 'all' | 'needs_review' | 'calendar' | 'email'
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

function ConfidenceDot({ confidence }: { confidence: Confidence }) {
  if (confidence === 'high') {
    return <span className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: '#15803D' }} />
  }
  if (confidence === 'medium') {
    return <span className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: '#D97706' }} />
  }
  return (
    <span
      className="w-2 h-2 rounded-full shrink-0 mt-0.5 border"
      style={{ borderColor: '#A3A3A3', backgroundColor: 'transparent' }}
    />
  )
}

function SourceIcon({ source }: { source: Source }) {
  if (source === 'calendar') {
    return <Calendar size={13} className="shrink-0" style={{ color: '#15803D' }} />
  }
  return <Mail size={13} className="shrink-0" style={{ color: '#2563EB' }} />
}

function CategoryChip({ name }: { name: string }) {
  const colors = getCategoryColors(name)
  const SHORT: Record<string, string> = {
    'Client Communication': 'Comms',
    'Legal Research': 'Research',
    'Document Drafting': 'Drafting',
    'Court & Hearings': 'Court',
    'Case Review': 'Review',
    'Administrative': 'Admin',
  }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {SHORT[name] ?? name}
    </span>
  )
}

interface ImportModalProps {
  open: boolean
  onClose: () => void
}

export function ImportModal({ open, onClose }: ImportModalProps) {
  const [stage, setStage] = useState<Stage>('configure')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [entries, setEntries] = useState<ProposedEntry[]>(MOCK_ENTRIES)
  const [approvedCount, setApprovedCount] = useState(0)
  const [fetchStep, setFetchStep] = useState(0)
  const [preset, setPreset] = useState('last_7')
  const [calEnabled, setCalEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<'duration' | 'narrative' | null>(null)

  useEffect(() => {
    if (open) {
      setStage('configure')
      setEntries(MOCK_ENTRIES)
      setApprovedCount(0)
      setFetchStep(0)
      setActiveTab('all')
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
    setEntries(prev => prev.filter(e => e.id !== id))
    setApprovedCount(c => c + 1)
  }

  function removeEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  function approveAllConfident() {
    const count = entries.filter(e => e.confidence === 'high').length
    setEntries(prev => prev.filter(e => e.confidence !== 'high'))
    setApprovedCount(c => c + count)
  }

  function updateEntry(id: string, field: keyof ProposedEntry, value: string | number | null) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  const filtered = entries.filter(e => {
    if (activeTab === 'needs_review') return e.confidence !== 'high'
    if (activeTab === 'calendar') return e.source === 'calendar'
    if (activeTab === 'email') return e.source === 'email'
    return true
  })

  // Group: named matters first (in original order), then unassigned
  const matterOrder = Array.from(new Set(MOCK_ENTRIES.filter(e => e.matter).map(e => e.matter as string)))
  const grouped: Record<string, ProposedEntry[]> = {}
  for (const m of matterOrder) {
    const rows = filtered.filter(e => e.matter === m)
    if (rows.length) grouped[m] = rows
  }
  const unassigned = filtered.filter(e => e.matter === null)
  if (unassigned.length) grouped['__unassigned__'] = unassigned

  const highCount = entries.filter(e => e.confidence === 'high').length
  const needsReviewCount = entries.filter(e => e.confidence !== 'high').length
  const calCount = entries.filter(e => e.source === 'calendar').length
  const emailCount = entries.filter(e => e.source === 'email').length
  const totalMockMinutes = MOCK_ENTRIES.reduce((s, e) => s + e.duration, 0)
  const mockMatterCount = new Set(MOCK_ENTRIES.filter(e => e.matter).map(e => e.matter)).size

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
              <div className="relative">
                <select
                  value={preset}
                  onChange={e => setPreset(e.target.value)}
                  className="w-full appearance-none bg-page border border-border rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint pr-8 cursor-pointer"
                >
                  <option value="last_7">Last 7 days</option>
                  <option value="this_week">This week</option>
                  <option value="last_week">Last week</option>
                  <option value="this_month">This month</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
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
            <div className="px-5 py-3 border-b border-border shrink-0 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-text-muted font-mono">
                  {entries.length} proposed · {mockMatterCount} matters · {fmtDuration(totalMockMinutes)}
                </p>
                {highCount > 0 && (
                  <button
                    onClick={approveAllConfident}
                    className="text-xs font-medium text-text-secondary border border-border px-2.5 py-1 rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
                  >
                    Approve all confident ({highCount})
                  </button>
                )}
              </div>
              {/* Filter tabs */}
              <div className="flex items-center gap-1">
                {([
                  ['all', `All (${entries.length})`],
                  ['needs_review', `Needs review (${needsReviewCount})`],
                  ['calendar', `Calendar (${calCount})`],
                  ['email', `Email (${emailCount})`],
                ] as [FilterTab, string][]).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-[var(--radius-sm)] transition-colors cursor-pointer',
                      activeTab === tab
                        ? 'bg-inset text-text-primary font-medium'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

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
                    {rows.map(entry => (
                      <div
                        key={entry.id}
                        className={cn(
                          'border-b border-border-subtle last:border-0 transition-colors',
                          entry.overlap ? 'bg-amber-50/50' : 'hover:bg-surface-hover/40',
                          entry.overlap && 'pl-8'
                        )}
                      >
                        {entry.overlap && (
                          <div className="flex items-center gap-1.5 px-5 pt-2 pb-0">
                            <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                            <span className="text-xs text-amber-600">May already be covered by calendar event above</span>
                          </div>
                        )}
                        <div className="flex items-start gap-3 px-5 py-3">
                          {/* Confidence dot */}
                          <div className="flex items-center pt-0.5">
                            <ConfidenceDot confidence={entry.confidence} />
                          </div>

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

                          {/* Category */}
                          <div className="shrink-0">
                            <CategoryChip name={entry.category} />
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

                          {/* Matter reassignment for medium/low confidence */}
                          {(entry.confidence === 'medium' || entry.confidence === 'low') && (
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
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => approveEntry(entry.id)}
                              title="Approve"
                              className="p-1.5 rounded-[var(--radius-sm)] text-text-muted hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => removeEntry(entry.id)}
                              title="Remove"
                              className="p-1.5 rounded-[var(--radius-sm)] text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Review footer */}
            <div className="px-5 py-4 border-t border-border shrink-0 flex items-center justify-between gap-4">
              <span className="text-xs text-text-muted">
                {approvedCount > 0 && (
                  <span className="text-emerald-700 font-medium">{approvedCount} approved · </span>
                )}
                {entries.length} remaining
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
