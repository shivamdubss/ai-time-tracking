import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  group?: string
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  className?: string
  panelClassName?: string
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
  onCreateNew?: () => void
  createNewLabel?: string
}

export function Select({ value, options, onChange, className, panelClassName, placeholder, disabled, ariaLabel, onCreateNew, createNewLabel }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; minWidth: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)
  const label = selected?.label ?? placeholder ?? ''

  // Preserve option order while grouping
  const { ungrouped, groups } = useMemo(() => {
    const ungrouped: SelectOption[] = []
    const groupMap = new Map<string, SelectOption[]>()
    for (const opt of options) {
      if (!opt.group) ungrouped.push(opt)
      else {
        const arr = groupMap.get(opt.group) || []
        arr.push(opt)
        groupMap.set(opt.group, arr)
      }
    }
    return { ungrouped, groups: Array.from(groupMap.entries()) }
  }, [options])

  function positionPanel() {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setCoords({ top: rect.bottom + 4, left: rect.left, minWidth: rect.width })
  }

  function toggle() {
    if (disabled) return
    if (!open) positionPanel()
    setOpen(v => !v)
  }

  function select(v: string) {
    onChange(v)
    setOpen(false)
  }

  useLayoutEffect(() => {
    if (open) positionPanel()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onScroll() { setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const renderOption = (opt: SelectOption) => {
    const active = opt.value === value
    return (
      <button
        key={opt.value || '__empty__'}
        type="button"
        onClick={() => select(opt.value)}
        className={cn(
          'flex items-center justify-between w-full gap-2 px-2.5 py-1.5 text-left text-sm cursor-pointer transition-colors rounded-[var(--radius-sm)]',
          active ? 'text-text-primary bg-surface-hover' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        )}
      >
        <span className="truncate">{opt.label}</span>
        {active && <Check size={13} className="text-text-primary shrink-0" />}
      </button>
    )
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          'inline-flex items-center gap-1.5 cursor-pointer transition-colors max-w-full truncate disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
      >
        <span className="truncate">{label}</span>
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          style={{ position: 'fixed', top: coords.top, left: coords.left, minWidth: Math.max(coords.minWidth, 180) }}
          className={cn(
            'z-50 max-h-72 overflow-auto bg-surface border border-border rounded-[var(--radius-sm)] shadow-lg p-1',
            panelClassName,
          )}
        >
          {ungrouped.map(renderOption)}
          {groups.map(([groupName, opts]) => (
            <div key={groupName} className="pt-1">
              <div className="px-2.5 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                {groupName}
              </div>
              {opts.map(renderOption)}
            </div>
          ))}
          {onCreateNew && (
            <>
              <div className="mt-1 border-t border-border-subtle" />
              <button
                type="button"
                onClick={() => { setOpen(false); onCreateNew() }}
                className="flex items-center gap-1.5 w-full px-2.5 py-1.5 mt-1 text-left text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary cursor-pointer rounded-[var(--radius-sm)] transition-colors"
              >
                <Plus size={13} />
                {createNewLabel ?? 'New…'}
              </button>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
