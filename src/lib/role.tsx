import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { RoleName } from './types'

export interface RoleDefinition {
  name: RoleName
  landingRoute: string
  description: string
  canApprove: boolean
  canRun: boolean
  canAdmin: boolean
}

export const ROLES: RoleDefinition[] = [
  {
    name: 'Key User',
    landingRoute: '/approvals',
    description: 'Business owner of a process. Approves scenarios, healed scripts and evidence.',
    canApprove: true,
    canRun: true,
    canAdmin: false,
  },
  {
    name: 'QA Lead',
    landingRoute: '/run',
    description: 'Builds and runs the test suite, triages findings, decides the release verdict.',
    canApprove: true,
    canRun: true,
    canAdmin: false,
  },
  {
    name: 'IT Admin',
    landingRoute: '/landscape',
    description: 'Owns systems, interfaces and data sources, and the change feed.',
    canApprove: false,
    canRun: true,
    canAdmin: true,
  },
  {
    name: 'Auditor',
    landingRoute: '/evidence',
    description: 'Reads locked evidence and reports. No changes, no runs.',
    canApprove: false,
    canRun: false,
    canAdmin: false,
  },
]

interface RoleContextValue {
  role: RoleDefinition
  roles: RoleDefinition[]
  setRole: (name: RoleName) => void
}

const RoleContext = createContext<RoleContextValue | null>(null)

export function RoleProvider({
  children,
  onRoleChange,
}: {
  children: ReactNode
  onRoleChange?: (role: RoleDefinition) => void
}) {
  const [roleName, setRoleName] = useState<RoleName>('QA Lead')

  const setRole = useCallback(
    (name: RoleName) => {
      setRoleName(name)
      const next = ROLES.find((r) => r.name === name)
      if (next) onRoleChange?.(next)
    },
    [onRoleChange],
  )

  const value = useMemo<RoleContextValue>(() => {
    const role = ROLES.find((r) => r.name === roleName) ?? ROLES[1]
    return { role, roles: ROLES, setRole }
  }, [roleName, setRole])

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used inside RoleProvider')
  return ctx
}
