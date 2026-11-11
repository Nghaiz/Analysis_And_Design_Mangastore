// docs/contracts.md §4: the three RentalBill.status values (NFC, exact characters) and the
// upper-case text a status stamp shows. The stamp text is spelled out, not derived with
// toUpperCase(), so the DOM carries exactly the strings the contract lists.

export const RENTAL_STATUS = {
  pending: 'Chờ nhận',
  renting: 'Đang cho thuê',
  cancelled: 'Đã huỷ',
} as const

export type RentalStatusKey = keyof typeof RENTAL_STATUS
export type RentalStatus = (typeof RENTAL_STATUS)[RentalStatusKey]

export const STAMP_TEXT: Readonly<Record<RentalStatusKey, string>> = {
  pending: 'CHỜ NHẬN',
  renting: 'ĐANG CHO THUÊ',
  cancelled: 'ĐÃ HUỶ',
}

const KEY_BY_STATUS = new Map<string, RentalStatusKey>(
  (Object.keys(RENTAL_STATUS) as RentalStatusKey[]).map((key) => [RENTAL_STATUS[key], key]),
)

/** Maps a status string to its key; throws on anything outside §4 (props come from JSON). */
export function rentalStatusKey(status: string): RentalStatusKey {
  const key = KEY_BY_STATUS.get(status.normalize('NFC'))
  if (!key) {
    const allowed = Object.values(RENTAL_STATUS).join(' · ')
    throw new Error(`Unknown rental bill status "${status}"; expected one of ${allowed} (docs/contracts.md §4).`)
  }
  return key
}
