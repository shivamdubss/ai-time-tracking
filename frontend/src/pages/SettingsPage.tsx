import { useSettings } from '@/hooks/useSettings'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { isWebMode } from '@/lib/platform'
import { Toggle } from '@/components/ui/Toggle'
import { CheckCircle2 } from 'lucide-react'
import { useIntegrations } from '@/hooks/useIntegrations'

export function SettingsPage() {
  const { settings, updateSettings, isWithinWorkHours } = useSettings()
  const { user, signOut } = useAuth()
  const { workHours } = settings
  const { status: integrationStatus, connectGoogle, disconnectGoogle, connectM365, disconnectM365 } = useIntegrations()

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 flex-1 min-h-0 pt-16 md:pt-6">
      <h1 className="font-display font-bold text-xl text-text-primary">Settings</h1>

      {/* Work Hours (desktop only — controls auto-capture) */}
      {!isWebMode && <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden max-w-lg">
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
      </div>}

      {/* Default Hourly Rate */}
      <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden max-w-lg">
        <div className="px-5 py-4">
          <h2 className="font-display font-semibold text-sm text-text-primary">Default Hourly Rate</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Fallback rate for activities without a matter or client rate
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-text-muted">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g., 350"
              value={settings.defaultHourlyRate ?? ''}
              onChange={(e) => {
                const val = e.target.value
                updateSettings({ defaultHourlyRate: val === '' ? null : parseFloat(val) })
              }}
              className="bg-page border border-border rounded-[var(--radius-sm)] px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-text-faint w-32"
            />
            <span className="text-xs text-text-muted">/ hr</span>
          </div>
        </div>
      </div>

      {/* Demo Mode — admin only */}
      {user?.email === 'shivam@donnaanswers.com' && (
        <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden max-w-lg">
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-semibold text-sm text-text-primary">Demo Mode</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Show a demo indicator across the app
              </p>
            </div>
            <Toggle
              checked={settings.demoMode}
              onChange={(demoMode) => updateSettings({ demoMode })}
            />
          </div>
        </div>
      )}

      {/* Integrations */}
      <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden max-w-lg">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="font-display font-semibold text-sm text-text-primary">Integrations</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Connect external accounts to import calendar events and emails as time entries
          </p>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          {/* Google Calendar */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-inset border border-border flex items-center justify-center shrink-0 overflow-hidden">
                <img src="/integrations/google.png" alt="Google logo" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Google Calendar</p>
                <p className="text-xs text-text-muted">
                  {integrationStatus.google ? integrationStatus.google_email : 'Import court sessions and prep blocks'}
                </p>
              </div>
            </div>
            {integrationStatus.google ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <button onClick={disconnectGoogle} className="text-xs text-text-muted hover:text-text-primary underline cursor-pointer">
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={connectGoogle} className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer shrink-0">
                Connect
              </button>
            )}
          </div>

          <div className="border-t border-border-subtle" />

          {/* Microsoft 365 */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-inset border border-border flex items-center justify-center shrink-0 overflow-hidden">
                <img src="/integrations/microsoft.png" alt="Microsoft logo" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Microsoft 365</p>
                <p className="text-xs text-text-muted">
                  {integrationStatus.m365 ? integrationStatus.m365_email : 'Import sent items and inbox'}
                </p>
              </div>
            </div>
            {integrationStatus.m365 ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <button onClick={disconnectM365} className="text-xs text-text-muted hover:text-text-primary underline cursor-pointer">
                  Disconnect
                </button>
              </div>
            ) : (
              <button onClick={connectM365} className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer shrink-0">
                Connect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Practice Management Systems */}
      <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden max-w-lg">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="font-display font-semibold text-sm text-text-primary">Practice Management</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Submit timesheets directly to your firm's practice management system
          </p>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          {[
            { id: 'clio',       name: 'Clio',       desc: 'Sync time entries and matters with Clio Manage',           comingSoon: false },
            { id: 'cosmolex',   name: 'CosmoLex',   desc: 'Push billable hours into CosmoLex billing',                comingSoon: false },
            { id: 'mycase',     name: 'MyCase',     desc: 'Send time entries to MyCase invoicing',                    comingSoon: true  },
            { id: 'filevine',   name: 'Filevine',   desc: 'Connect Filevine matters and sync narratives',             comingSoon: true  },
            { id: 'smokeball',  name: 'Smokeball',  desc: 'Submit timesheets to Smokeball Bill',                      comingSoon: true  },
            { id: 'leap',       name: 'LEAP',       desc: 'Sync time entries with LEAP Legal',                        comingSoon: true  },
          ].map((pms, i, arr) => (
            <div key={pms.id}>
              <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-inset border border-border flex items-center justify-center shrink-0 overflow-hidden">
                    <img src={`/integrations/${pms.id}.png`} alt={`${pms.name} logo`} className="w-6 h-6 object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">{pms.name}</p>
                    <p className="text-xs text-text-muted truncate">{pms.desc}</p>
                  </div>
                </div>
                {pms.comingSoon ? (
                  <span className="px-2 py-1 text-[11px] font-medium text-text-muted bg-inset border border-border-subtle rounded-[var(--radius-sm)] shrink-0">
                    Coming soon
                  </span>
                ) : (
                  <button className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors cursor-pointer shrink-0">
                    Connect
                  </button>
                )}
              </div>
              {i < arr.length - 1 && <div className="border-t border-border-subtle" />}
            </div>
          ))}
        </div>
      </div>

      {/* Account */}
      {isSupabaseConfigured() && user && (() => {
        const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
        const initial = displayName.charAt(0).toUpperCase()
        const memberSince = user.created_at
          ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : null

        return (
          <div className="bg-surface border border-border rounded-[var(--radius-md)] overflow-hidden max-w-lg">
            {/* Header */}
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-inset border border-border flex items-center justify-center shrink-0">
                <span className="font-display font-bold text-sm text-text-muted">{initial}</span>
              </div>
              <div className="min-w-0">
                <h2 className="font-display font-semibold text-sm text-text-primary truncate">{displayName}</h2>
                <p className="text-xs text-text-muted truncate">{user.email}</p>
              </div>
            </div>

            {/* Details */}
            <div className="px-5 py-4 border-t border-border-subtle flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-text-muted">Full name</span>
                <span className="text-sm text-text-primary">{displayName}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-text-muted">Email</span>
                <span className="text-sm text-text-primary">{user.email}</span>
              </div>
              {memberSince && (
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-text-muted">Member since</span>
                  <span className="text-sm text-text-primary">{memberSince}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t border-border-subtle">
              <button
                onClick={signOut}
                className="px-4 py-2 text-sm font-medium rounded-[var(--radius-sm)] border border-border text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
