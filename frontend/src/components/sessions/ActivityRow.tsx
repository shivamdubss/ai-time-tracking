import type { Activity, CategoryName } from '@/lib/types'
import { CATEGORY_BAR_COLORS } from '@/lib/types'
import { formatDuration } from '@/lib/format'

interface ActivityRowProps {
  activity: Activity
  isLast: boolean
}

function getAppCategory(app: string): CategoryName {
  const lower = app.toLowerCase()
  if (lower.includes('code') || lower.includes('terminal') || lower.includes('iterm'))
    return 'Coding'
  if (lower.includes('slack') || lower.includes('teams') || lower.includes('discord'))
    return 'Communication'
  if (lower.includes('zoom') || lower.includes('meet') || lower.includes('facetime'))
    return 'Meetings'
  if (lower.includes('notion') || lower.includes('docs'))
    return 'Research'
  return 'Browsing'
}

function getAppAbbrev(app: string): string {
  if (app.toLowerCase().includes('code')) return 'VS'
  if (app.toLowerCase().includes('slack')) return 'Sl'
  if (app.toLowerCase().includes('chrome')) return 'Ch'
  if (app.toLowerCase().includes('zoom')) return 'Zm'
  if (app.toLowerCase().includes('notion')) return 'No'
  if (app.toLowerCase().includes('safari')) return 'Sa'
  if (app.toLowerCase().includes('figma')) return 'Fi'
  if (app.toLowerCase().includes('terminal')) return 'Te'
  return app.slice(0, 2)
}

export function ActivityRow({ activity, isLast }: ActivityRowProps) {
  const category = getAppCategory(activity.app)
  const color = CATEGORY_BAR_COLORS[category]
  const hours = formatDuration(activity.minutes)

  return (
    <div
      className={`grid grid-cols-[1fr_80px_1.2fr] gap-4 py-3 text-[13px] ${
        !isLast ? 'border-b border-border-subtle' : ''
      }`}
    >
      <div>
        <div className="flex items-center gap-2 font-semibold text-text-primary">
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
            style={{ backgroundColor: color }}
          >
            {getAppAbbrev(activity.app)}
          </div>
          {activity.app}
        </div>
        <div className="text-xs text-text-muted mt-0.5 pl-7">{activity.context}</div>
      </div>
      <div className="font-mono text-[13px] text-text-muted tabular-nums">{hours}</div>
      <div className="text-[13px] leading-relaxed text-text-secondary">{activity.narrative}</div>
    </div>
  )
}
