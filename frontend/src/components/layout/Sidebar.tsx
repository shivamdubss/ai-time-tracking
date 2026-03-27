import { NavLink } from 'react-router-dom'
import { Clock, FileSpreadsheet, BarChart3, Briefcase, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase'

const navItems = [
  { to: '/', icon: Clock, label: 'Timeline' },
  { to: '/timesheet', icon: FileSpreadsheet, label: 'Timesheet' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/clients', icon: Briefcase, label: 'Clients & Matters' },
]

export function Sidebar() {
  const { user, signOut } = useAuth()

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email || ''
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <aside className="w-[220px] h-screen bg-sidebar border-r border-border flex flex-col p-4 shrink-0">
      <div className="px-2 mb-8">
        <img src="/donna-logo.png" alt="Donna" className="h-7" />
      </div>

      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-100',
                isActive
                  ? 'bg-surface text-text-primary font-semibold shadow-sm'
                  : 'text-text-muted hover:bg-surface-hover hover:text-text-primary',
              )
            }
          >
            <item.icon size={18} className="opacity-50" strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mb-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-100',
              isActive
                ? 'bg-surface text-text-primary font-semibold shadow-sm'
                : 'text-text-muted hover:bg-surface-hover hover:text-text-primary',
            )
          }
        >
          <Settings size={18} className="opacity-50" strokeWidth={2} />
          Settings
        </NavLink>
      </div>

      {isSupabaseConfigured() && user && (
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2.5 px-3">
            <div className="w-[30px] h-[30px] rounded-full bg-inset border border-border flex items-center justify-center">
              <span className="font-display font-bold text-xs text-text-muted">{initial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-text-primary truncate">{displayName}</div>
              <div className="text-xs text-text-muted truncate">{displayEmail}</div>
            </div>
            <button
              onClick={signOut}
              className="p-1.5 rounded-[var(--radius-sm)] text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
