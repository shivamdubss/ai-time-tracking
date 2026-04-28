import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: 'top' | 'bottom'
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 -translate-x-1/2 z-50',
          'whitespace-nowrap px-2 py-1 rounded-[var(--radius-sm)]',
          'bg-text-primary text-text-inverse text-xs font-medium shadow-md',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-150',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {content}
      </span>
    </span>
  )
}
