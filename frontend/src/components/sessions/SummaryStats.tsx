import { formatDuration } from '@/lib/format'

interface SummaryStatsProps {
  totalHours: number
  totalBillableMinutes: number
  totalNonBillableMinutes: number
}

export function SummaryStats({ totalHours, totalBillableMinutes, totalNonBillableMinutes }: SummaryStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-surface border border-border rounded-[var(--radius-sm)] px-4 py-3">
        <div className="text-xs text-text-muted mb-1">Total Hours</div>
        <div className="font-mono tabular-nums text-lg font-semibold text-text-primary">
          {totalHours.toFixed(1)}
        </div>
      </div>
      <div className="bg-surface border border-border rounded-[var(--radius-sm)] px-4 py-3">
        <div className="text-xs text-text-muted mb-1">Billable</div>
        <div className="font-mono tabular-nums text-lg font-semibold text-text-primary">
          {formatDuration(totalBillableMinutes)}
        </div>
      </div>
      <div className="bg-surface border border-border rounded-[var(--radius-sm)] px-4 py-3">
        <div className="text-xs text-text-muted mb-1">Non-Billable</div>
        <div className="font-mono tabular-nums text-lg font-semibold text-text-primary">
          {formatDuration(totalNonBillableMinutes)}
        </div>
      </div>
    </div>
  )
}
