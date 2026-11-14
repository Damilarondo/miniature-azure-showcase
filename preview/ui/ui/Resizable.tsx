import type { ReactNode } from 'react'
import { Group, Panel, Separator, useDefaultLayout, type PanelProps } from 'react-resizable-panels'

/** A resizable split whose sizes are remembered per browser (localStorage).
 *  Only the user's own drags are saved, not programmatic collapses. */
export function Split({ id, orientation, children, className = '' }: {
  id: string
  orientation: 'horizontal' | 'vertical'
  children: ReactNode
  className?: string
}) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: `delta.layout.${id}`, storage: localStorage, onlySaveAfterUserInteractions: true,
  })
  return (
    <Group id={id} orientation={orientation} defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged}
      className={`h-full w-full ${className}`} style={{ overflow: 'clip' }}>
      {children}
    </Group>
  )
}

/** A pane inside a Split; sizes as percent strings ("30") or pixels (240). */
export function Pane({ className = '', style, ...props }: PanelProps) {
  return <Panel className={`min-h-0 min-w-0 ${className}`} style={{ ...style, overflow: 'clip' }} {...props} />
}

/** The drag handle between panes: a thin black gutter that turns amber when
 *  hovered or dragged; arrow keys resize it when focused. */
export function Handle({ orientation }: { orientation: 'horizontal' | 'vertical' }) {
  return (
    <Separator
      className={`shrink-0 bg-surface-0 transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 ${
        orientation === 'horizontal' ? 'w-1' : 'h-1'}`} />
  )
}
