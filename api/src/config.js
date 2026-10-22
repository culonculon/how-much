// 서버 설정 값 — 원본: contracts/appraise-http.md §8. 값을 바꾸려면 그 문서부터 고친다.
export const MODEL_ID = 'apac.amazon.nova-pro-v1:0';
export const AWS_REGION = 'ap-northeast-2';
export const HOST = '127.0.0.1'; // 공개하지 않음(결정 B). 환경변수로 바꾸지 않는다.
export const DEFAULT_PORT = 8787; // 환경변수 PORT가 있으면 그 값(§9)
export const MAX_PHOTO_BYTES = 1_000_000; // 같으면 통과, 1바이트라도 넘으면 거절
export const MAX_PHOTO_EDGE_PX = 1024;
export const TIMEOUT_MS = 20_000; // 요청 1건 전체(재시도·대기 포함)
export const MAX_RETRIES = 2; // Bedrock 호출은 최대 1 + MAX_RETRIES번
export const RETRY_BACKOFF_MS = Object.freeze([1000, 2000]);
export const MAX_OUTPUT_TOKENS = 120;
export const MAX_OUTPUT_CHARS = 500;
export const TEMPERATURE = 0;
export const TOP_K = 1; // 가장 가능성 높은 토큰만(탐욕) — 온도 0만으로는 같은 사진 등급이 흔들림(10/22 E3, 사용자 승인)
export const LINE_MAX_CHARS = 30;
