export function InlineProcessingRow() {
  return (
    <div className="grid grid-cols-[1fr_80px_1.2fr] gap-4 px-5 py-4 border-b border-border-subtle">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin shrink-0" />
        <div>
          <div className="font-display font-semibold text-sm text-text-primary">
            Generating summary...
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            Claude is analyzing your activity
          </div>
        </div>
      </div>
      <div className="font-mono text-[13px] text-text-faint tabular-nums">
        --
      </div>
      <div className="text-[13px] text-text-muted italic">
        Processing screenshots and window activity...
      </div>
    </div>
  )
}
