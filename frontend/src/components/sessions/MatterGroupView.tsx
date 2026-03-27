import { useMemo } from 'react'
import type { Session, Matter, Client, Activity } from '@/lib/types'
import { MatterGroupCard } from './MatterGroupCard'

interface MatterGroupViewProps {
  sessions: Session[]
  matters: Matter[]
  clients: Client[]
  onActivityUpdated?: (activity: Activity) => void
}

interface MatterGroup {
  matterId: string | null
  matter: Matter | null
  client: Client | null
  activities: Activity[]
}

export function MatterGroupView({ sessions, matters, clients, onActivityUpdated }: MatterGroupViewProps) {
  const clientMap = useMemo(
    () => new Map(clients.map(c => [c.id, c])),
    [clients],
  )
  const matterMap = useMemo(
    () => new Map(matters.map(m => [m.id, m])),
    [matters],
  )

  const groups = useMemo(() => {
    // Flatten all activities from all sessions
    const allActivities: Activity[] = []
    for (const session of sessions) {
      for (const act of session.activities || []) {
        allActivities.push(act)
      }
    }

    // Group by matter_id
    const groupMap = new Map<string, Activity[]>()
    for (const act of allActivities) {
      const key = act.matter_id || '__unassigned__'
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key)!.push(act)
    }

    // Build group objects
    const result: MatterGroup[] = []
    for (const [key, activities] of groupMap) {
      const matterId = key === '__unassigned__' ? null : key
      const matter = matterId ? matterMap.get(matterId) || null : null
      const client = matter ? clientMap.get(matter.client_id) || null : null
      result.push({ matterId, matter, client, activities })
    }

    // Sort: by client name, then matter name. Unassigned last.
    result.sort((a, b) => {
      if (!a.matter && b.matter) return 1
      if (a.matter && !b.matter) return -1
      const clientA = a.client?.name || ''
      const clientB = b.client?.name || ''
      if (clientA !== clientB) return clientA.localeCompare(clientB)
      const matterA = a.matter?.name || ''
      const matterB = b.matter?.name || ''
      return matterA.localeCompare(matterB)
    })

    return result
  }, [sessions, matterMap, clientMap])

  if (groups.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[var(--radius-md)] py-12 text-center text-text-muted text-sm">
        No activities to display.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <MatterGroupCard
          key={group.matterId || '__unassigned__'}
          matter={group.matter}
          client={group.client}
          activities={group.activities}
          onActivityUpdated={onActivityUpdated}
        />
      ))}
    </div>
  )
}
