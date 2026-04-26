import { useState, useRef, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, X, Download, FileText, FileSpreadsheet, FileType2 } from 'lucide-react'
import type { TimesheetPreset, Client, Matter } from '@/lib/types'

interface TimesheetToolbarProps {
  startDate: string
  endDate: string
  onPeriodChange: (start: string, end: string, preset: TimesheetPreset) => void
  activePreset?: TimesheetPreset
  clients: Client[]
  matters: Matter[]
  clientFilter: string[]
  matterFilter: string[]
  onClientFilterChange: (ids: string[]) => void
  onMatterFilterChange: (ids: string[]) => void
  onExport?: () => void
  rightSlot?: React.ReactNode
}

export function getTimesheetPresetDates(preset: TimesheetPreset): { start: string; end: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10)

  switch (preset) {
    case 'today':
      return { start: fmt(now), end: fmt(now) }
    case 'yesterday': {
      const yest = new Date(y, m, d - 1)
      return { start: fmt(yest), end: fmt(yest) }
    }
    case 'this_week': {
      const day = now.getDay()
      const mon = new Date(y, m, d - (day === 0 ? 6 : day - 1))
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      return { start: fmt(mon), end: fmt(sun) }
    }
    case 'last_week': {
      const day = now.getDay()
      const thisMon = new Date(y, m, d - (day === 0 ? 6 : day - 1))
      const lastMon = new Date(thisMon)
      lastMon.setDate(thisMon.getDate() - 7)
      const lastSun = new Date(lastMon)
      lastSun.setDate(lastMon.getDate() + 6)
      return { start: fmt(lastMon), end: fmt(lastSun) }
    }
    case 'this_month':
      return { start: `${y}-${String(m + 1).padStart(2, '0')}-01`, end: fmt(now) }
    case 'last_month': {
      const first = new Date(y, m - 1, 1)
      const last = new Date(y, m, 0)
      return { start: fmt(first), end: fmt(last) }
    }
    case 'custom':
      return { start: fmt(now), end: fmt(now) }
  }
}

// ─── Filter Dropdown ─────────────────────────────────────────────────────

interface FilterDropdownProps {
  label: string
  items: { id: string; name: string; group?: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}

function FilterDropdown({ label, items, selected, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const selectedSet = new Set(selected)
  const hasFilter = selected.length > 0

  const buttonLabel = !hasFilter
    ? label
    : selected.length === 1
      ? items.find(i => i.id === selected[0])?.name || '1 selected'
      : `${selected.length} selected`

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onChange(selected.filter(s => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  // Group items if they have a group field
  const groups = useMemo(() => {
    const map = new Map<string, typeof items>()
    for (const item of items) {
      const g = item.group || ''
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(item)
    }
    return map
  }, [items])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'h-9 min-w-[140px] inline-flex items-center justify-between gap-1.5 px-3 text-sm font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer',
          hasFilter
            ? 'bg-accent-link/10 text-accent-link border border-accent-link/20'
            : 'bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover',
        )}
      >
        {buttonLabel}
        {hasFilter ? (
          <X
            size={12}
            className="hover:text-accent-link"
            onClick={(e) => { e.stopPropagation(); onChange([]) }}
          />
        ) : (
          <ChevronDown size={12} />
        )}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 z-20 min-w-[220px] max-h-[320px] overflow-y-auto bg-surface border border-border rounded-[var(--radius-sm)] shadow-md">
          {/* Select All / Clear */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
            <button
              className="text-xs text-accent-link hover:underline cursor-pointer"
              onClick={() => onChange(items.map(i => i.id))}
            >
              Select all
            </button>
            <button
              className="text-xs text-text-muted hover:text-text-primary cursor-pointer"
              onClick={() => onChange([])}
            >
              Clear
            </button>
          </div>
          {[...groups.entries()].map(([group, groupItems]) => (
            <div key={group}>
              {group && (
                <div className="px-3 py-1.5 text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  {group}
                </div>
              )}
              {groupItems.map(item => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-hover cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedSet.has(item.id)}
                    onChange={() => toggle(item.id)}
                    className="rounded border-border text-accent-link focus:ring-accent-link/20"
                  />
                  <span className="text-xs text-text-primary truncate">{item.name}</span>
                </label>
              ))}
            </div>
          ))}
          {items.length === 0 && (
            <div className="px-3 py-3 text-xs text-text-muted text-center">No items</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Toolbar ────────────────────────────────────────────────────────

export function TimesheetToolbar({
  startDate, endDate, onPeriodChange,
  clients, matters, clientFilter, matterFilter,
  onClientFilterChange, onMatterFilterChange, onExport, rightSlot,
}: TimesheetToolbarProps) {
  // Client filter items
  const clientItems = useMemo(() =>
    clients
      .filter(c => !c.is_internal)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => ({ id: c.id, name: c.name })),
    [clients],
  )

  // Matter filter items — grouped by client, narrowed by client filter
  const clientSet = new Set(clientFilter)
  const matterItems = useMemo(() => {
    const clientMap = new Map(clients.map(c => [c.id, c.name]))
    return matters
      .filter(m => m.status === 'active')
      .filter(m => clientFilter.length === 0 || clientSet.has(m.client_id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(m => ({
        id: m.id,
        name: m.name,
        group: clientMap.get(m.client_id) || 'Unknown',
      }))
  }, [matters, clients, clientFilter])

  // When client filter changes, remove matter selections for matters not under selected clients
  const handleClientFilterChange = (ids: string[]) => {
    onClientFilterChange(ids)
    if (ids.length > 0) {
      const allowedClientSet = new Set(ids)
      const validMatters = matterFilter.filter(mid => {
        const m = matters.find(x => x.id === mid)
        return m && allowedClientSet.has(m.client_id)
      })
      if (validMatters.length !== matterFilter.length) {
        onMatterFilterChange(validMatters)
      }
    }
  }

  const dateInputClass = 'h-9 px-3 text-sm bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary focus:outline-none focus:border-accent-link'

  return (
    <div className="flex flex-wrap items-end gap-3">
      <FieldGroup label="From">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onPeriodChange(e.target.value, endDate, 'custom')}
          className={dateInputClass}
        />
      </FieldGroup>

      <FieldGroup label="To">
        <input
          type="date"
          value={endDate}
          onChange={(e) => onPeriodChange(startDate, e.target.value, 'custom')}
          className={dateInputClass}
        />
      </FieldGroup>

      <FieldGroup label="Client">
        <FilterDropdown
          label="All Clients"
          items={clientItems}
          selected={clientFilter}
          onChange={handleClientFilterChange}
        />
      </FieldGroup>

      <FieldGroup label="Matter">
        <FilterDropdown
          label="All Matters"
          items={matterItems}
          selected={matterFilter}
          onChange={onMatterFilterChange}
        />
      </FieldGroup>

      <div className="ml-auto flex items-center gap-2">
        <ExportMenu onExport={onExport} />
        {rightSlot}
      </div>
    </div>
  )
}

// ─── Export Menu ──────────────────────────────────────────────────────────

function ExportMenu({ onExport }: { onExport?: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const items: { label: string; icon: React.ReactNode }[] = [
    { label: 'PDF', icon: <FileText size={14} className="text-text-muted" /> },
    { label: 'Excel', icon: <FileSpreadsheet size={14} className="text-text-muted" /> },
    { label: 'Word', icon: <FileType2 size={14} className="text-text-muted" /> },
  ]

  function pick() {
    setOpen(false)
    onExport?.()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'h-9 inline-flex items-center gap-1.5 px-3 text-sm font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer',
          'bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover',
        )}
      >
        <Download size={14} />
        Export
        <ChevronDown size={14} className="text-text-muted" />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 z-20 min-w-[160px] bg-surface border border-border rounded-[var(--radius-sm)] shadow-md py-1">
          {items.map(item => (
            <button
              key={item.label}
              onClick={pick}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-text-primary hover:bg-surface-hover cursor-pointer"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Field Group (label above control) ───────────────────────────────────

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-text-muted">{label}</span>
      {children}
    </div>
  )
}

