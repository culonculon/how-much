// 사람별 셈 — 같은 사람이 1분에 너무 자주 · 하루에 너무 많이 보내면 Bedrock 전에 막는다.
// 원본: ADR-0006 · CAREER-31 plan 'A2 답'·'A3 답' · contracts/appraise-http.md §5 '사람별 제한'·§8.
// 사람을 가르는 값은 CloudFront-Viewer-Address 헤더 하나뿐이다(다른 헤더·연결 주소는 읽지 않음, plan A2 답).
// 셈은 메모리 Map 하나 — 다시 켜면 비워진다(10/24 사용자 승인 D1, 돈은 하루 상한이 막는다).
// take는 동기(사이에 await 없음)라 Node 한 스레드에서 잠금이 필요 없다. 오류에는 열쇠·주소를 담지 않는다.
import { isIP } from 'node:net';
import { dayOf } from './daily-limit.js';

// 사람별 상한에 걸림 → 429 person_limit. reason: person_day(그날 몫 다 씀) · person_minute(최근 1분에 다 씀)
export class PersonLimitError extends Error {
  constructor(reason, minuteUsed, dayUsed) {
    super(reason);
    this.name = 'PersonLimitError';
    this.reason = reason;
    this.minuteUsed = minuteUsed;
    this.dayUsed = dayUsed;
  }
}

const NOBODY = '-'; // 헤더가 없거나 모양이 틀린 요청은 모두 한 사람(막는 쪽)
const PORT_PATTERN = /^\d{1,5}$/;
const bad = () => ({ key: NOBODY, who: 'bad' });

// IPv6를 8묶음(4자리 소문자)으로 펼친다. 끝이 점 넷 꼴(IPv4를 담음)이면 16진 두 묶음으로 바꾼 뒤
function expand6(address) {
  let a = address.toLowerCase();
  const last = a.lastIndexOf(':');
  const tail = a.slice(last + 1);
  if (tail.includes('.')) {
    const [b0, b1, b2, b3] = tail.split('.').map(Number);
    a = `${a.slice(0, last + 1)}${((b0 << 8) | b1).toString(16)}:${((b2 << 8) | b3).toString(16)}`;
  }
  const [head, rest] = a.split('::');
  const h = head ? head.split(':') : [];
  const r = rest === undefined ? [] : rest ? rest.split(':') : [];
  const fill = rest === undefined ? [] : Array(8 - h.length - r.length).fill('0');
  return [...h, ...fill, ...r].map((g) => g.padStart(4, '0'));
}

// '<IP>:<포트>' → { key, who }. 포트(마지막 ':' 뒤)는 버린다 — 연결마다 바뀌기 때문(plan 실패 시나리오 1)
export function personOf(value) {
  if (value === undefined) return { key: NOBODY, who: 'none' };
  if (typeof value !== 'string') return bad();
  const cut = value.lastIndexOf(':');
  if (cut <= 0) return bad();
  const host = value.slice(0, cut);
  if (!PORT_PATTERN.test(value.slice(cut + 1)) || host.includes('%')) return bad();
  const kind = isIP(host);
  if (kind === 4) return { key: `4:${host}`, who: 'ip4' };
  if (kind !== 6) return bad();
  const g = expand6(host);
  if (g.slice(0, 5).every((x) => x === '0000') && g[5] === 'ffff') {
    // IPv4를 담은 IPv6(::ffff:a.b.c.d)는 IPv4 한 사람
    const hi = parseInt(g[6], 16);
    const lo = parseInt(g[7], 16);
    return { key: `4:${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`, who: 'ip4' };
  }
  return { key: `6:${g.slice(0, 4).join(':')}`, who: 'ip6' }; // 앞 64비트(/64) = 한 사람(D5)
}

export function createPersonLimit({ minuteLimit, windowMs, dayLimit, maxEntries, now = Date.now }) {
  // 0을 '끔'으로 쓰지 않는다 — 급히 막는 스위치는 하루 상한 0 하나뿐(plan A3 답)
  for (const [name, v] of Object.entries({ minuteLimit, windowMs, dayLimit, maxEntries })) {
    if (!Number.isSafeInteger(v) || v < 1) throw new TypeError(`${name}은 1 이상 정수여야 한다`);
  }
  if (typeof now !== 'function') throw new TypeError('now는 함수여야 한다');

  const people = new Map(); // key → { recent: 통과 시각[], day, dayUsed }. Map 차례 = 최근에 온 차례(LRU)

  // 막히면 PersonLimitError(이번 것은 넣지 않음), 통과면 넣은 뒤 { minuteUsed, dayUsed }
  function take(key) {
    const t = now();
    const today = dayOf(t);
    let p = people.get(key);
    if (p) people.delete(key);
    else p = { recent: [], day: today, dayUsed: 0 };
    people.set(key, p);
    if (people.size > maxEntries) people.delete(people.keys().next().value); // 가장 오래 안 온 사람

    if (p.day < today) {
      p.day = today;
      p.dayUsed = 0;
    } // 같거나 뒤(시계가 뒤로 감)면 그대로 — 새 하루가 생기지 않는다
    p.recent = p.recent.filter((s) => t - s < windowMs); // 정확히 windowMs 전 것은 창 밖(미끄러지는 창)

    if (p.dayUsed >= dayLimit) throw new PersonLimitError('person_day', p.recent.length, p.dayUsed);
    if (p.recent.length >= minuteLimit) throw new PersonLimitError('person_minute', p.recent.length, p.dayUsed);
    p.recent.push(t);
    p.dayUsed += 1;
    return { minuteUsed: p.recent.length, dayUsed: p.dayUsed };
  }

  return { take, size: () => people.size };
}
