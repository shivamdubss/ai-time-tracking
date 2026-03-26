import { Shield, Monitor, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface PermissionGuideProps {
  accessibility: boolean
  screenRecording: boolean
  onCheckAgain: () => void
  checking: boolean
}

export function PermissionGuide({
  accessibility,
  screenRecording,
  onCheckAgain,
  checking,
}: PermissionGuideProps) {
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] p-8 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-warning-bg border border-warning/20 flex items-center justify-center">
          <Shield size={20} className="text-warning" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-text-primary">Permissions Required</h2>
          <p className="text-sm text-text-muted">
            TimeTrack needs macOS permissions to track your activity.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <PermissionItem
          label="Accessibility"
          description="Read window titles and detect the active application"
          granted={accessibility}
          settingsPath="Privacy & Security > Accessibility"
        />
        <PermissionItem
          label="Screen Recording"
          description="Capture screenshots of the active window for AI analysis"
          granted={screenRecording}
          settingsPath="Privacy & Security > Screen Recording"
        />
      </div>

      <div className="bg-inset border border-border rounded-[var(--radius-sm)] p-4 mb-6">
        <h3 className="font-display font-semibold text-sm text-text-primary mb-2">How to grant permissions</h3>
        <ol className="text-[13px] text-text-secondary space-y-1.5 list-decimal list-inside">
          <li>Open <strong>System Settings</strong> on your Mac</li>
          <li>Go to <strong>Privacy & Security</strong></li>
          <li>Click <strong>Accessibility</strong> (or <strong>Screen Recording</strong>)</li>
          <li>Click the <strong>+</strong> button</li>
          <li>Add <strong>Terminal</strong> (or whichever app runs TimeTrack)</li>
          <li>Restart TimeTrack after granting permissions</li>
        </ol>
      </div>

      <Button
        variant="secondary"
        onClick={onCheckAgain}
        disabled={checking}
        className="w-full"
      >
        <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
        {checking ? 'Checking...' : 'Check Again'}
      </Button>
    </div>
  )
}

function PermissionItem({
  label,
  description,
  granted,
  settingsPath,
}: {
  label: string
  description: string
  granted: boolean
  settingsPath: string
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-[var(--radius-sm)] border border-border">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        granted ? 'bg-success-bg text-success' : 'bg-error-bg text-error'
      }`}>
        <span className="text-xs font-bold">{granted ? '\u2713' : '\u2717'}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-text-primary">{label}</span>
          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
            granted
              ? 'bg-success-bg text-success'
              : 'bg-error-bg text-error'
          }`}>
            {granted ? 'Granted' : 'Missing'}
          </span>
        </div>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
        {!granted && (
          <p className="text-xs text-text-faint mt-1">
            System Settings &gt; {settingsPath}
          </p>
        )}
      </div>
    </div>
  )
}
