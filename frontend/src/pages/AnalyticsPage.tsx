import { useState } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { PeriodSelector } from '@/components/analytics/PeriodSelector'
import { SummaryCards } from '@/components/analytics/SummaryCards'
import { BillableHourTrend } from '@/components/analytics/BillableHourTrend'
import { RevenueForecast } from '@/components/analytics/RevenueForecast'
import { MatterRanking } from '@/components/analytics/MatterRanking'

function getThisMonthRange(): { start: string; end: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const start = `${y}-${String(m + 1).padStart(2, '0')}-01`
  const end = now.toISOString().slice(0, 10)
  return { start, end }
}

export function AnalyticsPage() {
  const defaultRange = getThisMonthRange()
  const [startDate, setStartDate] = useState(defaultRange.start)
  const [endDate, setEndDate] = useState(defaultRange.end)

  const { summary, trend, byMatter, loading, error } = useAnalytics(startDate, endDate)

  const handlePeriodChange = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
  }

  const hasNoData = !loading && summary && summary.total_hours === 0

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pt-16 md:pt-6 pb-8">
      <h1 className="sr-only">Revenue Analytics</h1>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-lg font-display font-bold text-text-primary">Revenue Analytics</h2>
        <PeriodSelector
          startDate={startDate}
          endDate={endDate}
          onPeriodChange={handlePeriodChange}
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-[var(--radius-sm)] px-4 py-3 mb-6 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Empty state */}
      {hasNoData ? (
        <div className="bg-surface border border-border rounded-[var(--radius-sm)] px-8 py-16 text-center">
          <p className="text-text-secondary text-sm mb-4">
            No activity recorded for this period. Try selecting a different time range.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Summary KPI cards */}
          <SummaryCards summary={summary} />

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BillableHourTrend data={trend} />
            <RevenueForecast data={trend} />
          </div>

          {/* Breakdown row */}
          <MatterRanking data={byMatter} />
        </div>
      )}
    </div>
  )
}
