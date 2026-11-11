import type { ReactNode } from 'react'

export interface PaperCardProps {
  /** Card heading; empty or null renders no heading. */
  heading?: string | null
  /** Adds the paper-tape corner. */
  taped?: boolean
  children?: ReactNode
}

/** Thẻ giấy (phase-05-ui-contract.md §3, twin of paper-card.tag). */
export function PaperCard({ heading = null, taped = false, children }: PaperCardProps) {
  return (
    <section className={taped ? 'tt-paper-card tt-paper-card--taped' : 'tt-paper-card'}>
      {heading ? <h3 className="tt-paper-card__heading">{heading}</h3> : null}
      <div className="tt-paper-card__body">{children}</div>
    </section>
  )
}
