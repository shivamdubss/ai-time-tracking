import { useState, useCallback, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { SessionTable } from '@/components/sessions/SessionTable'
import { ProcessingState } from '@/components/sessions/ProcessingState'
import { useSelectedDate } from '@/hooks/useSelectedDate'
import { useTimer } from '@/hooks/useTimer'
import { api } from '@/lib/api'
import type { Session, TrackingStatus } from '@/lib/types'

export function SessionsPage() {
  const { selectedDate, goBack, goForward, isToday } = useSelectedDate()
  const timer = useTimer()
  const [status, setStatus] = useState<TrackingStatus>('idle')
  const [sessions, setSessions] = useState<Session[]>([])

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
      }))
      setSessions(mapped)
    } catch {
      // API not available — show empty state
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
        // Timer will start from elapsed seconds
        timer.start(s.elapsed_seconds)
      }
    }).catch(() => {})
  }, [])

  const totalHours = sessions.reduce((acc, s) => {
    if (!s.startTime || !s.endTime) return acc
    const start = new Date(s.startTime).getTime()
    const end = new Date(s.endTime).getTime()
    return acc + (end - start) / (1000 * 60 * 60)
  }, 0)

  const totalActivities = sessions.reduce((acc, s) => acc + (s.activities?.length || 0), 0)

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
      // Poll for completion
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
        />
      )}
    </div>
  )
}
