import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { MatterGroupView } from '@/components/sessions/MatterGroupView'
import { SummaryStats } from '@/components/sessions/SummaryStats'
import { useTracking } from '@/hooks/useTrackingContext'
import { useSessionData } from '@/hooks/useSessionData'
import { useTimesheetStatus } from '@/hooks/useTimesheetStatus'
import { api } from '@/lib/api'
import { Trash2, Download, CheckCircle2, Undo2 } from 'lucide-react'

export function TimesheetPage() {
  const { selectedDate, dateStr, isToday, goBack, goForward, status, elapsed, handleStart, handleStop } = useTracking()
  const {
    sessions, setSessions, matters, clients,
    totalHours, totalBillableValue, totalBillableMinutes, totalNonBillableMinutes,
    handleActivityUpdated,
  } = useSessionData()
  const { isReleased, release, unrelease } = useTimesheetStatus(dateStr)
  const navigate = useNavigate()
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set())

  function handleSelectToggle(activityId: string) {
    setSelectedActivities(prev => {
      const next = new Set(prev)
      if (next.has(activityId)) next.delete(activityId)
      else next.add(activityId)
      return next
    })
  }

  async function handleDeleteSelected() {
    if (selectedActivities.size === 0) return
    if (!window.confirm(`Delete ${selectedActivities.size} selected ${selectedActivities.size === 1 ? 'activity' : 'activities'}?`)) return
    const ids = Array.from(selectedActivities)
    await Promise.allSettled(ids.map(id => api.deleteActivity(id)))
    setSessions(prev => prev.map(s => ({
      ...s,
      activities: s.activities.filter(a => !a.id || !selectedActivities.has(a.id)),
    })))
    setSelectedActivities(new Set())
  }

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

      {/* Bulk delete bar */}
      {selectedActivities.size > 0 && (
        <div className="flex items-center justify-between bg-surface border border-border rounded-[var(--radius-sm)] px-4 py-2.5">
          <span className="text-sm text-text-secondary">
            {selectedActivities.size} {selectedActivities.size === 1 ? 'activity' : 'activities'} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedActivities(new Set())}
              className="px-3 py-1.5 text-sm font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-error bg-error-bg hover:bg-red-100 rounded-[var(--radius-sm)] transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      )}

      <MatterGroupView
        sessions={sessions}
        matters={matters}
        clients={clients}
        selectedActivities={selectedActivities}
        onSelectToggle={handleSelectToggle}
        onActivityUpdated={handleActivityUpdated}
        onSwitchToTimeline={() => navigate('/')}
      />
    </div>
  )
}
