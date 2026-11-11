export type MessageKind = 'success' | 'error' | 'info'

export interface MessageBoxProps {
  kind: MessageKind
  /** One of the verbatim messages of docs/contracts.md §10; never reworded here. */
  text: string
}

const ROLE: Readonly<Record<MessageKind, 'status' | 'alert'>> = {
  success: 'status',
  info: 'status',
  error: 'alert',
}

/** Hộp thông báo (phase-05-ui-contract.md §3, twin of message-box.tag). */
export function MessageBox({ kind, text }: MessageBoxProps) {
  const role = ROLE[kind]
  if (!role) throw new Error(`Unknown message kind "${String(kind)}"; expected success, error or info.`)
  return (
    <p className={`tt-message-box tt-message-box--${kind}`} role={role}>
      {text}
    </p>
  )
}
