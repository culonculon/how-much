// 서버 설정 값 — 원본: contracts/appraise-http.md §8. 값을 바꾸려면 그 문서부터 고친다.
import { homedir } from 'node:os';
import { join } from 'node:path';

export const MODEL_ID = 'apac.amazon.nova-pro-v1:0';
export const AWS_REGION = 'ap-northeast-2';
export const HOST = '127.0.0.1'; // 공개하지 않음(결정 B). 환경변수로 바꾸지 않는다.
export const DEFAULT_PORT = 8787; // 환경변수 PORT가 있으면 그 값(§9)
export const MAX_PHOTO_BYTES = 1_000_000; // 같으면 통과, 1바이트라도 넘으면 거절
export const MAX_PHOTO_EDGE_PX = 1024;
export const REJECT_LINGER_MS = 1_000; // 한도를 넘은 거절 연결을 끊기 전 붙잡는 시간 — 그동안 본문을 처리하지 않음(읽기 멈춤 — 멈추기 전 여분은 contracts §2). 원본: specs/CAREER-31-prepublic-guard/plan.md A5 답 (10/26 사용자 승인 D11)
export const REJECT_DRAIN_BYTES = 2_000_000; // 거절 뒤 남은 본문을 버리며 읽는 한도 — 넘으면 끊음. 원본: specs/CAREER-25-real-appraise/plan.md (10/22 사용자 승인)
export const TIMEOUT_MS = 20_000; // 요청 1건 전체(재시도·대기 포함)
export const MAX_RETRIES = 2; // Bedrock 호출은 최대 1 + MAX_RETRIES번
export const RETRY_BACKOFF_MS = Object.freeze([1000, 2000]);
export const MAX_OUTPUT_TOKENS = 120;
export const MAX_OUTPUT_CHARS = 500;
export const TEMPERATURE = 0;
export const TOP_K = 1; // 가장 가능성 높은 토큰만(탐욕) — 온도 0만으로는 같은 사진 등급이 흔들림(10/22 E3, 사용자 승인)
export const LINE_MAX_CHARS = 30;
export const MEMO_MAX_ENTRIES = 10_000; // 같은 사진·태그 결과 기억 개수(LRU, 약 4MB). 0이면 끔 — contracts §8 (10/22 사용자 승인)
export const DAILY_CALL_LIMIT = 300; // 하루 Bedrock 시도 수 상한(재시도 포함). 0이면 급히 막기. 환경변수 없음 — contracts §8 (10/23 사용자 결정 U2·D3)
export const DAY_UTC_OFFSET_HOURS = 9; // '하루'는 서울 00:00에 바뀐다(10/23 U3)
export const PERSON_HEADER = 'cloudfront-viewer-address'; // 사람을 가르는 값 하나(CloudFront가 붙임) — contracts §8 · ADR-0006
export const PERSON_MINUTE_LIMIT = 5; // 같은 사람 최근 1분(미끄러지는 창) 요청 수 상한 — contracts §8 (10/24 사용자 결정 U2)
export const PERSON_WINDOW_MS = 60_000;
export const PERSON_DAY_LIMIT = 50; // 같은 사람 그날(서울) 요청 수 상한 — contracts §8 (10/24 U2)
export const PERSON_MAX_ENTRIES = 10_000; // 기억하는 사람 수(LRU, 약 3MB) — contracts §8 (10/24 D4)
// 하루 셈 파일 — 코드 폴더 밖: 배포로 폴더를 바꿔도 셈이 이어진다(ADR-0005, 10/24 사용자 결정 D3). 환경변수 없음(HOME은 OS 값)
export const USAGE_FILE = join(homedir(), '.local', 'state', 'how-much', 'usage.json');
