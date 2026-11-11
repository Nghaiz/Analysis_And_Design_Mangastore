// Lazy half of the loader: the only loader module that imports React. island-loader.ts reaches
// it through a dynamic import, so pages without islands never download React and the entry
// chunk stays within its gzip budget (phase-05-ui-contract.md §6).
import { Component, type ComponentType, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import type { IslandProps, ReactRuntime } from './mount-islands'

interface BoundaryProps {
  children: ReactNode
}

interface BoundaryState {
  failed: boolean
}

/**
 * Renders nothing once the island throws while rendering. Reporting and restoring the server
 * HTML happen in the root's `onCaughtError`, the single place React hands over the error, so
 * the console gets exactly one message. Islands must not add error boundaries of their own:
 * an error they catch would also arrive there and take the island down.
 */
class IslandBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children
  }
}

function mount(
  element: HTMLElement,
  Island: ComponentType<IslandProps>,
  props: IslandProps,
  onError: (cause: unknown) => void,
): void {
  // React empties the container on its first commit; keep the nodes (not an HTML string) so a
  // crashed island gives back the very same server-rendered elements, form state included.
  const serverNodes = Array.from(element.childNodes)
  let crashed = false

  const restore = (cause: unknown): void => {
    if (crashed) return
    crashed = true
    onError(cause)
    // Unmounting inside React's commit phase is not allowed; wait until the commit is over.
    queueMicrotask(() => {
      root.unmount()
      element.replaceChildren(...serverNodes)
    })
  }

  const root = createRoot(element, { onCaughtError: restore, onUncaughtError: restore })
  root.render(
    <IslandBoundary>
      <Island {...props} />
    </IslandBoundary>,
  )
}

export const runtime: ReactRuntime = { mount }
