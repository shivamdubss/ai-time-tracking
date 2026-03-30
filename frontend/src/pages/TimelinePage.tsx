import { useState, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { SessionTable } from '@/components/sessions/SessionTable'
import { SummaryStats } from '@/components/sessions/SummaryStats'
import { useTracking } from '@/hooks/useTrackingContext'
import { useSessionData } from '@/hooks/useSessionData'
import { Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { Session } from '@/lib/types'

export function TimelinePage() {
  const { selectedDate, isToday, goBack, goForward, status, elapsed, handleStart, handleStop, workHoursBlocked, refreshMatters } = useTracking()
  const {
    sessions, setSessions, matters, clients,
    totalHours, totalActivities, totalBillableValue, totalBillableMinutes, totalNonBillableMinutes,
    handleSessionUpdated,
  } = useSessionData()
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set())

  function handleSelectToggle(activityId: string) {
    setSelectedActivities(prev => {
      const next = new Set(prev)
      if (next.has(activityId)) next.delete(activityId)
      else next.add(activityId)
      return next
    })
  }

  function handleSelectSession(activityIds: string[], select: boolean) {
    setSelectedActivities(prev => {
      const next = new Set(prev)
      for (const id of activityIds) {
        if (select) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  async function handleDeleteSelected() {
    if (selectedActivities.size === 0) return
    if (!window.confirm(`Delete ${selectedActivities.size} selected ${selectedActivities.size === 1 ? 'activity' : 'activities'}?`)) return
    const ids = Array.from(selectedActivities)
    await Promise.allSettled(ids.map(id => api.deleteActivity(id)))
    setSessions(prev => {
      const updated = prev.map(s => ({
        ...s,
        activities: s.activities.filter(a => !a.id || !selectedActivities.has(a.id)),
      }))
      updated.filter(s => s.activities.length === 0).forEach(s => {
        if (s.id) api.deleteSession(s.id)
      })
      return updated.filter(s => s.activities.length > 0)
    })
    setSelectedActivities(new Set())
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6 flex-1 min-h-0 pt-16 md:pt-6">
      <h1 className="sr-only">Timeline</h1>
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
      />

      <SummaryStats
        totalHours={totalHours}
        totalBillableMinutes={totalBillableMinutes}
        totalBillableValue={totalBillableValue}
        totalNonBillableMinutes={totalNonBillableMinutes}
      />

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

      <SessionTable
        sessions={sessions}
        totalHours={totalHours}
        totalActivities={totalActivities}
        totalBillableValue={totalBillableValue}
        totalNonBillableMinutes={totalNonBillableMinutes}
        matters={matters}
        clients={clients}
        selectedActivities={selectedActivities}
        onSelectToggle={handleSelectToggle}
        onSelectSession={handleSelectSession}
        onSessionUpdated={handleSessionUpdated}
        onDataRefresh={refreshMatters}
        isProcessing={status === 'processing'}
      />
    </div>
  )
}
