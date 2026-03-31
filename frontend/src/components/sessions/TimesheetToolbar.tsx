import { useState, useRef, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, X } from 'lucide-react'
import type { TimesheetPreset, Client, Matter } from '@/lib/types'

interface TimesheetToolbarProps {
  startDate: string
  endDate: string
  onPeriodChange: (start: string, end: string, preset: TimesheetPreset) => void
  activePreset: TimesheetPreset
  clients: Client[]
  matters: Matter[]
  clientFilter: string[]
  matterFilter: string[]
  onClientFilterChange: (ids: string[]) => void
  onMatterFilterChange: (ids: string[]) => void
}

const PRESETS: { key: TimesheetPreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This Week' },
  { key: 'last_week', label: 'Last Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
]

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

function formatDateLabel(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (start === end) {
    return s.toLocaleDateString('en-US', { weekday: 'short', ...opts })
  }
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`
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
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer',
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
  startDate, endDate, onPeriodChange, activePreset,
  clients, matters, clientFilter, matterFilter,
  onClientFilterChange, onMatterFilterChange,
}: TimesheetToolbarProps) {
  const [showCustom, setShowCustom] = useState(false)

  const handlePreset = (preset: TimesheetPreset) => {
    setShowCustom(false)
    const { start, end } = getTimesheetPresetDates(preset)
    onPeriodChange(start, end, preset)
  }

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

  return (
    <div className="flex flex-col gap-3">
      {/* Period + date label */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePreset(p.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer',
                activePreset === p.key
                  ? 'bg-text-primary text-white dark:bg-white dark:text-black'
                  : 'bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover',
              )}
            >
              {p.label}
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => { setShowCustom(!showCustom); if (!showCustom) onPeriodChange(startDate, endDate, 'custom') }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer',
                activePreset === 'custom'
                  ? 'bg-text-primary text-white dark:bg-white dark:text-black'
                  : 'bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover',
              )}
            >
              Custom
            </button>
            {showCustom && (
              <div className="absolute top-full left-0 mt-1 z-10 flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-[var(--radius-sm)] shadow-md">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onPeriodChange(e.target.value, endDate, 'custom')}
                  className="px-2 py-1 text-xs border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary"
                />
                <span className="text-xs text-text-muted">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onPeriodChange(startDate, e.target.value, 'custom')}
                  className="px-2 py-1 text-xs border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary"
                />
              </div>
            )}
          </div>
        </div>
        {/* Filters */}
        <div className="flex items-center gap-2">
          <FilterDropdown
            label="All Clients"
            items={clientItems}
            selected={clientFilter}
            onChange={handleClientFilterChange}
          />
          <FilterDropdown
            label="All Matters"
            items={matterItems}
            selected={matterFilter}
            onChange={onMatterFilterChange}
          />
        </div>
      </div>
      {/* Date range label */}
      <div className="text-lg font-display font-bold text-text-primary tracking-tight">
        {formatDateLabel(startDate, endDate)}
      </div>
    </div>
  )
}
