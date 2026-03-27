import type { AnalyticsSummary } from '@/lib/types'

interface SummaryCardsProps {
  summary: AnalyticsSummary | null
}

function Card({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-sm)] px-4 py-3">
      <div className="text-xs text-text-muted font-medium mb-1">{label}</div>
      <div className="text-lg font-semibold font-mono tabular-nums text-text-primary">{value}</div>
      {subtitle && <div className="text-xs text-text-muted mt-0.5">{subtitle}</div>}
    </div>
  )
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-[var(--radius-sm)] px-4 py-3 animate-pulse">
            <div className="h-3 w-16 bg-inset rounded mb-2" />
            <div className="h-5 w-20 bg-inset rounded" />
          </div>
        ))}
      </div>
    )
  }

  const utilPct = Math.round(summary.utilization_rate * 100)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card
        label="Billable Hours"
        value={summary.billable_hours.toFixed(1)}
        subtitle={`${summary.total_hours.toFixed(1)} total`}
      />
      <Card
        label="Revenue"
        value={`$${summary.revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
        subtitle={summary.forecast.projected_monthly_revenue > 0
          ? `$${summary.forecast.projected_monthly_revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} projected`
          : undefined}
      />
      <Card
        label="Utilization Rate"
        value={`${utilPct}%`}
        subtitle={`${summary.available_hours.toFixed(0)}h available`}
      />
      <Card
        label="Effective Rate"
        value={summary.effective_rate > 0 ? `$${summary.effective_rate.toFixed(0)}` : '—'}
        subtitle={summary.effective_rate > 0 ? '/hour blended' : 'No rates configured'}
      />
    </div>
  )
}
