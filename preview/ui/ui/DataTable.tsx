import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { shortcutsActive } from '../hooks/useShortcuts'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  /** CSS width (e.g. "88px"); the rest share the remaining space. */
  width?: string
  /** Makes the column sortable. */
  sortValue?: (row: T) => number | string | null | undefined
  title?: string
  className?: string
  /** 1 (default) is always shown; higher numbers are hidden first when the
   *  pane is too narrow for every column. */
  priority?: number
}

/** Columns without a width share the rest but need at least this much. */
const FLEX_MIN = 140

/** The columns that fit in ``width``: drop the highest-priority-number ones first. */
export function fitColumns<T>(columns: Column<T>[], width: number): Column<T>[] {
  if (!width) return columns
  const need = (cols: Column<T>[]) =>
    cols.reduce((sum, c) => sum + (c.width ? parseInt(c.width, 10) || FLEX_MIN : FLEX_MIN), 0)
  let shown = columns
  const droppable = [...columns].filter((c) => (c.priority ?? 1) > 1)
    .sort((a, b) => (b.priority ?? 1) - (a.priority ?? 1))
  for (const col of droppable) {
    if (need(shown) <= width) break
    shown = shown.filter((c) => c !== col)
  }
  return shown
}

export interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  label: string
  selectedKey?: string | null
  /** Click, j/k focus or Enter. */
  onSelect?: (row: T) => void
  /** Single-key row actions (e.g. c / r) for the focused row. */
  onRowKey?: (key: string, row: T) => boolean
  rowClassName?: (row: T) => string
  empty?: ReactNode
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  /** Rows are 32 px; "compact" is 28 px for strips. */
  density?: 'default' | 'compact'
}

/** The one table: sticky header, sortable columns, keyboard row focus
 *  (j/k or arrows, Enter opens), numbers right-aligned in tabular figures. */
export function DataTable<T>({
  rows, columns, rowKey, label, selectedKey, onSelect, onRowKey, rowClassName, empty, initialSort,
  density = 'default',
}: DataTableProps<T>) {
  const [sort, setSort] = useState(initialSort ?? null)
  const [focus, setFocus] = useState(-1)
  const body = useRef<HTMLTableSectionElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  // Fit the columns to the pane as it is resized.
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const visible = useMemo(() => fitColumns(columns, width), [columns, width])

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a)
      const vb = col.sortValue!(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      return va < vb ? -dir : va > vb ? dir : 0
    })
  }, [rows, columns, sort])

  // Keep keyboard focus on the selected row when the data changes.
  useEffect(() => {
    if (selectedKey == null) return
    const i = sorted.findIndex((r) => rowKey(r) === selectedKey)
    if (i >= 0) setFocus(i)
  }, [selectedKey, sorted, rowKey])

  const move = (i: number) => {
    const next = Math.max(0, Math.min(sorted.length - 1, i))
    setFocus(next)
    const row = sorted[next]
    if (row) {
      onSelect?.(row)
      const tr = body.current?.querySelectorAll('tr')[next]
      // Only the pane's own scroller moves (scrollIntoView would also shift
      // the fixed frames around it).
      let pane = tr?.parentElement ?? null
      while (pane && !/(auto|scroll)/.test(getComputedStyle(pane).overflowY)) pane = pane.parentElement
      if (tr && pane) {
        const top = tr.offsetTop, header = 28
        if (top - header < pane.scrollTop) pane.scrollTop = top - header
        else if (top + tr.offsetHeight > pane.scrollTop + pane.clientHeight) pane.scrollTop = top + tr.offsetHeight - pane.clientHeight
      }
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!sorted.length) return
    if (e.key === 'ArrowDown' || (e.key === 'j' && shortcutsActive(e))) {
      e.preventDefault()
      move(focus + 1)
    } else if (e.key === 'ArrowUp' || (e.key === 'k' && shortcutsActive(e))) {
      e.preventDefault()
      move(focus - 1)
    } else if (e.key === 'Enter' && focus >= 0) {
      e.preventDefault()
      onSelect?.(sorted[focus])
    } else if (focus >= 0 && onRowKey && shortcutsActive(e) && e.key.length === 1) {
      if (onRowKey(e.key, sorted[focus])) e.preventDefault()
    }
  }

  const rowH = density === 'compact' ? 'h-6' : 'h-[26px]'
  const align = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left')

  return (
    <div ref={wrap} className="w-full">
    <table aria-label={label} className="w-full table-fixed border-separate border-spacing-0 text-[13px]"
      tabIndex={0} onKeyDown={onKeyDown}
      onFocus={() => focus < 0 && sorted.length && setFocus(0)}>
      <colgroup>
        {visible.map((c) => <col key={c.key} style={c.width ? { width: c.width } : { minWidth: FLEX_MIN }} />)}
      </colgroup>
      <thead>
        <tr>
          {visible.map((c) => {
            const active = sort?.key === c.key
            const ariaSort = active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'
            return (
              <th key={c.key} scope="col" aria-sort={c.sortValue ? ariaSort : undefined} title={c.title}
                className={`sticky top-0 z-10 h-7 bg-surface-2 px-2 text-[11px] font-medium text-accent ${align(c.align)}`}>
                {c.sortValue ? (
                  <button type="button" className={`inline-flex items-center gap-0.5 hover:text-text-1 ${active ? 'text-text-1' : ''}`}
                    onClick={() => setSort(active ? { key: c.key, dir: sort!.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'desc' })}>
                    {c.header}
                    {active && (sort!.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </button>
                ) : c.header}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody ref={body}>
        {sorted.length === 0 && (
          <tr>
            <td colSpan={visible.length}>{empty}</td>
          </tr>
        )}
        {sorted.map((row, i) => {
          const key = rowKey(row)
          const selected = key === selectedKey
          return (
            <tr key={key} aria-selected={selected} onClick={() => { setFocus(i); onSelect?.(row) }}
              className={`${rowH} cursor-default ${selected ? 'bg-surface-3 [&>td]:border-y [&>td]:border-accent' : i === focus ? 'bg-surface-2' : 'hover:bg-surface-2'} ${rowClassName?.(row) ?? ''}`}>
              {visible.map((c) => (
                <td key={c.key}
                  className={`truncate border-b border-surface-2 px-2 ${align(c.align)} ${c.align === 'right' ? 'num' : ''} ${c.className ?? ''}`}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
    </div>
  )
}
