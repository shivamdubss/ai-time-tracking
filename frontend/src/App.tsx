import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sidebar } from '@/components/layout/Sidebar'
import { TimelinePage } from '@/pages/TimelinePage'
import { TimesheetPage } from '@/pages/TimesheetPage'
import { ClientsMattersPage } from '@/pages/ClientsMattersPage'
import { initAuth } from '@/lib/api'
import { TrackingProvider } from '@/hooks/useTrackingContext'
import { Agentation } from 'agentation'

export default function App() {
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    initAuth().then(() => setReady(true))
  }, [])

  if (!ready) return null

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 w-10 h-10 rounded-[var(--radius-sm)] bg-surface border border-border flex items-center justify-center text-text-primary md:hidden cursor-pointer"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden off-screen on mobile, static on md+ */}
      <div className={cn(
        'hidden md:block md:shrink-0',
        sidebarOpen && '!block',
      )}>
        <div className={cn(
          'fixed inset-y-0 left-0 z-40 md:relative',
        )}>
          <Sidebar />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <TrackingProvider>
          <Routes>
            <Route path="/" element={<TimelinePage />} />
            <Route path="/timesheet" element={<TimesheetPage />} />
            <Route path="/clients" element={<ClientsMattersPage />} />
          </Routes>
        </TrackingProvider>
      </main>
      {import.meta.env.DEV && <Agentation />}
    </div>
  )
}
