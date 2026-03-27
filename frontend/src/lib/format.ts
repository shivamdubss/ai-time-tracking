/**
 * Format a duration in minutes as decimal hours (0.1 increments).
 * Lawyers measure time in tenths of an hour (6-minute increments).
 * Minimum billable unit is 0.1 for any non-zero time.
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0.0'
  const hours = minutes / 60
  const rounded = Math.round(hours * 10) / 10
  return Math.max(rounded, 0.1).toFixed(1)
}

/**
 * Format hours from start/end timestamps as decimal hours.
 */
export function formatSessionHours(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '0.0'
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  if (isNaN(start) || isNaN(end)) return '0.0'
  const minutes = (end - start) / (1000 * 60)
  return formatDuration(minutes)
}

/**
 * Format a time range for display (e.g. "8:12 AM – 9:45 AM").
 */
export function formatTimeRange(start: string, end: string): string {
  const fmt = (d: Date) => {
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return `${fmt(new Date(start))} – ${fmt(new Date(end))}`
}

/**
 * Round minutes to decimal hours for billing calculations.
 * Each entry is rounded to nearest 0.1, minimum 0.1 for any non-zero time.
 */
export function roundToDecimalHours(minutes: number): number {
  if (minutes <= 0) return 0
  const hours = minutes / 60
  return Math.max(Math.round(hours * 10) / 10, 0.1)
}
