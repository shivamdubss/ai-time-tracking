import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { isDesktopMode } from '@/lib/platform'

interface WorkHoursSettings {
  enabled: boolean
  startTime: string // 24h format "HH:MM"
  endTime: string
}

export interface AppSettings {
  workHours: WorkHoursSettings
  defaultHourlyRate: number | null
}

interface SettingsContextValue {
  settings: AppSettings
  updateSettings: (update: Partial<AppSettings>) => void
  isWithinWorkHours: () => boolean
}

const STORAGE_KEY = 'timetrack-settings'

const DEFAULT_SETTINGS: AppSettings = {
  workHours: {
    enabled: false,
    startTime: '09:00',
    endTime: '17:00',
  },
  defaultHourlyRate: null,
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_SETTINGS, ...parsed, workHours: { ...DEFAULT_SETTINGS.workHours, ...parsed?.workHours } }
    }
  } catch {}
  return DEFAULT_SETTINGS
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  // Sync defaultHourlyRate to desktop backend when it changes
  useEffect(() => {
    if (!isDesktopMode) return
    fetch('/api/settings/default-hourly-rate', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate: settings.defaultHourlyRate }),
    }).catch(() => {})
  }, [settings.defaultHourlyRate])

  const updateSettings = useCallback((update: Partial<AppSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...update,
      workHours: update.workHours
        ? { ...prev.workHours, ...update.workHours }
        : prev.workHours,
    }))
  }, [])

  const isWithinWorkHours = useCallback(() => {
    if (!settings.workHours.enabled) return true

    const now = new Date()
    const [startH, startM] = settings.workHours.startTime.split(':').map(Number)
    const [endH, endM] = settings.workHours.endTime.split(':').map(Number)

    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    // Handle overnight shifts (e.g., 22:00 to 06:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }, [settings.workHours])

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isWithinWorkHours }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
