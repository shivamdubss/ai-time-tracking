import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { getCategoryBarColor } from '@/lib/types'
import type { AnalyticsCategoryRow } from '@/lib/types'

interface CategoryBreakdownProps {
  data: AnalyticsCategoryRow[]
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-sm)] px-3 py-2 shadow-sm text-xs">
      <div className="font-medium text-text-primary mb-1">{d.category}</div>
      <div className="text-text-secondary">Billable: <span className="font-mono">{d.billable_hours.toFixed(1)}h</span></div>
      <div className="text-text-secondary">Non-billable: <span className="font-mono">{d.non_billable_hours.toFixed(1)}h</span></div>
      {d.revenue > 0 && (
        <div className="text-text-secondary mt-1">Revenue: <span className="font-mono">${d.revenue.toLocaleString()}</span></div>
      )}
    </div>
  )
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  const totalHours = data.reduce((s, d) => s + d.billable_hours + d.non_billable_hours, 0)
  const chartData = data.map((d) => ({
    ...d,
    total_hours: d.billable_hours + d.non_billable_hours,
  }))

  if (data.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-sm)] p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Hours by Category</h3>
        <div className="h-[240px] flex items-center justify-center text-sm text-text-muted">
          No category data
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-sm)] p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Hours by Category</h3>
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: 200, height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="total_hours"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                strokeWidth={0}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.category} fill={getCategoryBarColor(entry.category)} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-2xl font-semibold font-mono tabular-nums text-text-primary">
                {totalHours.toFixed(1)}
              </div>
              <div className="text-xs text-text-muted">hours</div>
            </div>
          </div>
        </div>

        {/* Legend table */}
        <table className="w-full mt-4 text-xs">
          <thead>
            <tr className="text-text-muted border-b border-border">
              <th className="text-left pb-2 font-medium">Category</th>
              <th className="text-right pb-2 font-medium">Billable</th>
              <th className="text-right pb-2 font-medium">Non-Bill</th>
              <th className="text-right pb-2 font-medium">Revenue</th>
              <th className="text-right pb-2 font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.category} className="border-b border-border/50">
                <td className="py-1.5 flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryBarColor(d.category) }}
                  />
                  <span className="text-text-primary">{d.category}</span>
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums text-text-secondary">
                  {d.billable_hours.toFixed(1)}
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums text-text-secondary">
                  {d.non_billable_hours.toFixed(1)}
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums text-text-secondary">
                  {d.revenue > 0 ? `$${d.revenue.toLocaleString()}` : '—'}
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums text-text-muted">
                  {d.percentage.toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
