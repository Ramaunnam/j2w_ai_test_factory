import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox, Select } from './primitives'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  align?: 'left' | 'right' | 'center'
  width?: string
  hideBelow?: 'sm' | 'md' | 'lg'
}

export interface TableFilter<T> {
  key: string
  label: string
  options: { value: string; label: string }[]
  match: (row: T, value: string) => boolean
}

export interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  getRowId: (row: T) => string
  searchText?: (row: T) => string
  searchPlaceholder?: string
  filters?: TableFilter<T>[]
  onRowClick?: (row: T) => void
  activeRowId?: string | null
  selectable?: boolean
  selectedIds?: string[]
  onToggleSelect?: (id: string) => void
  onToggleAll?: (ids: string[], allSelected: boolean) => void
  emptyTitle?: string
  emptyDescription?: string
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  dense?: boolean
  toolbarExtra?: ReactNode
  maxHeight?: string
  rowTone?: (row: T) => 'danger' | 'accent' | 'success' | undefined
  caption?: ReactNode
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  searchText,
  searchPlaceholder = 'Search',
  filters = [],
  onRowClick,
  activeRowId,
  selectable,
  selectedIds = [],
  onToggleSelect,
  onToggleAll,
  emptyTitle = 'Nothing to show',
  emptyDescription,
  initialSort,
  dense,
  toolbarExtra,
  maxHeight,
  rowTone,
  caption,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const visible = useMemo(() => {
    let list = [...rows]
    const q = query.trim().toLowerCase()
    if (q && searchText) {
      list = list.filter((row) => searchText(row).toLowerCase().includes(q))
    }
    for (const filter of filters) {
      const value = filterValues[filter.key]
      if (value && value !== 'ALL') list = list.filter((row) => filter.match(row, value))
    }
    if (sort) {
      const column = columns.find((c) => c.key === sort.key)
      if (column?.sortValue) {
        list.sort((a, b) => {
          const av = column.sortValue!(a)
          const bv = column.sortValue!(b)
          if (av === bv) return 0
          const res = av > bv ? 1 : -1
          return sort.dir === 'asc' ? res : -res
        })
      }
    }
    return list
  }, [rows, query, searchText, filters, filterValues, sort, columns])

  const visibleIds = visible.map(getRowId)
  const allSelected = selectable && visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
  const someSelected = selectable && visibleIds.some((id) => selectedIds.includes(id))

  const hideClass = (hideBelow?: 'sm' | 'md' | 'lg') =>
    hideBelow === 'sm' ? 'hidden sm:table-cell' : hideBelow === 'md' ? 'hidden md:table-cell' : hideBelow === 'lg' ? 'hidden lg:table-cell' : ''

  return (
    <div className="flex flex-col">
      {(searchText || filters.length > 0 || toolbarExtra) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
          {searchText ? (
            <div className="relative min-w-[11rem] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded-lg border border-line bg-surface pl-8 pr-2 text-xs text-text placeholder:text-muted/70"
              />
            </div>
          ) : null}
          {filters.map((filter) => (
            <Select
              key={filter.key}
              size="sm"
              aria-label={filter.label}
              value={filterValues[filter.key] ?? 'ALL'}
              onChange={(e) => setFilterValues((prev) => ({ ...prev, [filter.key]: e.target.value }))}
              options={[{ value: 'ALL', label: filter.label }, ...filter.options]}
            />
          ))}
          <div className="ml-auto flex items-center gap-2">
            {toolbarExtra}
            <span className="whitespace-nowrap text-2xs text-muted">
              {visible.length} of {rows.length}
            </span>
          </div>
        </div>
      )}

      <div className={cn('scroll-thin overflow-auto', maxHeight)} style={maxHeight ? undefined : undefined}>
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-surface2/80 backdrop-blur">
            <tr>
              {selectable ? (
                <th className="w-9 px-3 py-2">
                  <Checkbox
                    checked={Boolean(allSelected)}
                    indeterminate={Boolean(someSelected)}
                    onChange={() => onToggleAll?.(visibleIds, Boolean(allSelected))}
                  />
                </th>
              ) : null}
              {columns.map((column) => {
                const sortable = Boolean(column.sortValue)
                const active = sort?.key === column.key
                return (
                  <th
                    key={column.key}
                    style={column.width ? { width: column.width } : undefined}
                    className={cn(
                      'label whitespace-nowrap px-3 py-2 font-semibold',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      hideClass(column.hideBelow),
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSort((prev) =>
                            prev?.key === column.key
                              ? { key: column.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                              : { key: column.key, dir: 'asc' },
                          )
                        }
                        className={cn(
                          'inline-flex items-center gap-1 hover:text-text',
                          active && 'text-text',
                        )}
                      >
                        {column.header}
                        {active ? (
                          sort?.dir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : null}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
              {onRowClick ? <th className="w-8 px-2 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const id = getRowId(row)
              const tone = rowTone?.(row)
              return (
                <tr
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-t border-line',
                    onRowClick && 'row-link',
                    activeRowId === id && 'bg-primary-soft/60',
                    tone === 'danger' && 'bg-danger-soft/40',
                    tone === 'accent' && 'bg-accent-soft/40',
                    tone === 'success' && 'bg-success-soft/40',
                  )}
                >
                  {selectable ? (
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(id)}
                        onChange={() => onToggleSelect?.(id)}
                      />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-3 align-middle text-sm text-text',
                        dense ? 'py-1.5' : 'py-2.5',
                        column.align === 'right' && 'text-right',
                        column.align === 'center' && 'text-center',
                        hideClass(column.hideBelow),
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                  {onRowClick ? (
                    <td className="px-2 py-2 text-right text-muted">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  ) : null}
                </tr>
              )
            })}
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (onRowClick ? 1 : 0)}
                  className="px-3 py-10 text-center"
                >
                  <p className="text-sm font-semibold text-text">{emptyTitle}</p>
                  {emptyDescription ? <p className="mt-1 text-xs text-muted">{emptyDescription}</p> : null}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {caption ? <div className="border-t border-line px-3 py-2 text-2xs text-muted">{caption}</div> : null}
    </div>
  )
}
