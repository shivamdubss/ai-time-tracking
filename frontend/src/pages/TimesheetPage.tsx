import { useState } from 'react'
import { TimesheetToolbar, getTimesheetPresetDates } from '@/components/sessions/TimesheetToolbar'
import { TimesheetMatterList } from '@/components/sessions/TimesheetMatterList'
import { SummaryStats } from '@/components/sessions/SummaryStats'
import { useTracking } from '@/hooks/useTrackingContext'
import { useTimesheetData } from '@/hooks/useTimesheetData'
import { useTimesheetStatus } from '@/hooks/useTimesheetStatus'
import { api } from '@/lib/api'
import type { TimesheetPreset } from '@/lib/types'
import { Download, CheckCircle2, Undo2, Loader2 } from 'lucide-react'

export function TimesheetPage() {
  const { matters, clients, refreshMatters } = useTracking()

  // Period state — default to today
  const todayStr = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [activePreset, setActivePreset] = useState<TimesheetPreset>('today')

  // Filter state
  const [clientFilter, setClientFilter] = useState<string[]>([])
  const [matterFilter, setMatterFilter] = useState<string[]>([])

  // Data
  const {
    sessions, stats, loading, refresh,
    handleActivityUpdated, handleActivityDeleted,
  } = useTimesheetData(startDate, endDate, { clientIds: clientFilter, matterIds: matterFilter }, matters, clients)

  // Release status
  const { isReleased, release, unrelease } = useTimesheetStatus(startDate, endDate)

  function handlePeriodChange(start: string, end: string, preset: TimesheetPreset) {
    setStartDate(start)
    setEndDate(end)
    setActivePreset(preset)
  }

  function handleExport() {
    api.exportTimesheet(startDate, endDate)
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6 flex-1 min-h-0 pt-16 md:pt-6">
      <h1 className="sr-only">Timesheet</h1>

      <TimesheetToolbar
        startDate={startDate}
        endDate={endDate}
        onPeriodChange={handlePeriodChange}
        activePreset={activePreset}
        clients={clients}
        matters={matters}
        clientFilter={clientFilter}
        matterFilter={matterFilter}
        onClientFilterChange={setClientFilter}
        onMatterFilterChange={setMatterFilter}
      />

      <SummaryStats
        totalHours={stats.totalHours}
        totalBillableMinutes={stats.totalBillableMinutes}
        totalBillableValue={stats.totalBillableValue}
        totalNonBillableMinutes={stats.totalNonBillableMinutes}
      />

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isReleased && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-[var(--radius-sm)]">
              <CheckCircle2 size={13} />
              Released
            </span>
          )}
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
              <Loader2 size={13} className="animate-spin" />
              Loading...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <Download size={14} />
            Export CSV
          </button>
          {isReleased ? (
            <button
              onClick={unrelease}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <Undo2 size={14} />
              Unrelease
            </button>
          ) : (
            <button
              onClick={release}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-surface bg-accent hover:bg-accent/90 rounded-[var(--radius-sm)] transition-colors cursor-pointer"
            >
              <CheckCircle2 size={14} />
              Release Timesheet
            </button>
          )}
        </div>
      </div>

      <TimesheetMatterList
        sessions={sessions}
        matters={matters}
        clients={clients}
        startDate={startDate}
        endDate={endDate}
        onActivityUpdated={handleActivityUpdated}
        onActivityDeleted={handleActivityDeleted}
        onEntryAdded={refresh}
        onDataRefresh={refreshMatters}
      />
    </div>
  )
}
