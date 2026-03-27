import { useState, useCallback, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/Header'
import { SessionTable } from '@/components/sessions/SessionTable'
import { ProcessingState } from '@/components/sessions/ProcessingState'
import { useSelectedDate } from '@/hooks/useSelectedDate'
import { useTimer } from '@/hooks/useTimer'
import { api, TimeTrackWebSocket } from '@/lib/api'
import type { Session, TrackingStatus, Matter } from '@/lib/types'

export function SessionsPage() {
  const { selectedDate, goBack, goForward, isToday } = useSelectedDate()
  const timer = useTimer()
  const [status, setStatus] = useState<TrackingStatus>('idle')
  const [sessions, setSessions] = useState<Session[]>([])
  const [matters, setMatters] = useState<Matter[]>([])

  // Fetch matters once on mount
  useEffect(() => {
    api.getMatters({ status: 'active' }).then(setMatters).catch(() => {})
  }, [])

  // Fetch sessions for selected date
  const fetchSessions = useCallback(async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const data = await api.getSessions(dateStr)
      // Map snake_case from API to camelCase
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
  }, [selectedDate])

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

  // Compute total billable value across all sessions
  const totalBillableValue = sessions.reduce((sessionSum, s) => {
    return sessionSum + (s.activities || []).reduce((actSum, act) => {
      if (act.effective_rate != null && act.minutes > 0) {
        return actSum + (act.minutes / 60) * act.effective_rate
      }
      return actSum
    }, 0)
  }, 0)

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

      {status === 'processing' ? (
        <ProcessingState />
      ) : (
        <SessionTable
          sessions={sessions}
          totalHours={totalHours}
          totalActivities={totalActivities}
          totalBillableValue={totalBillableValue}
          matters={matters}
          onSessionUpdated={handleSessionUpdated}
        />
      )}
    </div>
  )
}
