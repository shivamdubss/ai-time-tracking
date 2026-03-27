import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts'
import type { AnalyticsTrendPoint } from '@/lib/types'

interface BillableHourTrendProps {
  data: AnalyticsTrendPoint[]
  dailyTarget?: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const billable = payload.find((p: any) => p.dataKey === 'billable_hours')?.value ?? 0
  const nonBillable = payload.find((p: any) => p.dataKey === 'non_billable_hours')?.value ?? 0
  const revenue = payload[0]?.payload?.revenue ?? 0

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-sm)] px-3 py-2 shadow-sm text-xs">
      <div className="font-medium text-text-primary mb-1">{label}</div>
      <div className="text-text-secondary">Billable: <span className="font-mono">{billable.toFixed(1)}h</span></div>
      <div className="text-text-secondary">Non-billable: <span className="font-mono">{nonBillable.toFixed(1)}h</span></div>
      {revenue > 0 && (
        <div className="text-text-secondary mt-1">Revenue: <span className="font-mono">${revenue.toLocaleString()}</span></div>
      )}
    </div>
  )
}

export function BillableHourTrend({ data, dailyTarget = 6.0 }: BillableHourTrendProps) {
  if (data.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-sm)] p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Billable Hour Trend</h3>
        <div className="h-[240px] flex items-center justify-center text-sm text-text-muted">
          No activity data for this period
        </div>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    if (dateStr.includes('-W')) return dateStr
    const parts = dateStr.split('-')
    if (parts.length === 2) return dateStr
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`
  }

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-sm)] p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Billable Hour Trend</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fontFamily: 'Geist Mono, monospace', fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-inset)', opacity: 0.5 }} />
          <ReferenceLine
            y={dailyTarget}
            stroke="var(--color-text-muted)"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <Bar dataKey="billable_hours" stackId="hours" fill="#171717" radius={[2, 2, 0, 0]} />
          <Bar dataKey="non_billable_hours" stackId="hours" fill="#E5E5E5" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
