import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { SessionTable } from '@/components/sessions/SessionTable'
import { SummaryStats } from '@/components/sessions/SummaryStats'
import { useTracking } from '@/hooks/useTrackingContext'
import { useSessionData } from '@/hooks/useSessionData'
import { Trash2, Search, Clock, FolderOpen } from 'lucide-react'
import { api } from '@/lib/api'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'

type ViewMode = 'chronological' | 'by-matter'

export function TimelinePage() {
  const { selectedDate, isToday, goBack, goForward, goToDate, status, elapsed, handleStart, handleStop, workHoursBlocked, refreshMatters } = useTracking()
  const { settings } = useSettings()
  const {
    sessions, setSessions, matters, clients,
    totalHours, totalBillableMinutes, totalNonBillableMinutes,
    handleSessionUpdated,
  } = useSessionData()
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('chronological')
  const [searchQuery, setSearchQuery] = useState('')

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
        onGoToDate={goToDate}
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
        totalNonBillableMinutes={totalNonBillableMinutes}
      />

      {/* Search + view toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities, matters, clients…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-border-default focus:ring-1 focus:ring-border-default"
          />
        </div>
        <div className="inline-flex items-center rounded-[var(--radius-sm)] border border-border bg-surface p-0.5 text-sm">
          <button
            onClick={() => setViewMode('chronological')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer',
              viewMode === 'chronological'
                ? 'bg-inset text-text-primary font-medium'
                : 'text-text-muted hover:text-text-primary',
            )}
          >
            <Clock size={13} />
            Chronological
          </button>
          <button
            onClick={() => setViewMode('by-matter')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer',
              viewMode === 'by-matter'
                ? 'bg-inset text-text-primary font-medium'
                : 'text-text-muted hover:text-text-primary',
            )}
          >
            <FolderOpen size={13} />
            By matter
          </button>
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

      <SessionTable
        sessions={sessions}
        matters={matters}
        clients={clients}
        selectedActivities={selectedActivities}
        onSelectToggle={handleSelectToggle}
        onSessionUpdated={handleSessionUpdated}
        onDataRefresh={refreshMatters}
        isProcessing={status === 'processing'}
        viewMode={viewMode}
        searchQuery={searchQuery}
      />
    </div>
  )
}
