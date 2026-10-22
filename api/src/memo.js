// 같은 사진 · 같은 태그면 기억한 결과를 돌려준다 — 원본: plan '열린 질문 8 답', spec AC-17 (10/22 사용자 결정 1·2).
// 서버 메모리 · 개수 상한(LRU) · 재시작하면 잊음 · 사진 바이트는 두지 않는다(열쇠 해시와 결과만).
import { createHash } from 'node:crypto';

// 열쇠: SHA-256(사진 바이트) hex 64자 + '|' + 표 순서 태그 id(쉼표). myPrice는 모델에 안 보내므로 넣지 않는다
export function memoKey(photo, tags) {
  return `${createHash('sha256').update(photo).digest('hex')}|${tags.join(',')}`;
}

export function createMemo({ maxEntries }) {
  if (!Number.isInteger(maxEntries) || maxEntries < 0) {
    throw new TypeError(`maxEntries는 0 이상 정수여야 해요: ${String(maxEntries)}`);
  }
  const map = new Map(); // 넣은 차례 = 오래된 차례. get·remember 때 뒤로 옮김(LRU)
  const enabled = maxEntries > 0;

  return {
    enabled,
    get(key) {
      if (!map.has(key)) return undefined;
      const value = map.get(key);
      map.delete(key);
      map.set(key, value);
      return value;
    },
    // 이미 있으면 그 값을(자리만 갱신), 없으면 얼려서 넣는다. 돌려준 값으로 응답한다(동시 요청도 같은 응답)
    remember(key, result) {
      if (!enabled) return result;
      if (map.has(key)) return this.get(key);
      const value = Object.freeze({ ...result });
      map.set(key, value);
      if (map.size > maxEntries) map.delete(map.keys().next().value);
      return value;
    },
    entries() {
      return [...map];
    },
  };
}
