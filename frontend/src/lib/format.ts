/**
 * Format a duration in minutes for display.
 * < 1 min: "< 1m"
 * < 60 min: "Xm"
 * >= 60 min: "X.X" (decimal hours)
 */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1m'
  if (minutes < 60) return `${Math.round(minutes)}m`
  return (minutes / 60).toFixed(1)
}

/**
 * Format hours from start/end timestamps.
 */
export function formatSessionHours(startTime: string, endTime: string): string {
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime()
  const minutes = ms / (1000 * 60)
  return formatDuration(minutes)
}
