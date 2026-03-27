import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { PeriodPreset } from '@/lib/types'

interface PeriodSelectorProps {
  startDate: string
  endDate: string
  onPeriodChange: (start: string, end: string) => void
}

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'ytd', label: 'Year to Date' },
]

function getPresetDates(preset: PeriodPreset): { start: string; end: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10)

  switch (preset) {
    case 'today':
      return { start: fmt(now), end: fmt(now) }
    case 'this_week': {
      const day = now.getDay()
      const mon = new Date(y, m, d - (day === 0 ? 6 : day - 1))
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      return { start: fmt(mon), end: fmt(sun) }
    }
    case 'this_month':
      return { start: `${y}-${String(m + 1).padStart(2, '0')}-01`, end: fmt(now) }
    case 'last_month': {
      const first = new Date(y, m - 1, 1)
      const last = new Date(y, m, 0)
      return { start: fmt(first), end: fmt(last) }
    }
    case 'this_quarter': {
      const qStart = new Date(y, Math.floor(m / 3) * 3, 1)
      return { start: fmt(qStart), end: fmt(now) }
    }
    case 'ytd':
      return { start: `${y}-01-01`, end: fmt(now) }
  }
}

export function PeriodSelector({ startDate, endDate, onPeriodChange }: PeriodSelectorProps) {
  const [activePreset, setActivePreset] = useState<PeriodPreset | 'custom'>('this_month')
  const [showCustom, setShowCustom] = useState(false)

  const handlePreset = (preset: PeriodPreset) => {
    setActivePreset(preset)
    setShowCustom(false)
    const { start, end } = getPresetDates(preset)
    onPeriodChange(start, end)
  }

  return (
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
      <button
        onClick={() => { setShowCustom(!showCustom); setActivePreset('custom') }}
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
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => onPeriodChange(e.target.value, endDate)}
            className="px-2 py-1 text-xs border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary"
          />
          <span className="text-xs text-text-muted">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onPeriodChange(startDate, e.target.value)}
            className="px-2 py-1 text-xs border border-border rounded-[var(--radius-sm)] bg-surface text-text-primary"
          />
        </div>
      )}
    </div>
  )
}
