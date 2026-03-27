import { useMemo } from 'react'
import type { Session, Matter, Client, Activity } from '@/lib/types'
import { formatDuration } from '@/lib/format'
import { ClientGroupCard } from './ClientGroupCard'

interface MatterGroupViewProps {
  sessions: Session[]
  matters: Matter[]
  clients: Client[]
  selectedActivities?: Set<string>
  onSelectToggle?: (activityId: string) => void
  onActivityUpdated?: (activity: Activity) => void
  onSwitchToTimeline?: () => void
}

interface MatterGroup {
  matterId: string | null
  matter: Matter | null
  activities: Activity[]
}

interface ClientGroup {
  clientId: string | null
  client: Client | null
  matters: MatterGroup[]
  totalMinutes: number
}

export function MatterGroupView({ sessions, matters, clients, selectedActivities, onSelectToggle, onActivityUpdated, onSwitchToTimeline }: MatterGroupViewProps) {
  const clientMap = useMemo(
    () => new Map(clients.map(c => [c.id, c])),
    [clients],
  )
  const matterMap = useMemo(
    () => new Map(matters.map(m => [m.id, m])),
    [matters],
  )

  const clientGroups = useMemo(() => {
    // Flatten all activities from all sessions
    const allActivities: Activity[] = []
    for (const session of sessions) {
      for (const act of session.activities || []) {
        allActivities.push(act)
      }
    }

    // Group by matter_id
    const matterGroupMap = new Map<string, Activity[]>()
    for (const act of allActivities) {
      const key = act.matter_id || '__unassigned__'
      if (!matterGroupMap.has(key)) matterGroupMap.set(key, [])
      matterGroupMap.get(key)!.push(act)
    }

    // Build matter groups and group by client
    const clientGroupMap = new Map<string, MatterGroup[]>()
    for (const [key, activities] of matterGroupMap) {
      const matterId = key === '__unassigned__' ? null : key
      const matter = matterId ? matterMap.get(matterId) || null : null
      const clientId = matter ? matter.client_id : null
      const clientKey = clientId || '__unassigned__'

      if (!clientGroupMap.has(clientKey)) clientGroupMap.set(clientKey, [])
      clientGroupMap.get(clientKey)!.push({ matterId, matter, activities })
    }

    // Build client groups
    const result: ClientGroup[] = []
    for (const [key, matterGroups] of clientGroupMap) {
      const clientId = key === '__unassigned__' ? null : key
      const client = clientId ? clientMap.get(clientId) || null : null
      const totalMinutes = matterGroups.reduce(
        (sum, mg) => sum + mg.activities.reduce((s, a) => s + a.minutes, 0), 0,
      )

      // Sort matters within client alphabetically
      matterGroups.sort((a, b) => {
        const nameA = a.matter?.name || ''
        const nameB = b.matter?.name || ''
        return nameA.localeCompare(nameB)
      })

      result.push({ clientId, client, matters: matterGroups, totalMinutes })
    }

    // Sort clients: unassigned last, then alphabetically
    result.sort((a, b) => {
      if (!a.client && b.client) return 1
      if (a.client && !b.client) return -1
      const nameA = a.client?.name || ''
      const nameB = b.client?.name || ''
      return nameA.localeCompare(nameB)
    })

    return result
  }, [sessions, matterMap, clientMap])

  const totalMatters = clientGroups.reduce((sum, cg) => sum + cg.matters.length, 0)
  const totalActivities = clientGroups.reduce(
    (sum, cg) => sum + cg.matters.reduce((s, mg) => s + mg.activities.length, 0), 0,
  )
  const totalMinutes = clientGroups.reduce((sum, cg) => sum + cg.totalMinutes, 0)

  if (clientGroups.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] py-12 text-center text-text-muted text-sm">
        No activities to display.
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden">
      {/* Client groups */}
      {clientGroups.map((cg, i) => (
        <ClientGroupCard
          key={cg.clientId || '__unassigned__'}
          clientId={cg.clientId}
          client={cg.client}
          matters={cg.matters}
          totalMinutes={cg.totalMinutes}
          isFirst={i === 0}
          selectedActivities={selectedActivities}
          onSelectToggle={onSelectToggle}
          onActivityUpdated={onActivityUpdated}
          onSwitchToTimeline={onSwitchToTimeline}
        />
      ))}

      {/* Footer */}
      <div className="flex justify-between items-center px-5 py-3 border-t border-border text-[13px] text-text-muted">
        <span>
          {clientGroups.length} {clientGroups.length === 1 ? 'client' : 'clients'} &middot;{' '}
          {totalMatters} {totalMatters === 1 ? 'matter' : 'matters'} &middot;{' '}
          {totalActivities} {totalActivities === 1 ? 'entry' : 'entries'}
        </span>
        <span className="font-mono tabular-nums font-semibold text-text-primary">
          {formatDuration(totalMinutes)}
        </span>
      </div>
    </div>
  )
}
