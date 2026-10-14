import { isRunAvailableElsewhere, persistRuntime } from './db'

type Navigate = (to: string) => void

/**
 * Opens one of the four reporting outputs.
 *
 * A run created in this session is written to localStorage first, so the new
 * tab can read it. If storage is blocked, or the browser refuses the new tab,
 * the report opens in the same tab instead of failing.
 */
function open(path: string, runId: string | null, navigate: Navigate): 'new-tab' | 'same-tab' {
  persistRuntime()
  if (!runId || isRunAvailableElsewhere(runId)) {
    try {
      const opened = window.open(path, '_blank')
      if (opened) return 'new-tab'
    } catch {
      /* popup blocked - fall through to the same tab */
    }
  }
  navigate(path)
  return 'same-tab'
}

/** Output 2: the one-screen run summary. */
export function openRunSummary(runId: string, navigate: Navigate) {
  return open(`/report/${runId}`, runId, navigate)
}

/** Output 4: the long audit evidence pack. */
export function openEvidencePack(runId: string, navigate: Navigate) {
  return open(`/evidence-pack/${runId}`, runId, navigate)
}

/** Output 1: the finding card. */
export function openFindingCard(findingId: string, navigate: Navigate) {
  return open(`/finding/${findingId}`, null, navigate)
}

/** Output 3: the release report. */
export function openReleaseReport(releaseId: string, navigate: Navigate) {
  return open(`/release-report/${releaseId}`, null, navigate)
}
