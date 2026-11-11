import type { ReactNode } from 'react'

export interface TicketProps {
  title: string
  /** Display code such as "PM0125"; empty or null renders no code. */
  code?: string | null
  children?: ReactNode
}

/** Phiếu xé từ sổ (phase-05-ui-contract.md §3, twin of WEB-INF/tags/ui/ticket.tag). */
export function Ticket({ title, code = null, children }: TicketProps) {
  return (
    <article className="tt-ticket">
      <div className="tt-ticket__perf" aria-hidden="true" />
      <header className="tt-ticket__head">
        <h2 className="tt-ticket__title">{title}</h2>
        {code ? <span className="tt-ticket__code">{code}</span> : null}
      </header>
      <div className="tt-ticket__body">{children}</div>
    </article>
  )
}
