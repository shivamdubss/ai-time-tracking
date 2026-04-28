import { useRef } from 'react'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { formatDateLabel, formatTime } from '@/lib/utils'
import { isWebMode } from '@/lib/platform'
import type { TrackingStatus } from '@/lib/types'

interface HeaderProps {
  selectedDate: Date
  isToday: boolean
  onGoBack: () => void
  onGoForward: () => void
  onGoToDate?: (date: Date) => void
  status: TrackingStatus
  elapsed: number
  onStartTracking: () => void
  onStopTracking: () => void
  workHoursBlocked?: boolean
  demoMode?: boolean
}

function toInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function Header({
  selectedDate,
  isToday,
  onGoBack,
  onGoForward,
  onGoToDate,
  status,
  elapsed,
  onStartTracking,
  onStopTracking,
  workHoursBlocked,
  demoMode,
}: HeaderProps) {
  const dateInputRef = useRef<HTMLInputElement>(null)
  const maxDate = toInputValue(new Date())
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onGoBack}
            aria-label="Previous day"
            className="w-[36px] h-[36px] rounded-[var(--radius-sm)] border border-border bg-surface flex items-center justify-center text-text-muted hover:bg-surface-hover hover:text-text-primary transition-all duration-100 cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const el = dateInputRef.current
                if (!el) return
                // Prefer the modern showPicker() API; fall back to focus + click for older browsers
                const anyEl = el as HTMLInputElement & { showPicker?: () => void }
                if (typeof anyEl.showPicker === 'function') anyEl.showPicker()
                else { el.focus(); el.click() }
              }}
              aria-label="Pick a date"
              title="Pick a date"
              className="font-display font-semibold text-[15px] text-text-primary min-w-[140px] text-center px-2 py-1 rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer"
            >
              {formatDateLabel(selectedDate)}
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={toInputValue(selectedDate)}
              max={maxDate}
              onChange={(e) => {
                if (!onGoToDate || !e.target.value) return
                // Parse "YYYY-MM-DD" as local time (not UTC)
                const [y, m, d] = e.target.value.split('-').map(Number)
                if (!y || !m || !d) return
                onGoToDate(new Date(y, m - 1, d))
              }}
              className="sr-only absolute left-0 bottom-0 w-0 h-0 opacity-0 pointer-events-none"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
          <button
            onClick={onGoForward}
            disabled={isToday}
            aria-label="Next day"
            className="w-[36px] h-[36px] rounded-[var(--radius-sm)] border border-border bg-surface flex items-center justify-center text-text-muted hover:bg-surface-hover hover:text-text-primary transition-all duration-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {(!isWebMode || demoMode) && (
        <div className="flex items-center gap-3">
          {workHoursBlocked && (
            <span className="text-xs text-warning font-medium">Outside work hours</span>
          )}
          <AutoLogPill
            status={status}
            elapsed={elapsed}
            onStart={onStartTracking}
            onStop={onStopTracking}
          />
        </div>
      )}
    </header>
  )
}

interface AutoLogPillProps {
  status: TrackingStatus
  elapsed: number
  onStart: () => void
  onStop: () => void
}

function AutoLogPill({ status, elapsed, onStart, onStop }: AutoLogPillProps) {
  const isOn = status === 'tracking' || status === 'paused'
  const isProcessing = status === 'processing'

  function handleToggle() {
    if (isProcessing) return
    if (isOn) onStop()
    else onStart()
  }

  if (isProcessing) {
    return (
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 bg-info-bg border border-info/20 rounded-[var(--radius-sm)]"
        aria-busy="true"
      >
        <div className="w-3.5 h-3.5 border-2 border-info/30 border-t-info rounded-full animate-spin" />
        <span className="text-[13px] font-medium text-info">Processing…</span>
      </div>
    )
  }

  const containerClass = isOn
    ? 'h-9 flex items-center gap-3 pl-3.5 pr-4 bg-success-bg border border-success/20 rounded-[var(--radius-sm)] transition-colors'
    : 'h-9 flex items-center gap-3 pl-3.5 pr-4 bg-surface border border-border rounded-[var(--radius-sm)] transition-colors'

  return (
    <div className={containerClass}>
      <Sparkles
        size={14}
        className={isOn ? 'text-success' : 'text-text-muted'}
        strokeWidth={2}
      />
      {status === 'paused' ? (
        <span className="font-mono text-[13px] font-medium text-warning tabular-nums">
          {formatTime(elapsed)}
        </span>
      ) : (
        <span
          className={
            isOn
              ? 'text-[13px] font-medium text-success'
              : 'text-[13px] font-medium text-text-muted'
          }
        >
          Capture Time
        </span>
      )}
      <button
        role="switch"
        aria-checked={isOn}
        aria-label="Capture Time"
        onClick={handleToggle}
        className={
          isOn
            ? 'relative inline-flex h-5 w-9 shrink-0 rounded-full bg-success transition-colors duration-150 ease-out cursor-pointer'
            : 'relative inline-flex h-5 w-9 shrink-0 rounded-full bg-border transition-colors duration-150 ease-out cursor-pointer'
        }
      >
        <span
          className={
            isOn
              ? 'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out absolute top-0.5 translate-x-4'
              : 'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out absolute top-0.5 translate-x-0.5'
          }
        />
      </button>
    </div>
  )
}
