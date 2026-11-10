// Hằng số của bộ tải. Đổi ở đây, không rải số trong code.

/** User-Agent chung, không tên, không email (AX-18). */
export const USER_AGENT = 'Mozilla/5.0 (compatible; tiem-truyen-pipeline/1.0)';

/** Token so với dòng `User-agent:` trong robots.txt. */
export const ROBOTS_AGENT_TOKEN = 'tiem-truyen-pipeline';

const MS_PER_SECOND = 1000;

/** Khoảng cách tối thiểu giữa hai request tới cùng một host. */
export const MIN_HOST_GAP_MS = 2 * MS_PER_SECOND;

/**
 * Khoảng cách riêng theo host (lớn hơn mặc định). Tiki trả trang thử thách chống bot (200 text/html)
 * sau khoảng 27 request cách nhau 2 giây (census 2026-11-11), nên giãn gấp đôi.
 */
export const HOST_GAP_OVERRIDES_MS = Object.freeze({ 'tiki.vn': 4 * MS_PER_SECOND });

/** Số lần thử lại tối đa khi gặp 429/5xx/lỗi mạng trước khi báo lỗi. */
export const MAX_RETRIES = 5;

/** Lùi dần khi không có Retry-After: BASE * 2^lần (2, 4, 8, 16, 32 giây). */
export const BACKOFF_BASE_MS = 2 * MS_PER_SECOND;

/** Retry-After dài hơn mức này thì dừng và báo lỗi thay vì chờ. */
export const MAX_RETRY_AFTER_MS = 5 * 60 * MS_PER_SECOND;

/** Thời gian chờ một request (SPARQL Wikidata có thể chậm). */
export const REQUEST_TIMEOUT_MS = 60 * MS_PER_SECOND;

export { MS_PER_SECOND };

export const HTTP_TOO_MANY_REQUESTS = 429;
export const HTTP_SERVER_ERROR_MIN = 500;
export const HTTP_CLIENT_ERROR_MIN = 400;
export const HTTP_SUCCESS_MIN = 200;
export const HTTP_SUCCESS_MAX = 299;
