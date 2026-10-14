import { useCallback, useEffect, useRef, useState } from 'react'
import { useDbRevision } from './db'
import { getJob } from './jobs'
import type { JobSnapshot } from './types'

/**
 * Calls the mock API and re-fetches whenever the store changes, so an approval
 * on one page updates the numbers on every other page.
 */
export function useApi<T>(
  factory: () => Promise<T>,
  deps: unknown[] = [],
): { data: T | undefined; loading: boolean; error?: string; reload: () => void } {
  const revision = useDbRevision()
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)
  const [manual, setManual] = useState(0)
  const factoryRef = useRef(factory)
  factoryRef.current = factory

  useEffect(() => {
    let active = true
    setLoading(true)
    factoryRef.current()
      .then((result) => {
        if (!active) return
        setData(result)
        setError(undefined)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unexpected error')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, manual, ...deps])

  const reload = useCallback(() => setManual((value) => value + 1), [])

  return { data, loading, error, reload }
}

/** Polls a running job (live log, progress, live run results). */
export function useJob<T = unknown>(jobId: string | null, intervalMs = 400): JobSnapshot<T> | undefined {
  const [snapshot, setSnapshot] = useState<JobSnapshot<T> | undefined>(undefined)

  useEffect(() => {
    if (!jobId) {
      setSnapshot(undefined)
      return
    }
    const read = () => setSnapshot(getJob<T>(jobId))
    read()
    const timer = window.setInterval(read, intervalMs)
    return () => window.clearInterval(timer)
  }, [jobId, intervalMs])

  return snapshot
}
