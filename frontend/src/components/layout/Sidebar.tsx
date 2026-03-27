import { NavLink } from 'react-router-dom'
import { Clock, Briefcase, Pencil, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

const navItems = [
  { to: '/', icon: Clock, label: 'Sessions' },
  { to: '/clients', icon: Briefcase, label: 'Clients & Matters' },
  { to: '/rules', icon: Pencil, label: 'Rules' },
]

export function Sidebar({ theme, onToggleTheme }: SidebarProps) {
  return (
    <aside className="w-[220px] h-screen bg-sidebar border-r border-border flex flex-col p-4 shrink-0">
      <div className="px-2 mb-8">
        <img src="/donna-logo.png" alt="Donna" className="h-7 dark:invert" />
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

      <div className="border-t border-border pt-4 flex flex-col gap-3">
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-sm)] text-sm text-text-muted hover:bg-surface-hover hover:text-text-primary transition-all duration-100 cursor-pointer"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          {theme === 'light' ? 'Dark mode' : 'Light mode'}
        </button>
        <div className="flex items-center gap-2.5 px-3">
          <div className="w-[30px] h-[30px] rounded-full bg-inset border border-border flex items-center justify-center">
            <span className="font-display font-bold text-xs text-text-muted">S</span>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-text-primary">Shivam</div>
            <div className="text-[11px] text-text-muted">shivam@mesh.so</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
