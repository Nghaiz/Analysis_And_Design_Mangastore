import { CONDITION_NONE, CONDITION_OK } from '@/lib/condition'

export interface ConditionTagProps {
  /** Text already formatted per §13 ("Rách bìa, Vết bẩn, viết vẽ", "Không có lỗi"); null or "" = not recorded. */
  text: string | null
}

/** Tem tình trạng (phase-05-ui-contract.md §3, twin of condition-tag.tag). */
export function ConditionTag({ text }: ConditionTagProps) {
  if (text === null || text === '') {
    return <span className="tt-condition-tag tt-condition-tag--none">{CONDITION_NONE}</span>
  }
  const variant = text === CONDITION_OK ? 'ok' : 'damaged'
  return <span className={`tt-condition-tag tt-condition-tag--${variant}`}>{text}</span>
}
