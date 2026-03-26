import { Routes, Route } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { SessionsPage } from '@/pages/SessionsPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { useTheme } from '@/hooks/useTheme'

export default function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar theme={theme} onToggleTheme={toggleTheme} />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<SessionsPage />} />
          <Route
            path="/analytics"
            element={
              <PlaceholderPage
                title="Analytics"
                description="Aggregate stats across sessions, days, and weeks. Coming in a future update."
              />
            }
          />
          <Route
            path="/rules"
            element={
              <PlaceholderPage
                title="Rules"
                description="Customize how activities are categorized and tracked. Coming in a future update."
              />
            }
          />
          <Route
            path="/settings"
            element={
              <PlaceholderPage
                title="Settings"
                description="Configure API keys, screenshot intervals, and privacy preferences. Coming in a future update."
              />
            }
          />
        </Routes>
      </main>
    </div>
  )
}
