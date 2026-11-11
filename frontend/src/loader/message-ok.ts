// Nút "OK" của hộp thông báo (ch.2: "bấm nút OK của thông báo"; docs/contracts.md §8). JSP in
// `<p class="tt-message-box">` không có nút (WEB-INF/tags/ui/message-box.tag), nên không JS thì câu
// báo vẫn hiện và không có nút thừa. Có JS thì loader thêm vào mỗi hộp một `<button type="button">OK`,
// đặt focus vào nút của hộp đầu tiên; bấm thì ẩn hộp (`hidden`) và trả focus về ô đầu tiên có
// `aria-invalid="true"`; trang không đánh dấu ô nào (LOGIN_FAILED, REGISTER_INVALID của M1) thì về ô nhập
// đầu tiên của form để người dùng gõ lại ngay, không rơi về BODY (lane 6E). Lớp nút là tiện ích Tailwind của Button phase 5 (biến thể outline,
// cỡ sm), viết nguyên chuỗi: import components/ui/button kéo React vào chunk loader (≤ 3 kB gzip).

export const MESSAGE_BOX_SELECTOR = '.tt-message-box'
/** Đánh dấu nút loader đã thêm, để gọi lại không thêm nút thứ hai. */
export const MESSAGE_OK_ATTRIBUTE = 'data-message-ok'
export const MESSAGE_OK_LABEL = 'OK'
export const MESSAGE_OK_CLASSES =
  'ml-3 h-8 rounded-paper border border-ink-soft bg-paper px-3 font-type text-sm text-ink shadow-paper hover:bg-tape focus-visible:outline-2 focus-visible:outline-pen-blue'

const INVALID_SELECTOR = '[aria-invalid="true"]'
const FIRST_FIELD_SELECTOR =
  'form :is(input:not([type="hidden"]), select, textarea):not([disabled])'

/** Ẩn hộp và trả focus về ô sai đầu tiên (C10), không có thì ô nhập đầu tiên của form, nếu có. */
export function dismissMessage(box: HTMLElement): void {
  box.hidden = true
  const doc = box.ownerDocument
  ;(doc.querySelector<HTMLElement>(INVALID_SELECTOR) ?? doc.querySelector<HTMLElement>(FIRST_FIELD_SELECTOR))?.focus()
}

/**
 * Thêm nút OK vào mỗi `.tt-message-box` dưới `root` chưa có nút, rồi focus nút của hộp đầu tiên.
 * Trả các nút vừa thêm.
 */
export function installMessageOk(root: ParentNode = document): HTMLButtonElement[] {
  const added: HTMLButtonElement[] = []
  for (const box of root.querySelectorAll<HTMLElement>(MESSAGE_BOX_SELECTOR)) {
    if (box.querySelector(`[${MESSAGE_OK_ATTRIBUTE}]`) !== null) continue
    const button = box.ownerDocument.createElement('button')
    button.type = 'button'
    button.textContent = MESSAGE_OK_LABEL
    button.className = MESSAGE_OK_CLASSES
    button.setAttribute(MESSAGE_OK_ATTRIBUTE, '')
    button.addEventListener('click', () => dismissMessage(box))
    box.append(button)
    added.push(button)
  }
  added[0]?.focus()
  return added
}
