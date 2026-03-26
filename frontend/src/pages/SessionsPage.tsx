import { useMemo, useState, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { SessionTable } from '@/components/sessions/SessionTable'
import { ProcessingState } from '@/components/sessions/ProcessingState'
import { useSelectedDate } from '@/hooks/useSelectedDate'
import { useTimer } from '@/hooks/useTimer'
import { getSessionsForDate, getTotalHours, getTotalActivities } from '@/lib/mock-data'
import type { TrackingStatus } from '@/lib/types'

export function SessionsPage() {
  const { selectedDate, goBack, goForward, isToday } = useSelectedDate()
  const timer = useTimer()
  const [status, setStatus] = useState<TrackingStatus>('idle')
  const [autoCapture, setAutoCapture] = useState(true)

  const sessions = useMemo(() => getSessionsForDate(selectedDate), [selectedDate])
  const totalHours = useMemo(() => getTotalHours(sessions), [sessions])
  const totalActivities = useMemo(() => getTotalActivities(sessions), [sessions])

  const handleStart = useCallback(() => {
    setStatus('tracking')
    timer.start()
  }, [timer])

  const handleStop = useCallback(() => {
    timer.stop()
    setStatus('processing')
    // Simulate processing delay
    setTimeout(() => {
      setStatus('idle')
      timer.reset()
    }, 3000)
  }, [timer])

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
        autoCapture={autoCapture}
        onToggleAutoCapture={setAutoCapture}
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
