import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className={cn(
      'inline-flex items-center gap-2 cursor-pointer select-none',
      disabled && 'opacity-50 pointer-events-none',
    )}>
      <button
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-150 ease-out cursor-pointer',
          checked ? 'bg-accent' : 'bg-border',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out',
            'absolute top-0.5',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
      {label && (
        <span className="text-[13px] text-text-muted">{label}</span>
      )}
    </label>
  )
}
