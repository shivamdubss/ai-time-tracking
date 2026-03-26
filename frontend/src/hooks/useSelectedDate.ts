import { useState, useCallback } from 'react'
import { isSameDay } from '@/lib/utils'

export function useSelectedDate() {
  const [selectedDate, setSelectedDate] = useState(new Date())

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

  const isToday = isSameDay(selectedDate, new Date())

  return { selectedDate, goBack, goForward, isToday }
}
