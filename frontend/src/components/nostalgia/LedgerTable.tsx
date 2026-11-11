import type { ReactNode } from 'react'

export interface LedgerTableProps {
  caption: string
  /** Real <thead>/<tbody> elements. */
  children: ReactNode
}

/** Bảng sổ (phase-05-ui-contract.md §3, twin of ledger-table.tag). */
export function LedgerTable({ caption, children }: LedgerTableProps) {
  return (
    <table className="tt-ledger-table">
      <caption className="tt-ledger-table__caption">{caption}</caption>
      {children}
    </table>
  )
}
