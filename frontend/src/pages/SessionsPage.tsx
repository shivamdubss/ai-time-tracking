import { useState, useCallback, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { SessionTable } from '@/components/sessions/SessionTable'
import { MatterGroupView } from '@/components/sessions/MatterGroupView'
import { useSelectedDate } from '@/hooks/useSelectedDate'
import { useTimer } from '@/hooks/useTimer'
import { api, TimeTrackWebSocket } from '@/lib/api'
import { roundToDecimalHours } from '@/lib/format'
import type { Session, TrackingStatus, Matter, Client, Activity } from '@/lib/types'
import { cn } from '@/lib/utils'

type ViewMode = 'timeline' | 'by-matter'

export function SessionsPage() {
  const { selectedDate, goBack, goForward, isToday } = useSelectedDate()
  const timer = useTimer()
  const [status, setStatus] = useState<TrackingStatus>('idle')
  const [sessions, setSessions] = useState<Session[]>([])
  const [matters, setMatters] = useState<Matter[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')

  const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`

  // Fetch matters and clients once on mount
  useEffect(() => {
    Promise.all([
      api.getMatters({ status: 'active' }).then(setMatters),
      api.getClients().then(setClients),
    ]).catch(() => {})
  }, [])

  // Fetch sessions for selected date
  const fetchSessions = useCallback(async () => {
    try {
      const data = await api.getSessions(dateStr)
      const mapped = data.map((s: any) => ({
        id: s.id,
        startTime: s.start_time || s.startTime,
        endTime: s.end_time || s.endTime,
        status: s.status,
        summary: s.summary || '',
        categories: s.categories || [],
        activities: s.activities || [],
        matter_id: s.matter_id,
      }))
      setSessions(mapped)
    } catch {
      setSessions([])
    }
  }, [dateStr])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Check tracking status on mount
  useEffect(() => {
    api.getStatus().then((s) => {
      if (s.status === 'tracking') {
        setStatus('tracking')
        timer.start(s.elapsed_seconds)
      } else if (s.status === 'paused') {
        setStatus('paused')
        timer.start(s.elapsed_seconds)
        timer.pause()
      }
    }).catch(() => {})
  }, [])

  // Listen for pause/resume via WebSocket
  useEffect(() => {
    const ws = new TimeTrackWebSocket()
    ws.connect()

    const unsubState = ws.on('tracking_state', (data: { status: string }) => {
      if (data.status === 'paused') {
        setStatus('paused')
        timer.pause()
      } else if (data.status === 'tracking') {
        setStatus('tracking')
        api.getStatus().then((s) => {
          timer.start(s.elapsed_seconds)
        }).catch(() => {})
      }
    })

    const unsubComplete = ws.on('session_completed', () => {
      setStatus('idle')
      timer.reset()
      fetchSessions()
    })

    return () => {
      unsubState()
      unsubComplete()
      ws.disconnect()
    }
  }, [])

  const totalHours = sessions.reduce((acc, s) => {
    if (!s.startTime || !s.endTime) return acc
    const start = new Date(s.startTime).getTime()
    const end = new Date(s.endTime).getTime()
    return acc + (end - start) / (1000 * 60 * 60)
  }, 0)

  const totalActivities = sessions.reduce((acc, s) => acc + (s.activities?.length || 0), 0)

  const totalBillableValue = sessions.reduce((sessionSum, s) => {
    return sessionSum + (s.activities || []).reduce((actSum, act) => {
      if (act.effective_rate != null && act.minutes > 0) {
        return actSum + roundToDecimalHours(act.minutes) * act.effective_rate
      }
      return actSum
    }, 0)
  }, 0)

  const totalNonBillableMinutes = sessions.reduce((sum, s) =>
    sum + (s.activities || []).reduce((actSum, act) =>
      actSum + (act.billable === false ? act.minutes : 0), 0), 0)

  const handleStart = useCallback(async () => {
    try {
      await api.startSession()
      setStatus('tracking')
      timer.start()
    } catch (e: any) {
      console.error('Failed to start session:', e.message)
    }
  }, [timer])

  const handleStop = useCallback(async () => {
    try {
      timer.stop()
      setStatus('processing')
      await api.stopSession()
      const poll = setInterval(async () => {
        try {
          const s = await api.getStatus()
          if (s.status === 'idle') {
            clearInterval(poll)
            setStatus('idle')
            timer.reset()
            fetchSessions()
          }
        } catch {}
      }, 2000)
    } catch (e: any) {
      console.error('Failed to stop session:', e.message)
      setStatus('idle')
      timer.reset()
    }
  }, [timer, fetchSessions])

  function handleSessionUpdated(updatedSession: Session) {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s))
  }

  function handleMatterActivityUpdated(updatedActivity: Activity) {
    setSessions(prev => prev.map(s => ({
      ...s,
      activities: s.activities.map(a => a.id === updatedActivity.id ? updatedActivity : a),
    })))
  }

  async function handleApproveAll() {
    try {
      await api.approveAllActivities(dateStr)
      fetchSessions()
    } catch {}
  }

  function handleExport() {
    api.exportTimesheet(dateStr)
  }

  return (
    <div className="flex flex-col gap-6 p-6 flex-1 min-h-0">
      <Header
        selectedDate={selectedDate}
        isToday={isToday}
        onGoBack={goBack}
        onGoForward={goForward}
        status={status}
        elapsed={timer.elapsed}
        onStartTracking={handleStart}
        onStopTracking={handleStop}
      />

      {/* View toggle + action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5 bg-bg-inset rounded-[var(--radius-sm)] p-0.5">
          <button
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer',
              viewMode === 'timeline'
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary',
            )}
            onClick={() => setViewMode('timeline')}
          >
            Timeline View
          </button>
          <button
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer',
              viewMode === 'by-matter'
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary',
            )}
            onClick={() => setViewMode('by-matter')}
          >
            By Matter
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleApproveAll}
            className="px-4 py-2 text-sm font-medium bg-surface border border-border rounded-[var(--radius-sm)] text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
          >
            Approve All Pending
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium bg-accent text-inverse rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity cursor-pointer"
          >
            Export Timesheet &rarr;
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'timeline' ? (
        <SessionTable
          sessions={sessions}
          totalHours={totalHours}
          totalActivities={totalActivities}
          totalBillableValue={totalBillableValue}
          totalNonBillableMinutes={totalNonBillableMinutes}
          matters={matters}
          onSessionUpdated={handleSessionUpdated}
          isProcessing={status === 'processing'}
        />
      ) : (
        <MatterGroupView
          sessions={sessions}
          matters={matters}
          clients={clients}
          onActivityUpdated={handleMatterActivityUpdated}
        />
      )}
    </div>
  )
}
