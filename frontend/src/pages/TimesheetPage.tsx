import { Header } from '@/components/layout/Header'
import { TimesheetMatterList } from '@/components/sessions/TimesheetMatterList'
import { SummaryStats } from '@/components/sessions/SummaryStats'
import { useTracking } from '@/hooks/useTrackingContext'
import { useSessionData } from '@/hooks/useSessionData'
import { useTimesheetStatus } from '@/hooks/useTimesheetStatus'
import { api } from '@/lib/api'
import { useSettings } from '@/hooks/useSettings'
import { Download, CheckCircle2, Undo2 } from 'lucide-react'

export function TimesheetPage() {
  const { selectedDate, dateStr, isToday, goBack, goForward, status, elapsed, handleStart, handleStop, workHoursBlocked, refreshSessions, refreshMatters } = useTracking()
  const {
    sessions, matters, clients,
    totalHours, totalBillableValue, totalBillableMinutes, totalNonBillableMinutes,
    handleActivityUpdated, handleActivityDeleted,
  } = useSessionData()
  const { isReleased, release, unrelease } = useTimesheetStatus(dateStr)
  const { settings } = useSettings()

  function handleExport() {
    api.exportTimesheet(dateStr)
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6 flex-1 min-h-0 pt-16 md:pt-6">
      <h1 className="sr-only">Timesheet</h1>
      <Header
        selectedDate={selectedDate}
        isToday={isToday}
        onGoBack={goBack}
        onGoForward={goForward}
        status={status}
        elapsed={elapsed}
        onStartTracking={handleStart}
        onStopTracking={handleStop}
        workHoursBlocked={workHoursBlocked}
        demoMode={settings.demoMode}
      />

      <SummaryStats
        totalHours={totalHours}
        totalBillableMinutes={totalBillableMinutes}
        totalBillableValue={totalBillableValue}
        totalNonBillableMinutes={totalNonBillableMinutes}
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
        dateStr={dateStr}
        onActivityUpdated={handleActivityUpdated}
        onActivityDeleted={handleActivityDeleted}
        onEntryAdded={refreshSessions}
        onDataRefresh={refreshMatters}
      />
    </div>
  )
}
