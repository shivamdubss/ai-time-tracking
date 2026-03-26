export function ProcessingState() {
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] py-16 flex flex-col items-center justify-center text-center">
      <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin mb-4" />
      <h3 className="font-display font-semibold text-sm text-text-primary mb-1">
        Generating summary...
      </h3>
      <p className="text-[13px] text-text-muted max-w-[320px]">
        Claude is analyzing your activity and screenshots. This usually takes a few seconds.
      </p>
    </div>
  )
}
