import { useLocation, useNavigate } from 'react-router-dom'
import { Check, ChevronDown, Menu, Moon, ShieldCheck, Sun, UserCog } from 'lucide-react'
import { navByRoute } from '@/lib/nav'
import { useRole } from '@/lib/role'
import { useTheme } from '@/lib/theme'
import { useSelection } from '@/lib/selection'
import { Badge, Button } from '@/components/ui/primitives'
import { Popover } from '@/components/ui/overlays'
import { cn } from '@/lib/utils'

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { role, roles, setRole } = useRole()
  const { theme, toggle } = useTheme()
  const { selection } = useSelection()
  const current = navByRoute(location.pathname)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-3 backdrop-blur sm:px-4">
      <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onMenuClick} aria-label="Open navigation">
        <Menu className="h-4 w-4" />
      </Button>

      <div className="min-w-0 flex-1">
        <p className="text-2xs font-semibold uppercase tracking-wider text-muted">
          J2W AI Test Factory {current ? `· ${current.group}` : ''}
        </p>
        <h1 className="truncate text-sm font-semibold text-text">
          {current ? `${current.no}. ${current.label}` : 'Test report'}
        </h1>
      </div>

      <div className="hidden items-center gap-1.5 md:flex">
        {current?.requirements.slice(0, 4).map((req) => (
          <Badge
            key={req}
            tone="primary"
            className="cursor-pointer"
            title={`Open requirement coverage for ${req}`}
            onClick={() => navigate(`/coverage?req=${req}`)}
          >
            {req}
          </Badge>
        ))}
      </div>

      <Badge tone="accent" className="hidden sm:inline-flex" title="Environment used for runs">
        {selection.environment}
      </Badge>

      <Popover
        align="right"
        width="w-80"
        trigger={({ toggle: toggleOpen, open }) => (
          <Button variant="secondary" size="sm" onClick={toggleOpen} aria-expanded={open}>
            <UserCog className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{role.name}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        )}
      >
        {(close) => (
          <div>
            <p className="label px-1 pb-1.5">Switch role</p>
            <ul className="space-y-0.5">
              {roles.map((item) => (
                <li key={item.name}>
                  <button
                    type="button"
                    onClick={() => {
                      setRole(item.name)
                      close()
                    }}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface2',
                      item.name === role.name && 'bg-primary-soft',
                    )}
                  >
                    <span className="mt-0.5">
                      {item.name === role.name ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5 text-muted" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-text">{item.name}</span>
                      <span className="block text-xs text-muted">{item.description}</span>
                      <span className="mt-0.5 block text-2xs text-muted">
                        Starts on {navByRoute(item.landingRoute)?.label ?? item.landingRoute}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Popover>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggle}
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        title={theme === 'light' ? 'Dark mode' : 'Light mode'}
      >
        {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </Button>
    </header>
  )
}
