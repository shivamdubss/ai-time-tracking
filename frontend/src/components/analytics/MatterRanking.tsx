import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnalyticsByMatter } from '@/lib/types'

interface MatterRankingProps {
  data: AnalyticsByMatter | null
}

type SortKey = 'billable_hours' | 'revenue' | 'effective_rate'

export function MatterRanking({ data }: MatterRankingProps) {
  const [showAll, setShowAll] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('billable_hours')
  const [sortAsc, setSortAsc] = useState(false)

  if (!data || data.data.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-sm)] p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Hours by Matter</h3>
        <div className="h-[240px] flex items-center justify-center text-sm text-text-muted">
          No matter data for this period
        </div>
      </div>
    )
  }

  const sorted = [...data.data].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey]
    return sortAsc ? diff : -diff
  })

  const displayed = showAll ? sorted : sorted.slice(0, 10)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null
    return sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-sm)] p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Hours by Matter</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-text-muted border-b border-border">
              <th className="text-left pb-2 font-medium w-8">#</th>
              <th className="text-left pb-2 font-medium">Client / Matter</th>
              <th
                className="text-right pb-2 font-medium cursor-pointer select-none"
                onClick={() => handleSort('billable_hours')}
              >
                <span className="inline-flex items-center gap-0.5">Hours <SortIcon col="billable_hours" /></span>
              </th>
              <th
                className="text-right pb-2 font-medium cursor-pointer select-none"
                onClick={() => handleSort('revenue')}
              >
                <span className="inline-flex items-center gap-0.5">Revenue <SortIcon col="revenue" /></span>
              </th>
              <th className="text-right pb-2 font-medium">%</th>
              <th
                className="text-right pb-2 font-medium cursor-pointer select-none"
                onClick={() => handleSort('effective_rate')}
              >
                <span className="inline-flex items-center gap-0.5">Avg Rate <SortIcon col="effective_rate" /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((row, i) => (
              <tr key={row.matter_id} className="border-b border-border/50">
                <td className="py-1.5 text-text-muted">{i + 1}</td>
                <td className="py-1.5">
                  <div className="text-text-primary font-medium">{row.matter_name}</div>
                  <div className="text-text-muted">{row.client_name}</div>
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums text-text-secondary">
                  {row.billable_hours.toFixed(1)}
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums text-text-secondary">
                  {row.revenue > 0 ? `$${row.revenue.toLocaleString()}` : '—'}
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums text-text-muted">
                  {row.percentage.toFixed(0)}%
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums text-text-secondary">
                  {row.effective_rate > 0 ? `$${row.effective_rate.toFixed(0)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.data.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className={cn(
            'mt-3 text-xs font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer',
          )}
        >
          {showAll ? 'Show top 10' : `Show all ${data.data.length} matters`}
        </button>
      )}
    </div>
  )
}
