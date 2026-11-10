// Lỗi của bộ tải HTTP. Mỗi lỗi nêu URL để người chạy biết phải làm gì.

export class OfflineError extends Error {
  constructor(url) {
    super(`--offline: cache không có ${url}; chạy lại không kèm --offline để tải`);
    this.name = 'OfflineError';
    this.url = url;
  }
}

export class HttpError extends Error {
  constructor(url, status, detail = '') {
    super(`HTTP ${status} cho ${url}${detail ? `: ${detail}` : ''}`);
    this.name = 'HttpError';
    this.url = url;
    this.status = status;
  }
}

export class RobotsDisallowedError extends Error {
  constructor(url) {
    super(`robots.txt của ${new URL(url).host} cấm ${url}; không tải`);
    this.name = 'RobotsDisallowedError';
    this.url = url;
  }
}

export class RequestBudgetError extends Error {
  constructor(url, budget) {
    super(`vượt ngân sách ${budget} request mạng khi cần tải ${url}`);
    this.name = 'RequestBudgetError';
    this.url = url;
    this.budget = budget;
  }
}
