// 모델 출력 검사 — 원본: contracts/appraise-http.md §4·§7.
// 정해진 모양이 아니면 모두 OutputError(→ unavailable). 빈 성공·기본값으로 바꾸지 않는다(AC-3).
import { LINE_MAX_CHARS, MAX_OUTPUT_CHARS } from './config.js';

export class OutputError extends Error {
  constructor(reason) {
    super(reason);
    this.name = 'OutputError';
    this.reason = reason;
  }
}

// 30자 = 코드 포인트 수(이모지 하나 = 1자)
export const countChars = (s) => [...s].length;

// 줄바꿈 포함 제어 문자
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;

export function checkLine(line) {
  if (typeof line !== 'string' || line.trim() === '' || CONTROL.test(line)) {
    throw new OutputError('bad_line');
  }
  if (countChars(line) > LINE_MAX_CHARS) throw new OutputError('line_too_long');
  return line;
}

// ```json … ``` 울타리 한 겹만 벗긴다
const FENCE = /^```(?:json)?[ \t]*\n([\s\S]*?)\n?```$/;

export function parseModelOutput(text, stopReason) {
  if (typeof text !== 'string') throw new OutputError('not_json');
  if (countChars(text) > MAX_OUTPUT_CHARS) throw new OutputError('output_too_long');
  if (stopReason === 'max_tokens') throw new OutputError('max_tokens');

  let body = text.trim();
  const fenced = FENCE.exec(body);
  if (fenced) body = fenced[1].trim();

  let value;
  try {
    value = JSON.parse(body);
  } catch {
    throw new OutputError('not_json');
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new OutputError('bad_shape');
  }

  const keys = Object.keys(value).sort().join(',');
  if (keys === 'refuse') {
    if (value.refuse === true) return { refused: true };
    throw new OutputError('bad_shape');
  }
  if (keys !== 'grade,line') throw new OutputError('bad_shape');

  const { grade, line } = value;
  if (typeof grade !== 'number' || !Number.isInteger(grade) || grade < 1 || grade > 5) {
    throw new OutputError('bad_grade');
  }
  checkLine(line);
  return { grade, line };
}
