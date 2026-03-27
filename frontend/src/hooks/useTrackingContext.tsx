import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useTimer } from './useTimer'
import { useSettings } from './useSettings'
import { api, TimeTrackWebSocket } from '@/lib/api'
import { isSameDay } from '@/lib/utils'
import { roundToDecimalHours } from '@/lib/format'
import type { TrackingStatus, Session, Matter, Client, Activity } from '@/lib/types'

interface TrackingContextValue {
  selectedDate: Date
  dateStr: string
  goBack: () => void
  goForward: () => void
  isToday: boolean
  status: TrackingStatus
  elapsed: number
  handleStart: () => Promise<void>
  handleStop: () => Promise<void>
  refreshKey: number
  sessions: Session[]
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>
  matters: Matter[]
  clients: Client[]
  totalHours: number
  totalActivities: number
  totalBillableValue: number
  totalBillableMinutes: number
  totalNonBillableMinutes: number
  handleSessionUpdated: (session: Session) => void
  handleActivityUpdated: (activity: Activity) => void
  handleActivityDeleted: (activityId: string) => void
  workHoursBlocked: boolean
}

const TrackingContext = createContext<TrackingContextValue | null>(null)

export function useTracking() {
  const ctx = useContext(TrackingContext)
  if (!ctx) throw new Error('useTracking must be used within TrackingProvider')
  return ctx
}

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const { isWithinWorkHours } = useSettings()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const timer = useTimer()
  const [status, setStatus] = useState<TrackingStatus>('idle')
  const [workHoursBlocked, setWorkHoursBlocked] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const timerRef = useRef(timer)
  timerRef.current = timer

  const [sessions, setSessions] = useState<Session[]>([])
  const [matters, setMatters] = useState<Matter[]>([])
  const [clients, setClients] = useState<Client[]>([])

  const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
  const isToday = isSameDay(selectedDate, new Date())

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
  }, [fetchSessions, refreshKey])

  const stats = useMemo(() => {
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

    const totalBillableMinutes = sessions.reduce((sum, s) =>
      sum + (s.activities || []).reduce((actSum, act) =>
        actSum + (act.billable !== false ? act.minutes : 0), 0), 0)

    const totalNonBillableMinutes = sessions.reduce((sum, s) =>
      sum + (s.activities || []).reduce((actSum, act) =>
        actSum + (act.billable === false ? act.minutes : 0), 0), 0)

    return { totalHours, totalActivities, totalBillableValue, totalBillableMinutes, totalNonBillableMinutes }
  }, [sessions])

  function handleSessionUpdated(updatedSession: Session) {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s))
  }

  function handleActivityUpdated(updatedActivity: Activity) {
    setSessions(prev => prev.map(s => ({
      ...s,
      activities: s.activities.map(a => a.id === updatedActivity.id ? updatedActivity : a),
    })))
  }

  function handleActivityDeleted(activityId: string) {
    setSessions(prev => prev.map(s => ({
      ...s,
      activities: s.activities.filter(a => a.id !== activityId),
    })))
  }

  const goBack = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 1)
      return d
    })
  }, [])

  const goForward = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 1)
      return d
    })
  }, [])

  // Check tracking status on mount
  useEffect(() => {
    api.getStatus().then((s) => {
      if (s.status === 'tracking') {
        setStatus('tracking')
        timerRef.current.start(s.elapsed_seconds)
      } else if (s.status === 'paused') {
        setStatus('paused')
        timerRef.current.start(s.elapsed_seconds)
        timerRef.current.pause()
      }
    }).catch(() => {})
  }, [])

  // WebSocket for tracking state changes
  useEffect(() => {
    const ws = new TimeTrackWebSocket()
    ws.connect()

    const unsubState = ws.on('tracking_state', (data: { status: string }) => {
      if (data.status === 'paused') {
        setStatus('paused')
        timerRef.current.pause()
      } else if (data.status === 'tracking') {
        setStatus('tracking')
        api.getStatus().then((s) => {
          timerRef.current.start(s.elapsed_seconds)
        }).catch(() => {})
      }
    })

    const unsubComplete = ws.on('session_completed', () => {
      setStatus('idle')
      timerRef.current.reset()
      setRefreshKey((k) => k + 1)
    })

    return () => {
      unsubState()
      unsubComplete()
      ws.disconnect()
    }
  }, [])

  const handleStart = useCallback(async () => {
    if (!isWithinWorkHours()) {
      setWorkHoursBlocked(true)
      setTimeout(() => setWorkHoursBlocked(false), 3000)
      return
    }
    try {
      await api.startSession()
      setStatus('tracking')
      timerRef.current.start()
    } catch (e: any) {
      console.error('Failed to start session:', e.message)
    }
  }, [isWithinWorkHours])

  const handleStop = useCallback(async () => {
    try {
      timerRef.current.stop()
      setStatus('processing')
      await api.stopSession()
      const poll = setInterval(async () => {
        try {
          const s = await api.getStatus()
          if (s.status === 'idle') {
            clearInterval(poll)
            setStatus('idle')
            timerRef.current.reset()
            setRefreshKey((k) => k + 1)
          }
        } catch {}
      }, 2000)
    } catch (e: any) {
      console.error('Failed to stop session:', e.message)
      setStatus('idle')
      timerRef.current.reset()
    }
  }, [])

  return (
    <TrackingContext.Provider
      value={{
        selectedDate,
        dateStr,
        goBack,
        goForward,
        isToday,
        status,
        elapsed: timer.elapsed,
        handleStart,
        handleStop,
        refreshKey,
        sessions,
        setSessions,
        matters,
        clients,
        ...stats,
        handleSessionUpdated,
        handleActivityUpdated,
        handleActivityDeleted,
        workHoursBlocked,
      }}
    >
      {children}
    </TrackingContext.Provider>
  )
}
