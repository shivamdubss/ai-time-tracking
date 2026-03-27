import { getCategoryColors } from '@/lib/types'

const ABBREVIATIONS: Record<string, string> = {
  'Client Communication': 'Comms',
  'Legal Research': 'Research',
  'Document Drafting': 'Drafting',
  'Court & Hearings': 'Court',
  'Case Review': 'Review',
  'Administrative': 'Admin',
  // Legacy
  Communication: 'Comms',
}

interface CategoryPillProps {
  name: string
  percentage: number
}

export function CategoryPill({ name, percentage }: CategoryPillProps) {
  const label = ABBREVIATIONS[name] || name
  const colors = getCategoryColors(name)

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: colors.text }}
      />
      {label} {percentage}%
    </span>
  )
}
