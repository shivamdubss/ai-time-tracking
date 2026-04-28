import { useEffect, useState } from 'react'

function formatRelative(ts: Date): string {
  const seconds = Math.floor((Date.now() - ts.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

interface LastUpdatedProps {
  timestamp: Date | null
  isProcessing: boolean
}

export function LastUpdated({ timestamp, isProcessing }: LastUpdatedProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  if (isProcessing) {
    return <span className="text-xs text-text-muted">Updating…</span>
  }
  if (!timestamp) return null
  return (
    <span className="text-xs text-text-muted">
      Updated {formatRelative(timestamp)}
    </span>
  )
}
