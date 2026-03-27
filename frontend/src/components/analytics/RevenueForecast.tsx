import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import type { AnalyticsTrendPoint } from '@/lib/types'

interface RevenueForecastProps {
  data: AnalyticsTrendPoint[]
  monthlyTarget?: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const actual = payload.find((p: any) => p.dataKey === 'actual')?.value
  const projected = payload.find((p: any) => p.dataKey === 'projected')?.value
  const value = actual ?? projected ?? 0

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-sm)] px-3 py-2 shadow-sm text-xs">
      <div className="font-medium text-text-primary mb-1">{label}</div>
      <div className="text-text-secondary">
        Cumulative: <span className="font-mono">${Math.round(value).toLocaleString()}</span>
      </div>
      {actual == null && projected != null && (
        <div className="text-text-muted italic">Projected</div>
      )}
    </div>
  )
}

export function RevenueForecast({ data, monthlyTarget }: RevenueForecastProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return []

    // Build cumulative actual revenue
    let cumulative = 0
    const actual = data.map((d) => {
      cumulative += d.revenue
      return { date: d.date, actual: Math.round(cumulative * 100) / 100 }
    })

    if (actual.length < 3) return actual.map((d) => ({ ...d, projected: null }))

    // Linear projection to end of month
    const lastDate = new Date(data[data.length - 1].date)
    const endOfMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0)
    const dailyRate = cumulative / actual.length

    const result: { date: string; actual: number | null; projected: number | null }[] =
      actual.map((d) => ({ ...d, projected: null }))

    // Bridge point
    const lastPoint = actual[actual.length - 1]
    result[result.length - 1].projected = lastPoint.actual

    let projCum = cumulative
    const nextDay = new Date(lastDate)
    nextDay.setDate(nextDay.getDate() + 1)
    while (nextDay <= endOfMonth) {
      projCum += dailyRate
      result.push({
        date: nextDay.toISOString().slice(0, 10),
        actual: null,
        projected: Math.round(projCum * 100) / 100,
      })
      nextDay.setDate(nextDay.getDate() + 1)
    }

    return result
  }, [data])

  if (data.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-sm)] p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Revenue Forecast</h3>
        <div className="h-[240px] flex items-center justify-center text-sm text-text-muted">
          No revenue data for this period
        </div>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-')
    if (parts.length < 3) return dateStr
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`
  }

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-sm)] p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Revenue Forecast</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fontFamily: 'Geist Mono, monospace', fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {monthlyTarget && (
            <ReferenceLine
              y={monthlyTarget}
              stroke="var(--color-text-muted)"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: 'Target', position: 'right', fontSize: 10, fill: 'var(--color-text-muted)' }}
            />
          )}
          <Area
            type="monotone"
            dataKey="actual"
            stroke="#171717"
            strokeWidth={2}
            fill="#171717"
            fillOpacity={0.1}
            connectNulls={false}
          />
          <Area
            type="monotone"
            dataKey="projected"
            stroke="#171717"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="#171717"
            fillOpacity={0.05}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
