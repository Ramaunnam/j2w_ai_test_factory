import { useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NAV_GROUPS, NAV_ITEMS } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'
import { Button } from '@/components/ui/primitives'
import type { ShellBadge } from '@/lib/live'

export function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
  badges,
}: {
  collapsed: boolean
  onToggle: () => void
  onNavigate?: () => void
  badges: ShellBadge[]
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLAnchorElement>(null)

  const badgeFor = (route: string) => badges.find((badge) => badge.route === route)

  // The sidebar scrolls on its own and always starts at the top. When a page
  // opens it scrolls only as far as it must to keep the active item visible.
  useEffect(() => {
    const container = scrollRef.current
    const active = activeRef.current
    if (!container) return
    if (!active) {
      container.scrollTop = 0
      return
    }
    const itemTop = active.offsetTop
    const itemBottom = itemTop + active.offsetHeight
    const viewTop = container.scrollTop
    const viewBottom = viewTop + container.clientHeight
    if (itemTop < viewTop) container.scrollTop = Math.max(0, itemTop - 8)
    else if (itemBottom > viewBottom) container.scrollTop = itemBottom - container.clientHeight + 8
  }, [location.pathname])

  return (
    <nav
      className={cn(
        'flex h-full flex-col overflow-hidden border-r border-line bg-surface transition-[width] duration-200',
        collapsed ? 'w-[4.25rem]' : 'w-64',
      )}
      aria-label="Main navigation"
    >
      <div className={cn('flex items-center gap-2 border-b border-line px-3 py-3', collapsed && 'justify-center')}>
        <NavLink
          to="/"
          onClick={onNavigate}
          title="Open the Command Centre"
          className="min-w-0 rounded-lg transition-opacity hover:opacity-80"
        >
          {collapsed ? <Logo compact /> : <Logo />}
        </NavLink>
      </div>

      <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group} className="mb-4 last:mb-0">
            {!collapsed ? <p className="label px-2 pb-1.5">{group}</p> : <div className="mx-2 mb-2 h-px bg-line" />}
            <ul className="space-y-0.5">
              {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                const Icon = item.icon
                const badge = badgeFor(item.route)
                const isActive =
                  item.route === '/' ? location.pathname === '/' : location.pathname.startsWith(item.route)
                return (
                  <li key={item.route}>
                    <NavLink
                      to={item.route}
                      end={item.route === '/'}
                      ref={isActive ? activeRef : undefined}
                      onClick={onNavigate}
                      title={collapsed ? `${item.no}. ${item.label}` : item.blurb}
                      className={({ isActive: active }) =>
                        cn(
                          'group flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                          collapsed && 'justify-center px-0',
                          active ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface2 hover:text-text',
                        )
                      }
                    >
                      <span className="relative">
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {collapsed && badge ? (
                          <span
                            title={badge.title}
                            className="absolute -right-1.5 -top-1.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-accent px-0.5 text-[0.5rem] font-bold text-white"
                          >
                            {badge.count}
                          </span>
                        ) : null}
                      </span>
                      {!collapsed ? (
                        <>
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {badge ? (
                            <span
                              role="button"
                              tabIndex={0}
                              title={badge.title}
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                onNavigate?.()
                                navigate(badge.to)
                              }}
                              onKeyDown={(event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') return
                                event.preventDefault()
                                event.stopPropagation()
                                onNavigate?.()
                                navigate(badge.to)
                              }}
                              className="grid h-4 min-w-4 cursor-pointer place-items-center rounded-full bg-accent px-1 text-2xs font-bold text-white hover:bg-accent/80"
                            >
                              {badge.count}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className={cn('border-t border-line p-2', collapsed && 'flex justify-center')}>
        <Button
          variant="ghost"
          size={collapsed ? 'icon-sm' : 'sm'}
          onClick={onToggle}
          className={cn(!collapsed && 'w-full justify-start')}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed ? 'Collapse' : null}
        </Button>
      </div>
    </nav>
  )
}
