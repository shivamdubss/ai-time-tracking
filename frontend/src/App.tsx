import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { SessionsPage } from '@/pages/SessionsPage'
import { ClientsMattersPage } from '@/pages/ClientsMattersPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { useTheme } from '@/hooks/useTheme'
import { initAuth } from '@/lib/api'

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initAuth().then(() => setReady(true))
  }, [])

  if (!ready) return null

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar theme={theme} onToggleTheme={toggleTheme} />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<SessionsPage />} />
          <Route path="/clients" element={<ClientsMattersPage />} />
          <Route
            path="/rules"
            element={
              <PlaceholderPage
                title="Rules"
                description="Customize how activities are categorized and tracked. Coming in a future update."
              />
            }
          />
        </Routes>
      </main>
    </div>
  )
}
