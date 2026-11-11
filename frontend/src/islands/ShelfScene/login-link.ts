import { LOGIN_LINK_ID } from './types'

/**
 * Bấm gáy truyện = bấm link thật "Đăng nhập" của trang (D10): không tạo luồng mới.
 * Trang thiếu `#lnkLogin` là lỗi của JSP; vẫn đưa người dùng tới `loginHref` (props) và cảnh báo ra console.
 */
export function followLoginLink(doc: Document, loginHref: string): void {
  const link = doc.getElementById(LOGIN_LINK_ID)
  if (link instanceof HTMLAnchorElement) {
    link.click()
    return
  }
  console.warn(`[ShelfScene] #${LOGIN_LINK_ID} is missing from the page; opening props.loginHref instead.`)
  doc.defaultView?.location.assign(loginHref)
}
