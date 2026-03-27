import { useSettings } from '@/hooks/useSettings'
import { Toggle } from '@/components/ui/Toggle'

export function SettingsPage() {
  const { settings, updateSettings, isWithinWorkHours } = useSettings()
  const { workHours } = settings

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 flex-1 min-h-0 pt-16 md:pt-6">
      <h1 className="font-display font-bold text-xl text-text-primary">Settings</h1>

      {/* Work Hours */}
      <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden max-w-lg">
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-semibold text-sm text-text-primary">Work Hours</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Only allow auto-capture during these hours
            </p>
          </div>
          <Toggle
            checked={workHours.enabled}
            onChange={(enabled) =>
              updateSettings({ workHours: { ...workHours, enabled } })
            }
          />
        </div>

        {workHours.enabled && (
          <div className="px-5 py-4 border-t border-border-subtle">
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-muted">Start</label>
                <input
                  type="time"
                  value={workHours.startTime}
                  onChange={(e) =>
                    updateSettings({ workHours: { ...workHours, startTime: e.target.value } })
                  }
                  className="bg-page border border-border rounded-[var(--radius-sm)] px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
                />
              </div>
              <span className="text-text-faint text-sm mt-5">to</span>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-muted">End</label>
                <input
                  type="time"
                  value={workHours.endTime}
                  onChange={(e) =>
                    updateSettings({ workHours: { ...workHours, endTime: e.target.value } })
                  }
                  className="bg-page border border-border rounded-[var(--radius-sm)] px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint"
                />
              </div>
            </div>

            <p className={`text-xs mt-3 font-medium ${isWithinWorkHours() ? 'text-success' : 'text-warning'}`}>
              {isWithinWorkHours() ? 'Currently within work hours' : 'Currently outside work hours'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
