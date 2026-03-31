import { useState, useCallback, useEffect } from 'react'

export function useTimesheetStatus(startDate: string, endDate?: string) {
  const effectiveEnd = endDate || startDate
  const key = startDate === effectiveEnd
    ? `timesheet-status-${startDate}`
    : `timesheet-released-${startDate}-${effectiveEnd}`

  const [isReleased, setIsReleased] = useState(() => {
    return localStorage.getItem(key) === 'released'
  })

  // Re-check when key changes (date range changed)
  useEffect(() => {
    setIsReleased(localStorage.getItem(key) === 'released')
  }, [key])

  const release = useCallback(() => {
    localStorage.setItem(key, 'released')
    setIsReleased(true)
  }, [key])

  const unrelease = useCallback(() => {
    localStorage.removeItem(key)
    setIsReleased(false)
  }, [key])

  return { isReleased, release, unrelease }
}
