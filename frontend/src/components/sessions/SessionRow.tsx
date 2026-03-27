import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Session, Matter, Activity } from '@/lib/types'
import { formatTimeRange, cn } from '@/lib/utils'
import { formatSessionHours } from '@/lib/format'
import { CategoryBar } from '@/components/ui/CategoryBar'
import { CategoryPill } from '@/components/ui/CategoryPill'
import { ActivityRow } from './ActivityRow'

interface SessionRowProps {
  session: Session
  matters?: Matter[]
  onSessionUpdated?: (session: Session) => void
}

export function SessionRow({ session, matters, onSessionUpdated }: SessionRowProps) {
  const [expanded, setExpanded] = useState(false)
  const hours = formatSessionHours(session.startTime, session.endTime)

  const topCategories = session.categories.slice(0, 3)

  // Compute total billable value from activities
  const totalBillableValue = session.activities.reduce((sum, act) => {
    if (act.effective_rate != null && act.minutes > 0) {
      return sum + (act.minutes / 60) * act.effective_rate
    }
    return sum
  }, 0)

  function handleActivityUpdated(updatedActivity: Activity) {
    if (!onSessionUpdated) return
    const updatedActivities = session.activities.map(a =>
      a.id === updatedActivity.id ? updatedActivity : a
    )
    onSessionUpdated({ ...session, activities: updatedActivities })
  }

  return (
    <div className="border-b border-border-subtle last:border-b-0">
      <div
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'grid grid-cols-[1fr_80px_1.2fr] gap-4 px-5 py-4 cursor-pointer transition-colors duration-100',
          expanded ? 'bg-surface-hover' : 'hover:bg-surface-hover',
        )}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display font-semibold text-sm text-text-primary">
              {formatTimeRange(session.startTime, session.endTime)}
            </span>
            <ChevronDown
              size={14}
              className={cn(
                'text-text-faint transition-transform duration-200',
                expanded && 'rotate-180',
              )}
            />
          </div>
          <div className="text-xs text-text-muted mb-2.5">
            {session.activities.length} {session.activities.length === 1 ? 'activity' : 'activities'}
          </div>
          <CategoryBar categories={session.categories} />
          <div className="flex gap-1.5 flex-wrap mt-2.5">
            {topCategories.map((cat) => (
              <CategoryPill
                key={cat.name}
                name={cat.name}
                percentage={cat.percentage}
              />
            ))}
          </div>
        </div>
        <div className="font-mono text-[15px] font-medium text-text-primary tabular-nums pt-0.5">
          <div>{hours}</div>
          {totalBillableValue > 0 && (
            <div className="text-xs text-text-muted font-normal">
              ${totalBillableValue.toFixed(0)}
            </div>
          )}
        </div>
        <div className="text-sm leading-relaxed text-text-secondary">{session.summary}</div>
      </div>

      {expanded && (
        <div className="px-5 pb-3 animate-in fade-in duration-200">
          {session.activities.map((activity, i) => (
            <ActivityRow
              key={activity.id || i}
              activity={activity}
              isLast={i === session.activities.length - 1}
              matters={matters}
              onActivityUpdated={handleActivityUpdated}
            />
          ))}
        </div>
      )}
    </div>
  )
}
