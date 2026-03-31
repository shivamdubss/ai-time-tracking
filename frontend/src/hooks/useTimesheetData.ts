import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '@/lib/api'
import { roundToDecimalHours } from '@/lib/format'
import type { Session, Activity, Matter, Client } from '@/lib/types'

interface TimesheetFilters {
  clientIds: string[]
  matterIds: string[]
}

interface TimesheetStats {
  totalHours: number
  totalBillableValue: number
  totalBillableMinutes: number
  totalNonBillableMinutes: number
}

export function useTimesheetData(
  startDate: string,
  endDate: string,
  filters: TimesheetFilters,
  matters: Matter[],
  clients: Client[],
) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSessions = useCallback(async () => {
    if (!startDate || !endDate) return
    setLoading(true)
    try {
      const data = startDate === endDate
        ? await api.getSessions(startDate)
        : await api.getSessionsForRange(startDate, endDate)
      setSessions(data)
    } catch (err) {
      console.error('Failed to fetch timesheet sessions:', err)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Build matter→client lookup for filtering
  const matterClientMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of matters) {
      map.set(m.id, m.client_id)
    }
    return map
  }, [matters])

  // Apply client/matter filters and compute stats
  const { filteredSessions, stats } = useMemo(() => {
    const hasClientFilter = filters.clientIds.length > 0
    const hasMatterFilter = filters.matterIds.length > 0
    const clientSet = new Set(filters.clientIds)
    const matterSet = new Set(filters.matterIds)

    let totalBillableMinutes = 0
    let totalNonBillableMinutes = 0
    let totalBillableValue = 0

    const filtered: Session[] = []

    for (const session of sessions) {
      const matchingActivities: Activity[] = []

      for (const act of session.activities || []) {
        // Apply matter filter
        if (hasMatterFilter && !matterSet.has(act.matter_id || '')) continue

        // Apply client filter
        if (hasClientFilter) {
          const clientId = act.matter_id ? matterClientMap.get(act.matter_id) : undefined
          if (!clientId || !clientSet.has(clientId)) continue
        }

        matchingActivities.push(act)

        // Accumulate stats
        const mins = act.minutes || 0
        if (act.billable !== false) {
          totalBillableMinutes += mins
          const hours = roundToDecimalHours(mins)
          totalBillableValue += hours * (act.effective_rate || 0)
        } else {
          totalNonBillableMinutes += mins
        }
      }

      if (matchingActivities.length > 0) {
        filtered.push({ ...session, activities: matchingActivities })
      }
    }

    const totalMinutes = totalBillableMinutes + totalNonBillableMinutes
    const totalHours = totalMinutes > 0 ? Math.round(totalMinutes / 60 * 10) / 10 : 0

    return {
      filteredSessions: filtered,
      stats: {
        totalHours,
        totalBillableValue: Math.round(totalBillableValue * 100) / 100,
        totalBillableMinutes,
        totalNonBillableMinutes,
      } as TimesheetStats,
    }
  }, [sessions, filters, matterClientMap])

  // Handlers that update local state after edits
  const handleActivityUpdated = useCallback((updated: Activity) => {
    setSessions(prev => prev.map(s => ({
      ...s,
      activities: (s.activities || []).map(a => a.id === updated.id ? updated : a),
    })))
  }, [])

  const handleActivityDeleted = useCallback((activityId: string) => {
    setSessions(prev => prev.map(s => ({
      ...s,
      activities: (s.activities || []).filter(a => a.id !== activityId),
    })))
  }, [])

  return {
    sessions: filteredSessions,
    stats,
    loading,
    refresh: fetchSessions,
    handleActivityUpdated,
    handleActivityDeleted,
  }
}
