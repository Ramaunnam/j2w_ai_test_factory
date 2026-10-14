import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Environment, LoadProfile, ProcessId, ScenarioType, SiteCode } from './types'
import { daysAgo, NOW_ISO } from './clock'
import { isoDate } from './format'

/**
 * Selections made on one page carry over to the next: pick a process in Process
 * Discovery or Test Studio and the Run Centre opens with it pre-selected.
 */
export interface SelectionState {
  processId: ProcessId | 'ALL'
  systemIds: string[]
  interfaceIds: string[]
  scenarioIds: string[]
  scenarioTypes: ScenarioType[]
  dataSourceIds: string[]
  testDataSetId: string | null
  site: SiteCode | 'ALL'
  dateFrom: string
  dateTo: string
  environment: Environment
  vehicle: string | null
  requirementId: string | null
  reconSetId: string | null
  loadProfile: LoadProfile
}

const DEFAULT_STATE: SelectionState = {
  processId: 'P1',
  systemIds: [],
  interfaceIds: [],
  scenarioIds: [],
  scenarioTypes: ['Positive', 'Negative', 'Regression'],
  dataSourceIds: [],
  testDataSetId: null,
  site: 'ALL',
  dateFrom: isoDate(daysAgo(30)),
  dateTo: isoDate(NOW_ISO),
  environment: 'TEST',
  vehicle: null,
  requirementId: null,
  reconSetId: null,
  loadProfile: '5x',
}

interface SelectionContextValue {
  selection: SelectionState
  patch: (partial: Partial<SelectionState>) => void
  reset: () => void
  toggleIn: (key: 'systemIds' | 'interfaceIds' | 'scenarioIds' | 'dataSourceIds', id: string) => void
  toggleType: (type: ScenarioType) => void
}

const SelectionContext = createContext<SelectionContextValue | null>(null)

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<SelectionState>(DEFAULT_STATE)

  const patch = useCallback((partial: Partial<SelectionState>) => {
    setSelection((prev) => ({ ...prev, ...partial }))
  }, [])

  const reset = useCallback(() => setSelection(DEFAULT_STATE), [])

  const toggleIn = useCallback(
    (key: 'systemIds' | 'interfaceIds' | 'scenarioIds' | 'dataSourceIds', id: string) => {
      setSelection((prev) => {
        const current = prev[key]
        return {
          ...prev,
          [key]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
        }
      })
    },
    [],
  )

  const toggleType = useCallback((type: ScenarioType) => {
    setSelection((prev) => ({
      ...prev,
      scenarioTypes: prev.scenarioTypes.includes(type)
        ? prev.scenarioTypes.filter((t) => t !== type)
        : [...prev.scenarioTypes, type],
    }))
  }, [])

  const value = useMemo<SelectionContextValue>(
    () => ({ selection, patch, reset, toggleIn, toggleType }),
    [selection, patch, reset, toggleIn, toggleType],
  )

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error('useSelection must be used inside SelectionProvider')
  return ctx
}
