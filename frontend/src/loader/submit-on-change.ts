// `data-submit-on-change` (docs/contracts.md §11, C3): phần tử mang thuộc tính này (form, ô, hay
// khối bọc ô) thì khi người dùng đổi một ô bên trong, form chứa ô đó tự gửi về bằng
// `form.requestSubmit()` (ConfirmRentalBillView: nhập số ngày thuê thì trang tính lại tổng).
// Chỉ nhận sự kiện người dùng tạo (`isTrusted`): `change` do island phát khi đổi ô thật
// (useFormBridge) bị bỏ qua, vì island tự `requestSubmit` và form không được gửi hai lần.
// Không JS thì trang có nút "Tính lại" trong <noscript>.

export const SUBMIT_ON_CHANGE_ATTRIBUTE = 'data-submit-on-change'

type ChangeEventLike = Pick<Event, 'isTrusted' | 'target'>

/**
 * Gửi form của ô vừa đổi khi ô nằm dưới phần tử có `data-submit-on-change` và sự kiện do người
 * dùng tạo. Trả form đã gửi, hoặc null khi bỏ qua.
 */
export function submitOnChange(event: ChangeEventLike): HTMLFormElement | null {
  if (!event.isTrusted || !(event.target instanceof Element)) return null
  const control = event.target
  if (control.closest(`[${SUBMIT_ON_CHANGE_ATTRIBUTE}]`) === null) return null
  // Form sở hữu ô (kể cả ô gắn form bằng thuộc tính `form="…"`); `change` chỉ đến từ input, select, textarea.
  const form = (control as Partial<HTMLInputElement>).form
  if (!(form instanceof HTMLFormElement)) return null
  form.requestSubmit()
  return form
}

/**
 * Nghe `change` một lần trên `root` (mặc định `document`), uỷ quyền cho mọi ô bên dưới, kể cả ô
 * render sau. Gọi lại không gắn thêm listener: DOM bỏ qua cặp (`change`, cùng hàm) đã có.
 */
export function installSubmitOnChange(root: ParentNode = document): void {
  const target = root as ParentNode & EventTarget
  target.addEventListener('change', submitOnChange)
}
