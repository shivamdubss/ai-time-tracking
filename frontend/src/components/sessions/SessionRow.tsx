import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Session, Matter, Client, Activity } from '@/lib/types'
import { formatTimeRange, cn } from '@/lib/utils'
import { formatSessionHours } from '@/lib/format'
import { CategoryBar } from '@/components/ui/CategoryBar'
import { CategoryPill } from '@/components/ui/CategoryPill'
import { ActivityRow } from './ActivityRow'

interface SessionRowProps {
  session: Session
  matters?: Matter[]
  clients?: Client[]
  selectedActivities?: Set<string>
  onSelectToggle?: (activityId: string) => void
  onSessionUpdated?: (session: Session) => void
  onSelectSession?: (activityIds: string[], select: boolean) => void
  onDataRefresh?: () => void
}

export function SessionRow({ session, matters, clients, selectedActivities, onSelectToggle, onSessionUpdated, onSelectSession, onDataRefresh }: SessionRowProps) {
  const [expanded, setExpanded] = useState(false)
  const hours = formatSessionHours(session.startTime, session.endTime)
  const checkboxRef = useRef<HTMLInputElement>(null)

  const activityIds = session.activities.map(a => a.id).filter(Boolean) as string[]
  const selectedCount = activityIds.filter(id => selectedActivities?.has(id)).length
  const allSelected = activityIds.length > 0 && selectedCount === activityIds.length
  const someSelected = selectedCount > 0 && !allSelected

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  const topCategories = session.categories.slice(0, 3)

  function handleActivityUpdated(updatedActivity: Activity) {
    if (!onSessionUpdated) return
    const updatedActivities = session.activities.map(a =>
      a.id === updatedActivity.id ? updatedActivity : a
    )
    onSessionUpdated({ ...session, activities: updatedActivities })
  }

  function handleActivityDeleted(activityId: string) {
    if (!onSessionUpdated) return
    const updatedActivities = session.activities.filter(a => a.id !== activityId)
    onSessionUpdated({ ...session, activities: updatedActivities })
  }

  return (
    <div className="border-b border-border-subtle last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded) } }}
        className={cn(
          'flex flex-col gap-2 md:grid md:grid-cols-[24px_1fr_80px_1.2fr] md:gap-4 px-5 py-4 cursor-pointer transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
          expanded ? 'bg-surface-hover' : 'hover:bg-surface-hover',
        )}
      >
        <div className="hidden md:flex items-center justify-center">
          {onSelectSession && activityIds.length > 0 && (
            <input
              ref={checkboxRef}
              type="checkbox"
              checked={allSelected}
              onChange={(e) => {
                e.stopPropagation()
                onSelectSession(activityIds, !allSelected)
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-3.5 h-3.5 rounded border-border accent-accent cursor-pointer"
            />
          )}
        </div>
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
              clients={clients}
              selected={activity.id ? selectedActivities?.has(activity.id) : false}
              onSelectToggle={onSelectToggle}
              onActivityUpdated={handleActivityUpdated}
              onActivityDeleted={handleActivityDeleted}
              onDataRefresh={onDataRefresh}
            />
          ))}
        </div>
      )}
    </div>
  )
}
