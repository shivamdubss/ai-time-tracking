import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type {
  AnalyticsSummary,
  AnalyticsTrendPoint,
  AnalyticsByMatter,
  AnalyticsCategoryRow,
} from '@/lib/types'

interface UseAnalyticsResult {
  summary: AnalyticsSummary | null
  trend: AnalyticsTrendPoint[]
  byMatter: AnalyticsByMatter | null
  byCategory: AnalyticsCategoryRow[]
  loading: boolean
  error: string | null
}

export function useAnalytics(startDate: string, endDate: string): UseAnalyticsResult {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [trend, setTrend] = useState<AnalyticsTrendPoint[]>([])
  const [byMatter, setByMatter] = useState<AnalyticsByMatter | null>(null)
  const [byCategory, setByCategory] = useState<AnalyticsCategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return
    setLoading(true)
    setError(null)

    try {
      const [summaryRes, trendRes, matterRes, categoryRes] = await Promise.all([
        api.getAnalyticsSummary(startDate, endDate),
        api.getAnalyticsTrend(startDate, endDate),
        api.getAnalyticsByMatter(startDate, endDate),
        api.getAnalyticsByCategory(startDate, endDate),
      ])

      setSummary(summaryRes)
      setTrend(trendRes.data)
      setByMatter(matterRes)
      setByCategory(categoryRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { summary, trend, byMatter, byCategory, loading, error }
}
