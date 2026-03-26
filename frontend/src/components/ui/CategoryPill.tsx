import type { CategoryName } from '@/lib/types'

const pillStyles: Record<CategoryName, string> = {
  Coding: 'bg-cat-coding-bg text-cat-coding',
  Communication: 'bg-cat-comms-bg text-cat-comms',
  Research: 'bg-cat-research-bg text-cat-research',
  Meetings: 'bg-cat-meetings-bg text-cat-meetings',
  Browsing: 'bg-cat-browsing-bg text-cat-browsing',
}

const dotStyles: Record<CategoryName, string> = {
  Coding: 'bg-cat-coding',
  Communication: 'bg-cat-comms',
  Research: 'bg-cat-research',
  Meetings: 'bg-cat-meetings',
  Browsing: 'bg-cat-browsing',
}

interface CategoryPillProps {
  name: CategoryName
  percentage: number
}

export function CategoryPill({ name, percentage }: CategoryPillProps) {
  const label = name === 'Communication' ? 'Comms' : name
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${pillStyles[name]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[name]}`} />
      {label} {percentage}%
    </span>
  )
}
