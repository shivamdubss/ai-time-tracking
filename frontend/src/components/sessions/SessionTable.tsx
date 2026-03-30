import type { Session, Matter, Client } from '@/lib/types'
import { formatDuration } from '@/lib/format'
import { SessionRow } from './SessionRow'
import { EmptyState } from './EmptyState'
import { InlineProcessingRow } from './InlineProcessingRow'

interface SessionTableProps {
  sessions: Session[]
  totalHours: number
  totalActivities: number
  totalBillableValue?: number
  totalNonBillableMinutes?: number
  matters?: Matter[]
  clients?: Client[]
  selectedActivities?: Set<string>
  onSelectToggle?: (activityId: string) => void
  onSessionUpdated?: (session: Session) => void
  onSelectSession?: (activityIds: string[], select: boolean) => void
  onDataRefresh?: () => void
  isProcessing?: boolean
}

export function SessionTable({ sessions, totalHours, totalActivities, totalBillableValue, totalNonBillableMinutes, matters, clients, selectedActivities, onSelectToggle, onSelectSession, onSessionUpdated, onDataRefresh, isProcessing }: SessionTableProps) {
  if (sessions.length === 0 && !isProcessing) {
    return <EmptyState />
  }

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[24px_1fr_80px_1.2fr] gap-4 px-5 py-2.5 border-b border-border text-xs font-bold tracking-wider uppercase text-text-muted">
        <div />
        <div>Activity</div>
        <div>Hours</div>
        <div>Narrative</div>
      </div>

      {/* Processing row (inline, at top) */}
      {isProcessing && <InlineProcessingRow />}

      {/* Rows */}
      {sessions.map((session) => (
        <SessionRow
          key={session.id}
          session={session}
          matters={matters}
          clients={clients}
          selectedActivities={selectedActivities}
          onSelectToggle={onSelectToggle}
          onSessionUpdated={onSessionUpdated}
          onSelectSession={onSelectSession}
          onDataRefresh={onDataRefresh}
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
              <span className="font-mono tabular-nums">{formatDuration(totalNonBillableMinutes)}</span> non-billable
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
              {totalHours.toFixed(1)} hrs
            </span>
          </span>
        </span>
      </div>
    </div>
  )
}
