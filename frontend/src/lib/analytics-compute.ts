import { roundToDecimalHours } from './format'
import type {
  AnalyticsSummary,
  AnalyticsTrendPoint,
  AnalyticsByMatter,
  AnalyticsCategoryRow,
} from './types'

interface RawActivity {
  minutes: number
  billable: boolean
  effective_rate: number | null
  category: string | null
  matter_id: string | null
  session_start_time: string
  matter_name?: string | null
  client_name?: string | null
}

function countWorkingDays(startDate: string, endDate: string): { total: number; elapsed: number; remaining: number } {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let total = 0
  let elapsed = 0
  const d = new Date(start)

  while (d <= end) {
    const day = d.getDay()
    if (day >= 1 && day <= 5) {
      total++
      if (d <= today) elapsed++
    }
    d.setDate(d.getDate() + 1)
  }

  return { total, elapsed, remaining: total - elapsed }
}

export function computeAnalyticsSummary(
  activities: RawActivity[],
  startDate: string,
  endDate: string,
  availableHoursPerDay = 8.0,
): AnalyticsSummary {
  let billableMin = 0
  let nonBillableMin = 0
  let revenue = 0

  for (const a of activities) {
    const mins = a.minutes || 0
    if (a.billable) {
      billableMin += mins
      const rate = a.effective_rate || 0
      revenue += roundToDecimalHours(mins) * rate
    } else {
      nonBillableMin += mins
    }
  }

  const billableHours = Math.round(billableMin / 60 * 100) / 100
  const nonBillableHours = Math.round(nonBillableMin / 60 * 100) / 100
  const totalHours = Math.round((billableMin + nonBillableMin) / 60 * 100) / 100

  const { total: totalDays, elapsed: elapsedDays, remaining: remainingDays } = countWorkingDays(startDate, endDate)
  const availableHours = Math.round(totalDays * availableHoursPerDay * 10) / 10
  const elapsedAvailable = Math.round(elapsedDays * availableHoursPerDay * 10) / 10

  const utilizationRate = elapsedAvailable > 0 ? Math.round(billableHours / elapsedAvailable * 10000) / 10000 : 0
  const effectiveRate = billableHours > 0 ? Math.round(revenue / billableHours * 100) / 100 : 0
  const realizationRate = totalHours > 0 ? Math.round(billableHours / totalHours * 10000) / 10000 : 0

  let dailyAvgBillable = 0
  let projectedMonthlyRevenue = 0
  if (elapsedDays > 0) {
    dailyAvgBillable = Math.round(billableHours / elapsedDays * 100) / 100
    const dailyAvgRevenue = revenue / elapsedDays
    projectedMonthlyRevenue = Math.round(dailyAvgRevenue * totalDays * 100) / 100
  }

  return {
    billable_hours: billableHours,
    non_billable_hours: nonBillableHours,
    total_hours: totalHours,
    revenue: Math.round(revenue * 100) / 100,
    effective_rate: effectiveRate,
    utilization_rate: utilizationRate,
    realization_rate: realizationRate,
    available_hours: availableHours,
    working_days: elapsedDays,
    forecast: {
      projected_monthly_revenue: projectedMonthlyRevenue,
      daily_average_billable: dailyAvgBillable,
      working_days_remaining: remainingDays,
    },
  }
}

export function computeAnalyticsTrend(
  activities: RawActivity[],
  granularity: string = 'day',
): AnalyticsTrendPoint[] {
  const getPeriod = (dateStr: string): string => {
    const d = new Date(dateStr)
    if (granularity === 'month') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    if (granularity === 'week') {
      // ISO week: get the Monday of the week
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(d)
      monday.setDate(diff)
      return `${monday.getFullYear()}-W${String(Math.ceil((((monday.getTime() - new Date(monday.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)).padStart(2, '0')}`
    }
    // day
    return d.toISOString().slice(0, 10)
  }

  const periods = new Map<string, { billableMin: number; nonBillableMin: number; revenue: number }>()

  for (const a of activities) {
    const period = getPeriod(a.session_start_time)
    const entry = periods.get(period) || { billableMin: 0, nonBillableMin: 0, revenue: 0 }
    const mins = a.minutes || 0

    if (a.billable) {
      entry.billableMin += mins
      if (a.effective_rate) {
        entry.revenue += roundToDecimalHours(mins) * a.effective_rate
      }
    } else {
      entry.nonBillableMin += mins
    }

    periods.set(period, entry)
  }

  return Array.from(periods.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      billable_hours: Math.round(data.billableMin / 60 * 100) / 100,
      non_billable_hours: Math.round(data.nonBillableMin / 60 * 100) / 100,
      revenue: Math.round(data.revenue * 100) / 100,
    }))
}

export function computeAnalyticsByMatter(
  activities: RawActivity[],
  limit = 10,
): AnalyticsByMatter {
  const matterData = new Map<string | null, { billableMin: number; revenue: number; matterName: string; clientName: string }>()

  for (const a of activities) {
    const key = a.matter_id
    const entry = matterData.get(key) || { billableMin: 0, revenue: 0, matterName: a.matter_name || 'Unknown', clientName: a.client_name || 'Unknown' }

    if (a.billable) {
      const mins = a.minutes || 0
      entry.billableMin += mins
      if (a.effective_rate) {
        entry.revenue += roundToDecimalHours(mins) * a.effective_rate
      }
    }

    matterData.set(key, entry)
  }

  const totalBillableMin = Array.from(matterData.values()).reduce((sum, d) => sum + d.billableMin, 0)

  const data: AnalyticsByMatter['data'] = []
  let unassigned = { hours: 0, revenue: 0 }

  const sorted = Array.from(matterData.entries()).sort(([, a], [, b]) => b.billableMin - a.billableMin)

  for (const [matterId, d] of sorted) {
    const bHours = Math.round(d.billableMin / 60 * 100) / 100
    const rev = Math.round(d.revenue * 100) / 100
    const pct = totalBillableMin > 0 ? Math.round(d.billableMin / totalBillableMin * 1000) / 10 : 0

    if (matterId === null) {
      unassigned = { hours: bHours, revenue: rev }
      continue
    }

    const effRate = bHours > 0 ? Math.round(rev / bHours * 100) / 100 : 0
    data.push({
      matter_id: matterId,
      matter_name: d.matterName,
      client_name: d.clientName,
      billable_hours: bHours,
      revenue: rev,
      effective_rate: effRate,
      percentage: pct,
    })
  }

  return { data: data.slice(0, limit), unassigned }
}

export function computeAnalyticsByCategory(activities: RawActivity[]): AnalyticsCategoryRow[] {
  const catData = new Map<string, { billableMin: number; nonBillableMin: number; revenue: number }>()

  for (const a of activities) {
    const cat = a.category || 'Administrative'
    const entry = catData.get(cat) || { billableMin: 0, nonBillableMin: 0, revenue: 0 }
    const mins = a.minutes || 0

    if (a.billable) {
      entry.billableMin += mins
      if (a.effective_rate) {
        entry.revenue += roundToDecimalHours(mins) * a.effective_rate
      }
    } else {
      entry.nonBillableMin += mins
    }

    catData.set(cat, entry)
  }

  const totalMin = Array.from(catData.values()).reduce((sum, d) => sum + d.billableMin + d.nonBillableMin, 0)

  return Array.from(catData.entries())
    .sort(([, a], [, b]) => (b.billableMin + b.nonBillableMin) - (a.billableMin + a.nonBillableMin))
    .map(([category, d]) => ({
      category,
      billable_hours: Math.round(d.billableMin / 60 * 100) / 100,
      non_billable_hours: Math.round(d.nonBillableMin / 60 * 100) / 100,
      revenue: Math.round(d.revenue * 100) / 100,
      percentage: totalMin > 0 ? Math.round((d.billableMin + d.nonBillableMin) / totalMin * 1000) / 10 : 0,
    }))
}
