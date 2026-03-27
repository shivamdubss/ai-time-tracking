import { useState, useCallback } from 'react'

export function useTimesheetStatus(dateStr: string) {
  const key = `timesheet-status-${dateStr}`

  const [isReleased, setIsReleased] = useState(() => {
    return localStorage.getItem(key) === 'released'
  })

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
