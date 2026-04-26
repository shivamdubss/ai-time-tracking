import { useState } from 'react'
import { TimesheetToolbar, getTimesheetPresetDates } from '@/components/sessions/TimesheetToolbar'
import { TimesheetMatterList } from '@/components/sessions/TimesheetMatterList'
import { useTracking } from '@/hooks/useTrackingContext'
import { useTimesheetData } from '@/hooks/useTimesheetData'
import { useTimesheetStatus } from '@/hooks/useTimesheetStatus'
import { api } from '@/lib/api'
import type { TimesheetPreset } from '@/lib/types'
import { CheckCircle2, Undo2 } from 'lucide-react'
import { ImportModal } from '@/components/integrations/ImportModal'

export function TimesheetPage() {
  const { matters, clients, refreshMatters } = useTracking()

  // Period state — default to this week
  const initialRange = getTimesheetPresetDates('this_week')
  const [startDate, setStartDate] = useState(initialRange.start)
  const [endDate, setEndDate] = useState(initialRange.end)
  const [activePreset, setActivePreset] = useState<TimesheetPreset>('this_week')

  // Filter state
  const [clientFilter, setClientFilter] = useState<string[]>([])
  const [matterFilter, setMatterFilter] = useState<string[]>([])

  // Data
  const {
    sessions, stats, refresh,
    handleActivityUpdated, handleActivityDeleted,
  } = useTimesheetData(startDate, endDate, { clientIds: clientFilter, matterIds: matterFilter }, matters, clients)

  // Release status
  const { isReleased, release, unrelease } = useTimesheetStatus(startDate, endDate)
  const [importOpen, setImportOpen] = useState(false)

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
        onExport={handleExport}
        rightSlot={
          isReleased ? (
            <button
              onClick={unrelease}
              className="h-9 inline-flex items-center gap-1.5 px-3 text-sm font-medium text-text-secondary bg-surface border border-border rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <Undo2 size={14} />
              Recall
            </button>
          ) : (
            <button
              onClick={release}
              className="h-9 inline-flex items-center gap-1.5 px-3 text-sm font-medium text-surface bg-accent hover:bg-accent/90 rounded-[var(--radius-sm)] transition-colors cursor-pointer"
            >
              <CheckCircle2 size={14} />
              Submit
            </button>
          )
        }
      />

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
        onRetroactive={() => setImportOpen(true)}
        periodTotals={{
          totalHours: stats.totalHours,
          billableMinutes: stats.totalBillableMinutes,
          nonBillableMinutes: stats.totalNonBillableMinutes,
          revenue: stats.totalBillableValue,
        }}
      />

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={refresh} />
    </div>
  )
}
