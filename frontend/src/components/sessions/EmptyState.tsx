import { Clock } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] py-20 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-full bg-inset border border-border flex items-center justify-center mb-4">
        <Clock size={20} className="text-text-faint" />
      </div>
      <h3 className="font-display font-semibold text-sm text-text-primary mb-1">
        No sessions recorded
      </h3>
      <p className="text-[13px] text-text-muted max-w-[280px]">
        Click "Start Tracking" to begin recording your work session. Donna will capture your
        activity in the background.
      </p>
    </div>
  )
}
