import { useSettings } from '@/hooks/useSettings'

export function DemoBanner() {
  const { settings } = useSettings()

  if (!settings.demoMode) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-text-inverse text-xs font-display font-semibold shadow-sm select-none pointer-events-none">
      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
      Demo
    </div>
  )
}
