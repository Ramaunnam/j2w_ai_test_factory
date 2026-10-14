import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Ban, CheckCircle2, Play, ShieldAlert, ShieldCheck, Users } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, KeyValue } from '@/components/ui/primitives'
import { Drawer } from '@/components/ui/overlays'
import { Tabs } from '@/components/ui/tabs'
import { DataTable } from '@/components/ui/table'
import { LiveLog } from '@/components/common/LiveLog'
import { SeverityBadge } from '@/components/common/badges'
import { SelectionSummary, SitePicker, SystemPicker } from '@/components/common/selectors'
import { FindingRef, PageRef, SystemRef, UserRef } from '@/components/common/links'
import { useToast } from '@/components/ui/toast'
import { useApi, useJob } from '@/lib/useApi'
import { useSelection } from '@/lib/selection'
import * as api from '@/lib/api'
import { db, find } from '@/lib/db'
import { dateMedium, dateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SodConflict, SodRule, SystemRole, UserAccount } from '@/lib/types'

export default function AccessSodPage() {
  const [params, setParams] = useSearchParams()
  const { toast } = useToast()
  const { selection, patch } = useSelection()

  const [tab, setTab] = useState<'matrix' | 'conflicts' | 'users' | 'roles'>('matrix')
  const [openUserId, setOpenUserId] = useState<string | null>(params.get('user'))
  const [openConflictId, setOpenConflictId] = useState<string | null>(null)
  const [openRule, setOpenRule] = useState<SodRule | null>(null)
  const [openRole, setOpenRole] = useState<SystemRole | null>(null)
  const [proofJobId, setProofJobId] = useState<string | null>(null)

  const proofJob = useJob(proofJobId)
  const { data } = useApi(() => api.getSodMatrix(), [])

  useEffect(() => {
    if (params.get('user')) {
      setOpenUserId(params.get('user'))
      setTab('users')
    }
  }, [params])

  useEffect(() => {
    if (proofJob?.status === 'done') {
      toast({
        title: 'Proof test finished',
        description: 'The outcome and the evidence are on the conflict.',
        tone: 'warning',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proofJob?.status])

  const users = (data?.users ?? []).filter(
    (user) =>
      (selection.site === 'ALL' || user.site === selection.site) &&
      (selection.systemIds.length === 0 || selection.systemIds.some((id) => user.systemIds.includes(id))),
  )
  const conflicts = (data?.conflicts ?? []).filter((conflict) => users.some((user) => user.id === conflict.userId))
  const openUser = openUserId ? find.user(openUserId) : undefined
  const openConflict = openConflictId ? db.sodConflicts.find((conflict) => conflict.id === openConflictId) : undefined

  const matrix = useMemo(() => {
    const rules = data?.rules ?? []
    return rules.map((rule) => ({
      rule,
      conflicted: (data?.conflicts ?? []).filter((conflict) => conflict.ruleId === rule.id),
    }))
  }, [data])

  const provenAllowed = (data?.conflicts ?? []).filter((conflict) => conflict.proof?.outcome === 'Allowed').length
  const provenBlocked = (data?.conflicts ?? []).filter((conflict) => conflict.proof?.outcome === 'Blocked').length
  const untested = (data?.conflicts ?? []).filter((conflict) => !conflict.proof).length

  function runProof(conflict: SodConflict) {
    setProofJobId(api.runSodProof(conflict.id))
    toast({
      title: 'Proof test started',
      description: `Trying the forbidden combination as ${find.user(conflict.userId)?.label}.`,
      tone: 'info',
    })
  }

  return (
    <>
      <PageHeader
        title="Access & SoD"
        description="Role data from all four systems in one conflict matrix, the users who are in conflict, and a proof test that actually tries the forbidden action and records whether it was blocked or allowed."
        requirements={['R7']}
      >
        <div className="flex flex-wrap items-center gap-2">
          <SystemPicker selected={selection.systemIds} onChange={(values) => patch({ systemIds: values })} />
          <SitePicker value={selection.site} onChange={(value) => patch({ site: value })} />
          <SelectionSummary className="ml-auto" />
        </div>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ['Conflicts found', data?.conflicts.length ?? 0, 'text-text', 'every forbidden combination found'],
            ['Proven allowed', provenAllowed, 'text-danger', 'the control does not hold'],
            ['Proven blocked', provenBlocked, 'text-success', 'control is effective'],
            ['Not proven yet', untested, 'text-accent', 'run the proof test'],
          ] as const
        ).map(([label, value, tone, hint]) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab('conflicts')}
            className="card px-3 py-2 text-left transition-colors hover:bg-surface2/60"
            title="Open the list of users in conflict"
          >
            <p className="label">{label}</p>
            <p className={cn('text-xl font-semibold tabular-nums', tone)}>{value}</p>
            <p className="text-2xs text-muted">{hint}</p>
          </button>
        ))}
      </div>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'matrix', label: 'Conflict matrix', count: data?.rules.length ?? 0 },
          { value: 'conflicts', label: 'Users in conflict', count: conflicts.length },
          { value: 'users', label: 'Users and roles', count: users.length },
          { value: 'roles', label: 'Roles by system', count: data?.roles.length ?? 0 },
        ]}
      />

      {tab === 'matrix' ? (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader
              title="Conflict matrix"
              description="Each rule is a forbidden combination of two permissions. Click a rule for the detail, or a user to see their roles."
            />
            <CardBody className="space-y-2">
              {matrix.map(({ rule, conflicted }) => (
                <div
                  key={rule.id}
                  className={cn(
                    'rounded-lg border p-3',
                    conflicted.some((conflict) => conflict.proof?.outcome === 'Allowed')
                      ? 'border-danger/40 bg-danger-soft/25'
                      : conflicted.length > 0
                        ? 'border-accent/40 bg-accent-soft/25'
                        : 'border-line',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <button type="button" className="min-w-0 text-left" onClick={() => setOpenRule(rule)}>
                      <p className="text-sm font-medium text-text">{rule.name}</p>
                      <p className="mt-0.5 text-xs text-muted">{rule.plain}</p>
                      <p className="mono mt-1 text-2xs text-muted">
                        {rule.leftPermission} + {rule.rightPermission}
                      </p>
                    </button>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <SeverityBadge severity={rule.severity} />
                      <Badge tone={conflicted.length > 0 ? 'danger' : 'success'}>
                        {conflicted.length} user{conflicted.length === 1 ? '' : 's'}
                      </Badge>
                    </div>
                  </div>
                  {conflicted.length > 0 ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {conflicted.map((conflict) => (
                        <button
                          key={conflict.id}
                          type="button"
                          onClick={() => setOpenConflictId(conflict.id)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-2xs font-medium transition-colors hover:bg-surface2',
                            conflict.proof?.outcome === 'Allowed'
                              ? 'border-danger/40 text-danger'
                              : conflict.proof?.outcome === 'Blocked'
                                ? 'border-success/40 text-success'
                                : 'border-line text-muted',
                          )}
                        >
                          {conflict.proof?.outcome === 'Allowed' ? (
                            <ShieldAlert className="h-3 w-3" />
                          ) : conflict.proof?.outcome === 'Blocked' ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <Users className="h-3 w-3" />
                          )}
                          {find.user(conflict.userId)?.label ?? conflict.userId}
                          {conflict.proof ? ` · ${conflict.proof.outcome}` : ' · not proven'}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-2xs text-success">No user holds both permissions.</p>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Proof test log"
              description="The test signs in as the user and tries the forbidden combination for real."
            />
            <CardBody>
              <LiveLog
                lines={proofJob?.log ?? []}
                status={proofJob?.status}
                progressPct={proofJob?.progressPct}
                currentLabel={proofJob?.currentLabel}
                height="h-72"
                emptyHint="Open a conflict and press Prove it."
              />
            </CardBody>
          </Card>
        </div>
      ) : null}

      {tab === 'conflicts' ? (
        <Card>
          <CardHeader
            title="Users in conflict"
            description="Click a row to see the detail and run the proof test."
          />
          <DataTable
            rows={conflicts}
            getRowId={(row) => row.id}
            searchText={(row) =>
              `${find.user(row.userId)?.label ?? ''} ${find.sodRule(row.ruleId)?.name ?? ''} ${row.detail}`
            }
            searchPlaceholder="Search conflicts"
            onRowClick={(row) => setOpenConflictId(row.id)}
            activeRowId={openConflictId}
            rowTone={(row) => (row.proof?.outcome === 'Allowed' ? 'danger' : undefined)}
            filters={[
              {
                key: 'outcome',
                label: 'Proof',
                options: [
                  { value: 'Allowed', label: 'Proven allowed' },
                  { value: 'Blocked', label: 'Proven blocked' },
                  { value: 'none', label: 'Not proven' },
                ],
                match: (row, value) => (value === 'none' ? !row.proof : row.proof?.outcome === value),
              },
              {
                key: 'severity',
                label: 'Severity',
                options: ['Critical', 'High', 'Medium', 'Low'].map((value) => ({ value, label: value })),
                match: (row, value) => row.severity === value,
              },
            ]}
            columns={[
              {
                key: 'user',
                header: 'User',
                sortValue: (row) => find.user(row.userId)?.label ?? '',
                render: (row) => (
                  <span className="block">
                    <UserRef id={row.userId} />
                    <span className="mt-0.5 block text-2xs text-muted">{find.user(row.userId)?.businessRole}</span>
                  </span>
                ),
              },
              {
                key: 'rule',
                header: 'Rule',
                sortValue: (row) => row.ruleId,
                render: (row) => (
                  <span className="block">
                    <span className="text-xs font-medium text-text">{find.sodRule(row.ruleId)?.name}</span>
                    <span className="mt-0.5 block text-2xs text-muted">{row.detail}</span>
                  </span>
                ),
              },
              {
                key: 'systems',
                header: 'Systems',
                render: (row) => (
                  <span className="flex flex-wrap gap-1">
                    {row.systemIds.map((id) => (
                      <SystemRef key={id} id={id} compact />
                    ))}
                  </span>
                ),
                hideBelow: 'md',
              },
              {
                key: 'severity',
                header: 'Severity',
                sortValue: (row) => row.severity,
                render: (row) => <SeverityBadge severity={row.severity} />,
              },
              {
                key: 'proof',
                header: 'Proof',
                render: (row) =>
                  row.proof ? (
                    <Badge tone={row.proof.outcome === 'Allowed' ? 'danger' : 'success'}>
                      {row.proof.outcome === 'Allowed' ? (
                        <ShieldAlert className="h-3 w-3" />
                      ) : (
                        <ShieldCheck className="h-3 w-3" />
                      )}
                      {row.proof.outcome}
                    </Badge>
                  ) : (
                    <Badge tone="accent">not proven</Badge>
                  ),
              },
              {
                key: 'finding',
                header: 'Finding',
                render: (row) => (row.findingId ? <FindingRef id={row.findingId} label={row.findingId} /> : <span className="text-2xs text-muted">-</span>),
                hideBelow: 'sm',
              },
            ]}
          />
        </Card>
      ) : null}

      {tab === 'users' ? (
        <Card>
          <CardHeader title="Users and their roles" description="Role data pulled from all four systems. Click a user." />
          <DataTable
            rows={users}
            getRowId={(row) => row.id}
            searchText={(row) => `${row.label} ${row.businessRole} ${row.site}`}
            searchPlaceholder="Search users"
            onRowClick={(row) => {
              setOpenUserId(row.id)
              setParams({ user: row.id })
            }}
            activeRowId={openUserId}
            columns={[
              {
                key: 'label',
                header: 'User',
                sortValue: (row) => row.label,
                render: (row: UserAccount) => (
                  <span className="block">
                    <span className="text-sm font-medium text-text">{row.label}</span>
                    <span className="mt-0.5 block text-2xs text-muted">{row.businessRole}</span>
                  </span>
                ),
              },
              { key: 'site', header: 'Site', sortValue: (row) => row.site, render: (row) => <Badge>{row.site}</Badge> },
              {
                key: 'roles',
                header: 'Roles',
                render: (row) => (
                  <span className="flex flex-wrap gap-1">
                    {row.roleIds.map((id) => (
                      <Badge key={id} tone="neutral" className="font-mono">
                        {find.role(id)?.name ?? id}
                      </Badge>
                    ))}
                  </span>
                ),
              },
              {
                key: 'conflicts',
                header: 'Conflicts',
                align: 'right',
                sortValue: (row) => db.sodConflicts.filter((conflict) => conflict.userId === row.id).length,
                render: (row) => {
                  const count = db.sodConflicts.filter((conflict) => conflict.userId === row.id).length
                  return count > 0 ? <Badge tone="danger">{count}</Badge> : <Badge tone="success">none</Badge>
                },
              },
              {
                key: 'reviewed',
                header: 'Last reviewed',
                align: 'right',
                sortValue: (row) => row.lastReviewedAt,
                render: (row) => <span className="text-2xs text-muted">{dateMedium(row.lastReviewedAt)}</span>,
                hideBelow: 'md',
              },
            ]}
          />
        </Card>
      ) : null}

      {tab === 'roles' ? (
        <Card>
          <CardHeader title="Roles by system" description="The permissions behind each role, as the conflict rules read them." />
          <DataTable
            rows={data?.roles ?? []}
            getRowId={(row) => row.id}
            onRowClick={(row) => setOpenRole(row)}
            activeRowId={openRole?.id ?? null}
            searchText={(row) => `${row.name} ${row.description} ${row.permissions.join(' ')}`}
            searchPlaceholder="Search roles"
            filters={[
              {
                key: 'system',
                label: 'System',
                options: Array.from(new Set((data?.roles ?? []).map((row) => row.systemId))).map((value) => ({
                  value,
                  label: find.system(value)?.name ?? value,
                })),
                match: (row, value) => row.systemId === value,
              },
            ]}
            columns={[
              {
                key: 'name',
                header: 'Role',
                sortValue: (row) => row.name,
                render: (row: SystemRole) => (
                  <span className="block">
                    <span className="mono text-xs font-medium text-text">{row.name}</span>
                    <span className="mt-0.5 block text-2xs text-muted">{row.description}</span>
                  </span>
                ),
              },
              { key: 'system', header: 'System', render: (row) => <SystemRef id={row.systemId} compact /> },
              {
                key: 'permissions',
                header: 'Permissions',
                render: (row) => (
                  <span className="flex flex-wrap gap-1">
                    {row.permissions.map((permission) => (
                      <Badge key={permission} tone="neutral" className="font-mono">
                        {permission}
                      </Badge>
                    ))}
                  </span>
                ),
              },
              {
                key: 'users',
                header: 'Users',
                align: 'right',
                render: (row) => (
                  <span className="mono">{db.users.filter((user) => user.roleIds.includes(row.id)).length}</span>
                ),
              },
            ]}
          />
        </Card>
      ) : null}

      {/* --------------------------------------------------------- user drawer */}
      <Drawer
        open={Boolean(openUser)}
        onClose={() => {
          setOpenUserId(null)
          setParams({})
        }}
        title={openUser?.label ?? ''}
        subtitle={openUser ? `${openUser.businessRole} · site ${openUser.site}` : ''}
      >
        {openUser ? (
          <div className="space-y-4">
            <KeyValue
              columns={2}
              rows={[
                { label: 'Site', value: openUser.site },
                { label: 'Last access review', value: dateMedium(openUser.lastReviewedAt) },
                {
                  label: 'Systems',
                  value: (
                    <span className="flex flex-wrap gap-1">
                      {openUser.systemIds.map((id) => (
                        <SystemRef key={id} id={id} compact />
                      ))}
                    </span>
                  ),
                },
                {
                  label: 'Conflicts',
                  value: db.sodConflicts.filter((conflict) => conflict.userId === openUser.id).length,
                },
              ]}
            />
            <div>
              <p className="label mb-1.5">Roles</p>
              <div className="space-y-1">
                {openUser.roleIds.map((id) => {
                  const role = find.role(id)
                  return (
                    <div key={id} className="rounded-md border border-line px-2.5 py-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="mono text-xs font-medium text-text">{role?.name}</span>
                        {role ? <SystemRef id={role.systemId} compact /> : null}
                      </div>
                      <p className="mt-0.5 text-2xs text-muted">{role?.description}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(role?.permissions ?? []).map((permission) => (
                          <Badge key={permission} tone="neutral" className="font-mono">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <p className="label mb-1.5">Conflicts for this user</p>
              {db.sodConflicts.filter((conflict) => conflict.userId === openUser.id).length === 0 ? (
                <p className="text-xs text-success">No segregation of duties conflict for this user.</p>
              ) : (
                <div className="space-y-1.5">
                  {db.sodConflicts
                    .filter((conflict) => conflict.userId === openUser.id)
                    .map((conflict) => (
                      <button
                        key={conflict.id}
                        type="button"
                        onClick={() => {
                          setOpenUserId(null)
                          setOpenConflictId(conflict.id)
                        }}
                        className="w-full rounded-md border border-line px-2.5 py-1.5 text-left hover:bg-surface2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-text">{find.sodRule(conflict.ruleId)?.name}</span>
                          <SeverityBadge severity={conflict.severity} />
                        </div>
                        <p className="mt-0.5 text-2xs text-muted">{conflict.detail}</p>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* ----------------------------------------------------- conflict drawer */}
      <Drawer
        open={Boolean(openConflict)}
        onClose={() => setOpenConflictId(null)}
        width="w-full max-w-2xl"
        title={openConflict ? find.sodRule(openConflict.ruleId)?.name ?? '' : ''}
        subtitle={openConflict ? `${find.user(openConflict.userId)?.label} · ${openConflict.detail}` : ''}
        badges={
          openConflict ? (
            <>
              <SeverityBadge severity={openConflict.severity} />
              {openConflict.proof ? (
                <Badge tone={openConflict.proof.outcome === 'Allowed' ? 'danger' : 'success'}>
                  Proven {openConflict.proof.outcome.toLowerCase()}
                </Badge>
              ) : (
                <Badge tone="accent">Not proven yet</Badge>
              )}
            </>
          ) : undefined
        }
        footer={
          openConflict ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="primary"
                size="sm"
                loading={proofJob?.status === 'running'}
                onClick={() => {
                  runProof(openConflict)
                  setTab('matrix')
                }}
              >
                <Play className="h-3.5 w-3.5" />
                Prove it
              </Button>
              {openConflict.findingId ? <FindingRef id={openConflict.findingId} /> : null}
            </div>
          ) : undefined
        }
      >
        {openConflict ? (
          <div className="space-y-4">
            <div>
              <p className="label mb-1">The rule</p>
              <p className="text-sm text-text">{find.sodRule(openConflict.ruleId)?.plain}</p>
              <p className="mono mt-1 text-2xs text-muted">
                {find.sodRule(openConflict.ruleId)?.leftPermission} + {find.sodRule(openConflict.ruleId)?.rightPermission}
              </p>
            </div>
            <div>
              <p className="label mb-1.5">Roles that cause it</p>
              <div className="flex flex-wrap gap-1.5">
                {(find.user(openConflict.userId)?.roleIds ?? []).map((id) => (
                  <Badge key={id} tone="neutral" className="font-mono">
                    {find.role(id)?.name ?? id}
                  </Badge>
                ))}
              </div>
            </div>
            {openConflict.proof ? (
              <div
                className={cn(
                  'rounded-lg border p-3',
                  openConflict.proof.outcome === 'Allowed'
                    ? 'border-danger/40 bg-danger-soft/30'
                    : 'border-success/40 bg-success-soft/30',
                )}
              >
                <p
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-semibold',
                    openConflict.proof.outcome === 'Allowed' ? 'text-danger' : 'text-success',
                  )}
                >
                  {openConflict.proof.outcome === 'Allowed' ? (
                    <ShieldAlert className="h-3.5 w-3.5" />
                  ) : (
                    <Ban className="h-3.5 w-3.5" />
                  )}
                  Proof test: {openConflict.proof.outcome}
                </p>
                <p className="mt-1 text-xs text-text">{openConflict.proof.plain}</p>
                <p className="mono mt-1.5 text-2xs text-muted">{openConflict.proof.action}</p>
                <p className="mt-1 text-2xs text-muted">
                  Tested {dateTime(openConflict.proof.testedAt)} · evidence {openConflict.proof.evidenceId} · run{' '}
                  {openConflict.proof.runId}
                </p>
                <div className="mt-2">
                  <PageRef to={`/evidence?run=${openConflict.proof.runId}`}>Open the evidence</PageRef>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Not proven yet"
                description="Run the proof test to see whether the forbidden combination is actually possible for this user."
                icon={<ShieldAlert className="h-5 w-5" />}
              />
            )}
          </div>
        ) : null}
      </Drawer>

      {/* --------------------------------------------------------- role drawer */}
      <Drawer
        open={Boolean(openRole)}
        onClose={() => setOpenRole(null)}
        title={openRole?.name ?? ''}
        subtitle={openRole?.description}
        badges={openRole ? <SystemRef id={openRole.systemId} compact /> : undefined}
      >
        {openRole ? (
          <div className="space-y-4">
            <div>
              <p className="label mb-1.5">Permissions</p>
              <div className="flex flex-wrap gap-1.5">
                {openRole.permissions.map((permission) => (
                  <Badge key={permission} tone="neutral" className="font-mono">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="label mb-1.5">Users with this role</p>
              <div className="space-y-1">
                {db.users
                  .filter((user) => user.roleIds.includes(openRole.id))
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5"
                    >
                      <UserRef id={user.id} />
                      <span className="text-2xs text-muted">
                        {user.businessRole} - {user.site}
                      </span>
                    </div>
                  ))}
                {db.users.filter((user) => user.roleIds.includes(openRole.id)).length === 0 ? (
                  <p className="text-xs text-muted">Nobody holds this role in the test data.</p>
                ) : null}
              </div>
            </div>
            <div>
              <p className="label mb-1.5">Conflict rules this role can trigger</p>
              <div className="space-y-1">
                {db.sodRules
                  .filter(
                    (rule) =>
                      openRole.permissions.includes(rule.leftPermission) ||
                      openRole.permissions.includes(rule.rightPermission),
                  )
                  .map((rule) => (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => {
                        setOpenRole(null)
                        setOpenRule(rule)
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5 text-left hover:bg-surface2"
                    >
                      <span className="text-xs text-text">{rule.name}</span>
                      <SeverityBadge severity={rule.severity} />
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* --------------------------------------------------------- rule drawer */}
      <Drawer
        open={Boolean(openRule)}
        onClose={() => setOpenRule(null)}
        title={openRule?.name ?? ''}
        subtitle={openRule?.plain}
        badges={openRule ? <SeverityBadge severity={openRule.severity} /> : undefined}
      >
        {openRule ? (
          <div className="space-y-4">
            <KeyValue
              columns={2}
              rows={[
                { label: 'First permission', value: <span className="mono">{openRule.leftPermission}</span> },
                { label: 'Second permission', value: <span className="mono">{openRule.rightPermission}</span> },
              ]}
            />
            <div>
              <p className="label mb-1.5">Roles that grant these permissions</p>
              <div className="space-y-1">
                {db.roles
                  .filter(
                    (role) =>
                      role.permissions.includes(openRule.leftPermission) ||
                      role.permissions.includes(openRule.rightPermission),
                  )
                  .map((role) => (
                    <div key={role.id} className="flex items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5">
                      <span className="mono text-xs text-text">{role.name}</span>
                      <SystemRef id={role.systemId} compact />
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <p className="label mb-1.5">Users in conflict on this rule</p>
              <div className="space-y-1">
                {db.sodConflicts
                  .filter((conflict) => conflict.ruleId === openRule.id)
                  .map((conflict) => (
                    <div key={conflict.id} className="flex items-center justify-between gap-2">
                      <UserRef id={conflict.userId} />
                      {conflict.proof ? (
                        <Badge tone={conflict.proof.outcome === 'Allowed' ? 'danger' : 'success'}>
                          {conflict.proof.outcome}
                        </Badge>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setOpenRule(null)
                            runProof(conflict)
                          }}
                        >
                          <Play className="h-3 w-3" />
                          Prove it
                        </Button>
                      )}
                    </div>
                  ))}
                {db.sodConflicts.filter((conflict) => conflict.ruleId === openRule.id).length === 0 ? (
                  <p className="flex items-center gap-1.5 text-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    No user holds both permissions.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </>
  )
}
