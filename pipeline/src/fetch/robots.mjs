// Đọc robots.txt (RFC 9309): chọn nhóm khớp token của mình, không có thì nhóm "*";
// luật dài nhất thắng, Allow thắng khi bằng độ dài; hỗ trợ "*" và "$".

const ALLOW_ALL = Object.freeze({ rules: [], crawlDelaySeconds: null });

function parseLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':');
      if (idx < 0) return null;
      return { key: line.slice(0, idx).trim().toLowerCase(), value: line.slice(idx + 1).trim() };
    })
    .filter(Boolean);
}

/** Tách robots.txt thành các nhóm `{ agents[], rules[{allow, path}], crawlDelaySeconds }`. */
function parseGroups(text) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const { key, value } of parseLines(text)) {
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [], crawlDelaySeconds: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === 'allow' || key === 'disallow') {
      if (value) current.rules.push({ allow: key === 'allow', path: value });
    } else if (key === 'crawl-delay') {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0) current.crawlDelaySeconds = seconds;
    }
  }
  return groups;
}

/** Gộp mọi nhóm khớp token (RFC 9309 §2.2.1), không có thì gộp các nhóm "*". */
export function parseRobots(text, agentToken) {
  const groups = parseGroups(text);
  const token = agentToken.toLowerCase();
  const own = groups.filter((g) => g.agents.some((a) => a === token));
  const chosen = own.length ? own : groups.filter((g) => g.agents.includes('*'));
  if (!chosen.length) return ALLOW_ALL;
  const delays = chosen.map((g) => g.crawlDelaySeconds).filter((d) => d !== null);
  return {
    rules: chosen.flatMap((g) => g.rules),
    crawlDelaySeconds: delays.length ? Math.max(...delays) : null,
  };
}

export function allowAllRobots() {
  return ALLOW_ALL;
}

/** robots.txt so khớp với path đã mã hoá phần trăm; bỏ dấu "*" thừa, "$" neo cuối. */
function ruleRegex(path) {
  const anchored = path.endsWith('$');
  const body = anchored ? path.slice(0, -1) : path;
  const pattern = body
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${pattern}${anchored ? '$' : ''}`);
}

/** Độ ưu tiên của luật: số kí tự không phải kí tự đại diện. */
function specificity(path) {
  return path.replace(/[*$]/g, '').length;
}

export function isAllowed(robots, url) {
  const { pathname, search } = new URL(url);
  const target = `${pathname}${search}`;
  if (target === '/robots.txt') return true;
  let best = null;
  for (const rule of robots.rules) {
    if (!ruleRegex(rule.path).test(target)) continue;
    const score = specificity(rule.path);
    if (!best || score > best.score || (score === best.score && rule.allow)) {
      best = { score, allow: rule.allow };
    }
  }
  return best ? best.allow : true;
}
