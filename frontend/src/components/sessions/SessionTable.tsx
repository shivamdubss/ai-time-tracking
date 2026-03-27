import type { Session, Matter } from '@/lib/types'
import { SessionRow } from './SessionRow'
import { EmptyState } from './EmptyState'

interface SessionTableProps {
  sessions: Session[]
  totalHours: number
  totalActivities: number
  totalBillableValue?: number
  totalNonBillableMinutes?: number
  matters?: Matter[]
  onSessionUpdated?: (session: Session) => void
}

export function SessionTable({ sessions, totalHours, totalActivities, totalBillableValue, totalNonBillableMinutes, matters, onSessionUpdated }: SessionTableProps) {
  if (sessions.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_1.2fr] gap-4 px-5 py-2.5 border-b border-border text-[11px] font-bold tracking-wider uppercase text-text-muted">
        <div>Activity</div>
        <div>Hours</div>
        <div>Narrative</div>
      </div>

      {/* Rows */}
      {sessions.map((session) => (
        <SessionRow
          key={session.id}
          session={session}
          matters={matters}
          onSessionUpdated={onSessionUpdated}
        />
      ))}

      {/* Footer */}
      <div className="flex justify-between items-center px-5 py-3 border-t border-border text-[13px] text-text-muted">
        <span>
          {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} &middot;{' '}
          {totalActivities} {totalActivities === 1 ? 'activity' : 'activities'}
        </span>
        <span className="flex items-center gap-3">
          {totalNonBillableMinutes != null && totalNonBillableMinutes > 0 && (
            <span className="text-xs text-text-faint">
              <span className="font-mono tabular-nums">{(totalNonBillableMinutes / 60).toFixed(1)}h</span> non-billable
            </span>
          )}
          {totalBillableValue != null && totalBillableValue > 0 && (
            <span className="font-mono font-semibold text-text-primary tabular-nums">
              ${totalBillableValue.toFixed(0)}
            </span>
          )}
          <span>
            Total:{' '}
            <span className="font-mono font-semibold text-text-primary tabular-nums">
              {totalHours.toFixed(1)} hours
            </span>
          </span>
        </span>
      </div>
    </div>
  )
}
