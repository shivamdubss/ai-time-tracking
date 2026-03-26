import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Session, CategoryName } from '@/lib/types'
import { formatTimeRange, cn } from '@/lib/utils'
import { CategoryBar } from '@/components/ui/CategoryBar'
import { CategoryPill } from '@/components/ui/CategoryPill'
import { ActivityRow } from './ActivityRow'

interface SessionRowProps {
  session: Session
}

export function SessionRow({ session }: SessionRowProps) {
  const [expanded, setExpanded] = useState(false)
  const hours = (
    (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) /
    (1000 * 60 * 60)
  ).toFixed(1)

  const topCategories = session.categories.slice(0, 3)

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
                name={cat.name as CategoryName}
                percentage={cat.percentage}
              />
            ))}
          </div>
        </div>
        <div className="font-mono text-[15px] font-medium text-text-primary tabular-nums pt-0.5">
          {hours}
        </div>
        <div className="text-sm leading-relaxed text-text-secondary">{session.summary}</div>
      </div>

      {expanded && (
        <div className="px-5 pb-3 animate-in fade-in duration-200">
          {session.activities.map((activity, i) => (
            <ActivityRow
              key={i}
              activity={activity}
              isLast={i === session.activities.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
