import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Footer } from './Footer'
import { useShellCounters } from '@/lib/live'

export function AppShell() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1180)
  const [mobileOpen, setMobileOpen] = useState(false)
  const counters = useShellCounters()
  const mainRef = useRef<HTMLElement>(null)

  // Every navigation starts at the top of the page, so the title is always the
  // first thing on screen. location.key changes on every navigation, including
  // one that only changes the query string.
  useLayoutEffect(() => {
    const main = mainRef.current
    if (main) main.scrollTop = 0
    try {
      window.scrollTo(0, 0)
    } catch {
      /* not available in every environment */
    }
  }, [location.key, location.pathname, location.search])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-full w-full overflow-hidden bg-bg">
      <div className="hidden h-full shrink-0 lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} badges={counters.badges} />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="relative h-full">
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
              badges={counters.badges}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main
          ref={mainRef}
          id="page-scroll"
          className="scroll-thin flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
        >
          <div className="mx-auto w-full min-w-0 max-w-[1680px] flex-1 px-3 py-4 sm:px-5 sm:py-5">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  )
}
