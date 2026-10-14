import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Link2, Play, ShieldCheck, Sparkles, Upload } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, KeyValue, Select } from '@/components/ui/primitives'
import { Drawer } from '@/components/ui/overlays'
import { DataTable } from '@/components/ui/table'
import { LiveLog } from '@/components/common/LiveLog'
import { AiBadge } from '@/components/common/badges'
import { ProcessPicker, SelectionSummary, SitePicker } from '@/components/common/selectors'
import { PageRef, ProcessRef, SystemRef } from '@/components/common/links'
import { useToast } from '@/components/ui/toast'
import { useApi, useJob } from '@/lib/useApi'
import { useSelection } from '@/lib/selection'
import * as api from '@/lib/api'
import { db, find } from '@/lib/db'
import { dateTime, num } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { TestDataRecord, TestDataSet } from '@/lib/types'

export default function TestDataPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { selection, patch } = useSelection()

  const [entityKey, setEntityKey] = useState('scrapBatch')
  const [count, setCount] = useState(10)
  const [generateJobId, setGenerateJobId] = useState<string | null>(null)
  const [loadJobId, setLoadJobId] = useState<string | null>(null)
  const [previewSetId, setPreviewSetId] = useState<string | null>(null)
  const [openRecord, setOpenRecord] = useState<TestDataRecord | null>(null)

  const generateJob = useJob<TestDataSet>(generateJobId)
  const loadJob = useJob<TestDataSet>(loadJobId)
  const { data: entities } = useApi(() => api.listTestDataEntities(), [])
  const { data: sets } = useApi(() => api.listTestDataSets(), [])

  useEffect(() => {
    if (generateJob?.status === 'done' && generateJob.result) {
      setPreviewSetId(generateJob.result.id)
      patch({ testDataSetId: generateJob.result.id })
      toast({
        title: `${generateJob.result.count} records generated`,
        description: 'Preview them, then load them into the test environment.',
        tone: 'ai',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateJob?.status])

  useEffect(() => {
    if (loadJob?.status === 'done') {
      toast({ title: 'Test data loaded', description: 'The records are available in the test environment.', tone: 'success' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadJob?.status])

  const entity = (entities ?? []).find((item) => item.key === entityKey)
  const previewSet = previewSetId ? find.testDataSet(previewSetId) : undefined
  const previewRecords = previewSet?.records ?? []

  const columns = useMemo(() => {
    if (!previewSet) return []
    const sampleEntity = db.testDataEntities.find((item) => item.key === previewSet.entityKey)
    const fields = sampleEntity?.fields ?? []
    return [
      ...fields.map((field) => ({
        key: field.name,
        header: field.label,
        sortValue: (row: TestDataRecord) => row.values[field.name] ?? '',
        render: (row: TestDataRecord) => <span className="mono">{row.values[field.name] ?? '-'}</span>,
      })),
      {
        key: 'links',
        header: 'Linked to',
        render: (row: TestDataRecord) =>
          row.links.length === 0 ? (
            <span className="text-2xs text-muted">-</span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {row.links.map((link) => (
                <Badge key={`${link.entityKey}-${link.id}`} tone="primary" className="font-mono">
                  <Link2 className="h-2.5 w-2.5" />
                  {link.label}
                </Badge>
              ))}
            </span>
          ),
      },
    ]
  }, [previewSet])

  return (
    <>
      <PageHeader
        title="Test Data"
        description="AI generates realistic, linked test data: a purchase order with its vendor and material, a coil with its heat, a scrap batch with its chemistry. Preview it, then load it into the test environment."
        requirements={['R4']}
        actions={
          <>
            <Badge tone="success" className="h-8 px-2.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              No real personal data
            </Badge>
            <Button
              variant="ai"
              size="sm"
              loading={generateJob?.status === 'running'}
              onClick={() => {
                setGenerateJobId(
                  api.generateTestData({
                    entityKey,
                    count,
                    processId: selection.processId,
                    site: selection.site,
                  }),
                )
                toast({ title: 'Generating test data', description: `${count} ${entity?.label ?? entityKey} records.`, tone: 'ai' })
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Select
            size="sm"
            className="min-w-[15rem]"
            value={entityKey}
            onChange={(event) => setEntityKey(event.target.value)}
            options={(entities ?? []).map((item) => ({ value: item.key, label: item.label }))}
            aria-label="Entity"
          />
          <div className="inline-flex items-center gap-1.5">
            <span className="label">Count</span>
            <Input
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(event) => setCount(Math.max(1, Math.min(200, Number(event.target.value) || 1)))}
              className="h-8 w-20 text-xs"
            />
            {[5, 10, 25, 50].map((value) => (
              <Button key={value} variant={count === value ? 'primary' : 'ghost'} size="sm" onClick={() => setCount(value)}>
                {value}
              </Button>
            ))}
          </div>
          <ProcessPicker value={selection.processId} onChange={(value) => patch({ processId: value })} />
          <SitePicker value={selection.site} onChange={(value) => patch({ site: value })} />
          <SelectionSummary className="ml-auto" />
        </div>
      </PageHeader>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={entity?.label ?? 'Entity'}
              description={entity?.description}
              actions={entity ? <Badge tone="neutral">{entity.dataType}</Badge> : undefined}
            />
            <CardBody className="space-y-3">
              {entity ? (
                <>
                  <KeyValue
                    rows={[
                      {
                        label: 'Lives in',
                        value: (
                          <span className="flex flex-wrap gap-1">
                            {entity.systemIds.map((id) => (
                              <SystemRef key={id} id={id} compact />
                            ))}
                          </span>
                        ),
                      },
                      {
                        label: 'Linked entities',
                        value:
                          entity.linkedEntities.length === 0 ? (
                            'none'
                          ) : (
                            <span className="flex flex-wrap gap-1">
                              {entity.linkedEntities.map((key) => (
                                <Button key={key} variant="ghost" size="sm" onClick={() => setEntityKey(key)}>
                                  {db.testDataEntities.find((item) => item.key === key)?.label ?? key}
                                </Button>
                              ))}
                            </span>
                          ),
                      },
                      {
                        label: 'Used by processes',
                        value: (
                          <span className="flex flex-wrap gap-1">
                            {entity.processIds.map((id) => (
                              <ProcessRef key={id} id={id} label={id} to="/studio" />
                            ))}
                          </span>
                        ),
                      },
                    ]}
                  />
                  <div>
                    <p className="label mb-1">Fields</p>
                    <div className="space-y-1">
                      {entity.fields.map((field) => (
                        <div key={field.name} className="flex items-center justify-between gap-2 rounded-md border border-line px-2 py-1">
                          <span className="text-xs text-text">{field.label}</span>
                          <span className="mono text-2xs text-muted">
                            {field.kind}
                            {field.linkEntity ? ` → ${field.linkEntity}` : ''} · {field.sample}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Generation log"
              description="What the AI does to build linked records."
              icon={<Sparkles className="h-4 w-4 text-ai" />}
            />
            <CardBody>
              <LiveLog
                lines={generateJob?.log ?? loadJob?.log ?? []}
                status={generateJob?.status ?? loadJob?.status}
                progressPct={generateJob?.progressPct ?? loadJob?.progressPct}
                currentLabel={generateJob?.currentLabel ?? loadJob?.currentLabel}
                height="h-52"
                emptyHint="Choose an entity and a count, then press Generate."
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title={previewSet ? `Preview · ${previewSet.name}` : 'Preview'}
              description={
                previewSet
                  ? `${previewSet.count} records, generated ${dateTime(previewSet.generatedAt)}. Click a row to see the links.`
                  : 'Generate a set or open one from the list below.'
              }
              actions={
                previewSet ? (
                  <div className="flex items-center gap-2">
                    {previewSet.loaded ? (
                      <Badge tone="success">Loaded</Badge>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={loadJob?.status === 'running'}
                        onClick={() => {
                          setLoadJobId(api.loadTestData(previewSet.id))
                          toast({ title: 'Loading into the test environment', tone: 'info', description: previewSet.name })
                        }}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Load into test environment
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        patch({ testDataSetId: previewSet.id })
                        navigate('/run')
                      }}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Use in a run
                    </Button>
                  </div>
                ) : undefined
              }
            />
            {previewSet ? (
              <DataTable
                rows={previewRecords}
                columns={columns}
                getRowId={(row) => row.id}
                dense
                maxHeight="max-h-96"
                searchText={(row) => Object.values(row.values).join(' ')}
                searchPlaceholder="Search records"
                onRowClick={(row) => setOpenRecord(row)}
                caption={
                  previewSet.loaded ? (
                    <span>
                      Loaded into{' '}
                      {previewSet.loadedTo.map((id) => (
                        <span key={id} className="mr-1">
                          <SystemRef id={id} compact />
                        </span>
                      ))}
                    </span>
                  ) : (
                    'Not loaded yet. Nothing is written to a system until you press Load.'
                  )
                }
              />
            ) : (
              <CardBody>
                <EmptyState
                  title="Nothing generated yet"
                  description="Pick an entity and a count on the left and press Generate."
                  icon={<Database className="h-5 w-5" />}
                />
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader title="Test data sets" description="Every set is deterministic: the same set always has the same records." />
            <DataTable
              rows={sets ?? []}
              getRowId={(row) => row.id}
              dense
              searchText={(row) => `${row.name} ${row.entityKey} ${row.id}`}
              searchPlaceholder="Search sets"
              onRowClick={(row) => setPreviewSetId(row.id)}
              activeRowId={previewSetId}
              filters={[
                {
                  key: 'loaded',
                  label: 'Loaded',
                  options: [
                    { value: 'yes', label: 'Loaded' },
                    { value: 'no', label: 'Not loaded' },
                  ],
                  match: (row, value) => (value === 'yes' ? row.loaded : !row.loaded),
                },
              ]}
              columns={[
                {
                  key: 'name',
                  header: 'Set',
                  sortValue: (row) => row.name,
                  render: (row) => (
                    <span className="block">
                      <span className="text-xs font-medium text-text">{row.name}</span>
                      <span className="mono mt-0.5 block text-2xs text-muted">{row.id}</span>
                    </span>
                  ),
                },
                {
                  key: 'entity',
                  header: 'Entity',
                  sortValue: (row) => row.entityKey,
                  render: (row) => (
                    <Badge tone="neutral">
                      {db.testDataEntities.find((item) => item.key === row.entityKey)?.label ?? row.entityKey}
                    </Badge>
                  ),
                },
                {
                  key: 'count',
                  header: 'Records',
                  align: 'right',
                  sortValue: (row) => row.count,
                  render: (row) => <span className="mono">{num(row.count)}</span>,
                },
                {
                  key: 'process',
                  header: 'Process',
                  render: (row) => <span className="text-2xs text-muted">{row.processId}</span>,
                  hideBelow: 'sm',
                },
                {
                  key: 'by',
                  header: 'By',
                  render: (row) => (row.generatedBy === 'AI' ? <AiBadge label="AI" /> : <Badge>{row.generatedBy}</Badge>),
                  hideBelow: 'md',
                },
                {
                  key: 'loaded',
                  header: 'Loaded',
                  render: (row) =>
                    row.loaded ? <Badge tone="success">Loaded</Badge> : <Badge tone="accent">Not loaded</Badge>,
                },
              ]}
            />
          </Card>
        </div>
      </div>

      <Drawer
        open={Boolean(openRecord)}
        onClose={() => setOpenRecord(null)}
        title={openRecord?.id ?? ''}
        subtitle={
          openRecord
            ? `${db.testDataEntities.find((item) => item.key === openRecord.entityKey)?.label ?? openRecord.entityKey} record`
            : ''
        }
        badges={<Badge tone="success">No personal data</Badge>}
      >
        {openRecord ? (
          <div className="space-y-4">
            <KeyValue
              columns={2}
              rows={Object.entries(openRecord.values).map(([key, value]) => ({
                label:
                  db.testDataEntities
                    .find((item) => item.key === openRecord.entityKey)
                    ?.fields.find((field) => field.name === key)?.label ?? key,
                value: <span className="mono">{value}</span>,
              }))}
            />
            {openRecord.links.length > 0 ? (
              <div>
                <p className="label mb-1.5">Linked records</p>
                <div className="space-y-1">
                  {openRecord.links.map((link) => (
                    <button
                      key={`${link.entityKey}-${link.id}`}
                      type="button"
                      onClick={() => setEntityKey(link.entityKey)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5 text-left hover:bg-surface2',
                      )}
                    >
                      <span className="mono text-xs text-text">{link.label}</span>
                      <span className="text-2xs text-muted">
                        {db.testDataEntities.find((item) => item.key === link.entityKey)?.label ?? link.entityKey}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="text-2xs text-muted">
              Records are generated from patterns, never copied from production. <PageRef to="/coverage?req=R4">R4 coverage</PageRef>
            </p>
          </div>
        ) : null}
      </Drawer>
    </>
  )
}
