import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-accent text-text-inverse hover:bg-accent-hover',
  secondary:
    'bg-surface text-text-primary border border-border hover:bg-surface-hover',
  ghost:
    'text-text-secondary hover:bg-surface-hover',
  danger:
    'bg-error text-text-inverse hover:opacity-90',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-body text-sm font-semibold',
          'px-4 py-2.5 rounded-[var(--radius-sm)]',
          'transition-all duration-100 ease-out',
          'disabled:opacity-50 disabled:pointer-events-none',
          'cursor-pointer',
          variantStyles[variant],
          className,
        )}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
