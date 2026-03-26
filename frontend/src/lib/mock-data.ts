import type { Session } from './types'

const today = new Date()
const todayStr = today.toISOString().split('T')[0]
const yesterday = new Date(today)
yesterday.setDate(today.getDate() - 1)
const yesterdayStr = yesterday.toISOString().split('T')[0]

export const MOCK_SESSIONS: Record<string, Session[]> = {
  [todayStr]: [
    {
      id: '1',
      startTime: `${todayStr}T09:02:00`,
      endTime: `${todayStr}T12:34:00`,
      status: 'completed',
      summary:
        'Built maintenance workflow orchestration module and tenant communication service. Reviewed PRs, coordinated deployment timing with infrastructure team, and researched caching strategies for the API gateway.',
      categories: [
        { name: 'Coding', minutes: 97, percentage: 46 },
        { name: 'Communication', minutes: 53, percentage: 25 },
        { name: 'Research', minutes: 32, percentage: 15 },
        { name: 'Meetings', minutes: 21, percentage: 10 },
        { name: 'Browsing', minutes: 9, percentage: 4 },
      ],
      activities: [
        {
          app: 'VS Code',
          context: 'mesh-platform / src / workflows',
          minutes: 102,
          narrative:
            'Built the maintenance workflow orchestration module with retry logic and dead-letter queue handling. Added unit tests for the state machine transitions.',
        },
        {
          app: 'Slack',
          context: '#eng-platform, #deploys',
          minutes: 53,
          narrative:
            'Coordinated with infrastructure team on deployment window for the workflow service. Discussed caching invalidation strategy in #eng-platform.',
        },
        {
          app: 'Chrome',
          context: 'github.com / mesh-platform',
          minutes: 30,
          narrative:
            'Reviewed three open PRs on the mesh-platform repo. Merged calendar integration branch after resolving conflicts with the scheduling module.',
        },
        {
          app: 'Notion',
          context: 'Engineering Wiki',
          minutes: 15,
          narrative:
            'Updated the deployment runbook with the new workflow service steps and rollback procedures.',
        },
        {
          app: 'Zoom',
          context: 'Standup',
          minutes: 12,
          narrative:
            'Daily standup with the platform team. Discussed blockers on the caching layer migration.',
        },
      ],
    },
    {
      id: '2',
      startTime: `${todayStr}T13:15:00`,
      endTime: `${todayStr}T15:47:00`,
      status: 'completed',
      summary:
        'Focused deep work session on the tenant communication service. Implemented webhook delivery with exponential backoff and researched Redis Streams as an alternative to the current polling architecture.',
      categories: [
        { name: 'Coding', minutes: 91, percentage: 60 },
        { name: 'Research', minutes: 30, percentage: 20 },
        { name: 'Browsing', minutes: 31, percentage: 20 },
      ],
      activities: [
        {
          app: 'VS Code',
          context: 'mesh-platform / src / comms',
          minutes: 91,
          narrative:
            'Implemented the webhook delivery system with exponential backoff, circuit breaker pattern, and dead-letter queue for failed deliveries.',
        },
        {
          app: 'Chrome',
          context: 'redis.io/docs',
          minutes: 30,
          narrative:
            'Researched Redis Streams consumer groups as a replacement for the current SQS polling architecture. Bookmarked key articles on partition strategies.',
        },
        {
          app: 'Chrome',
          context: 'stackoverflow.com, github.com',
          minutes: 31,
          narrative:
            'Looked up edge cases in webhook retry strategies and reviewed open-source implementations of circuit breaker patterns in Python.',
        },
      ],
    },
  ],
  [yesterdayStr]: [
    {
      id: '3',
      startTime: `${yesterdayStr}T10:00:00`,
      endTime: `${yesterdayStr}T11:30:00`,
      status: 'completed',
      summary:
        'Sprint planning session followed by architecture review for the notification service redesign.',
      categories: [
        { name: 'Meetings', minutes: 60, percentage: 67 },
        { name: 'Communication', minutes: 20, percentage: 22 },
        { name: 'Browsing', minutes: 10, percentage: 11 },
      ],
      activities: [
        {
          app: 'Zoom',
          context: 'Sprint Planning',
          minutes: 45,
          narrative:
            'Sprint planning with the platform team. Prioritized the notification service redesign and webhook reliability improvements.',
        },
        {
          app: 'Zoom',
          context: 'Arch Review',
          minutes: 15,
          narrative:
            'Architecture review for the notification service. Decided on event-driven approach with Redis Streams.',
        },
        {
          app: 'Slack',
          context: '#eng-platform',
          minutes: 20,
          narrative:
            'Follow-up discussion on sprint priorities and task assignments.',
        },
        {
          app: 'Chrome',
          context: 'linear.app',
          minutes: 10,
          narrative:
            'Updated Linear tickets with sprint assignments and acceptance criteria.',
        },
      ],
    },
    {
      id: '4',
      startTime: `${yesterdayStr}T13:00:00`,
      endTime: `${yesterdayStr}T17:15:00`,
      status: 'completed',
      summary:
        'Extended coding session refactoring the notification dispatch pipeline. Migrated from synchronous to async processing with proper error boundaries.',
      categories: [
        { name: 'Coding', minutes: 195, percentage: 77 },
        { name: 'Research', minutes: 35, percentage: 14 },
        { name: 'Communication', minutes: 25, percentage: 9 },
      ],
      activities: [
        {
          app: 'VS Code',
          context: 'mesh-platform / src / notifications',
          minutes: 195,
          narrative:
            'Major refactor of the notification dispatch pipeline. Replaced synchronous processing with asyncio-based approach. Added error boundaries and graceful degradation for downstream service failures.',
        },
        {
          app: 'Chrome',
          context: 'docs.python.org, realpython.com',
          minutes: 35,
          narrative:
            'Researched asyncio best practices for production systems. Read through Python docs on TaskGroups and exception handling in async contexts.',
        },
        {
          app: 'Slack',
          context: '#eng-platform',
          minutes: 25,
          narrative:
            'Quick sync with backend lead on the async migration approach. Got approval to proceed with TaskGroup-based concurrency.',
        },
      ],
    },
  ],
}

export function getSessionsForDate(date: Date): Session[] {
  const key = date.toISOString().split('T')[0]
  return MOCK_SESSIONS[key] || []
}

export function getTotalHours(sessions: Session[]): number {
  return sessions.reduce((acc, s) => {
    const start = new Date(s.startTime).getTime()
    const end = new Date(s.endTime).getTime()
    return acc + (end - start) / (1000 * 60 * 60)
  }, 0)
}

export function getTotalActivities(sessions: Session[]): number {
  return sessions.reduce((acc, s) => acc + s.activities.length, 0)
}
