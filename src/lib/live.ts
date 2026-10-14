/**
 * Live counters used by the shell (sidebar badges).
 * Each badge says exactly what it counts and where clicking it leads.
 */
import { db, useDbRevision } from './db'

export interface ShellBadge {
  route: string
  count: number
  /** the tooltip: what exactly is counted */
  title: string
  /** where the badge click goes, with the filter applied */
  to: string
}

export interface ShellCounters {
  pendingApprovals: number
  openFindings: number
  badges: ShellBadge[]
}

export function useShellCounters(): ShellCounters {
  useDbRevision()

  const openFindings = db.findings.filter(
    (finding) => finding.status === 'Open' || finding.status === 'Triaged',
  ).length
  const pendingApprovals = db.approvals.filter((approval) => approval.status === 'Pending').length

  const badges: ShellBadge[] = []
  if (openFindings > 0) {
    badges.push({
      route: '/run',
      count: openFindings,
      title: `${openFindings} open findings raised by test runs (status Open or Triaged). Click to see the list.`,
      to: '/run?findings=open',
    })
  }
  if (pendingApprovals > 0) {
    badges.push({
      route: '/approvals',
      count: pendingApprovals,
      title: `${pendingApprovals} items waiting for key-user approval: generated scenarios, healed scripts and evidence bundles. Click to see the queue.`,
      to: '/approvals?status=pending',
    })
  }

  return { pendingApprovals, openFindings, badges }
}
