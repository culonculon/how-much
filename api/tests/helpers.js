// 테스트용 바이트 만들기. 그림은 풀 수 없는 가짜 JPEG다 — 서버는 마커만 읽는다(contracts/appraise-http.md §3).

export const PHOTO_MARK = 'HOWMUCH-PHOTO-MARK'; // AC-6: 로그에 사진이 새는지 찾는 표식

const ascii = (s) => [...Buffer.from(s, 'latin1')];
const u16be = (n) => [(n >> 8) & 0xff, n & 0xff];
const u16le = (n) => [n & 0xff, (n >> 8) & 0xff];
const u32le = (n) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
const segment = (marker, payload) => [0xff, marker, ...u16be(payload.length + 2), ...payload];

function exifApp1({ gps }) {
  const entries = [
    // 0x010F Make, ASCII, 4글자는 값 칸에 바로 들어감
    [...u16le(0x010f), ...u16le(2), ...u32le(4), ...ascii('Hi!\0')],
  ];
  if (gps) {
    // 0x8825 GPS IFD 포인터, LONG 1개. 가리키는 곳은 상관없다 — 포인터가 있으면 거절
    entries.push([...u16le(0x8825), ...u16le(4), ...u32le(1), ...u32le(0)]);
  }
  const ifd0 = [...u16le(entries.length), ...entries.flat(), ...u32le(0)];
  const tiff = [...ascii('II*\0'), ...u32le(8), ...ifd0];
  return segment(0xe1, [...ascii('Exif\0\0'), ...tiff]);
}

function xmpApp1() {
  const xml =
    '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF><rdf:Description ' +
    'exif:GPSLatitude="37,33.0N" exif:GPSLongitude="126,58.0E"/></rdf:RDF></x:xmpmeta>';
  return segment(0xe1, [...ascii('http://ns.adobe.com/xap/1.0/\0'), ...ascii(xml)]);
}

function sof0({ width, height }) {
  // 정밀도 8 · 높이 · 너비 · 성분 1개(id 1, 표본 1x1, 양자화 표 0)
  return segment(0xc0, [8, ...u16be(height), ...u16be(width), 1, 1, 0x11, 0]);
}

function sos() {
  return segment(0xda, [1, 1, 0x00, 0, 63, 0]);
}

export function makeJpeg({
  gps = false,
  otherExif = false,
  xmpGps = false,
  width = 640,
  height = 480,
  sof = true,
  totalBytes,
} = {}) {
  const head = [0xff, 0xd8];
  if (gps || otherExif) head.push(...exifApp1({ gps }));
  if (xmpGps) head.push(...xmpApp1());
  if (sof) head.push(...sof0({ width, height }));
  head.push(...sos(), ...ascii(PHOTO_MARK));
  const eoi = [0xff, 0xd9];
  const fill = totalBytes === undefined ? 64 : totalBytes - head.length - eoi.length;
  if (fill < 0) throw new Error(`totalBytes ${totalBytes}가 너무 작음(최소 ${head.length + 2})`);
  const out = new Uint8Array(head.length + fill + eoi.length);
  out.set(head, 0);
  out.fill(0x5a, head.length, head.length + fill); // 0xFF가 아닌 채움
  out.set(eoi, head.length + fill);
  return out;
}

export const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // 서명
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR 길이·이름
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00,
  0x90, 0x77, 0x53, 0xde,
]);

export const TEXT_BYTES = new Uint8Array(Buffer.from('이건 사진이 아니에요', 'utf8'));

// ── 서버 테스트용 (A4) ──
import http from 'node:http';

// Converse 응답 모양(output.message.content[0].text · stopReason · usage)
export function converseReply(text, { stopReason = 'end_turn', inputTokens = 1520, outputTokens = 31 } = {}) {
  return {
    output: { message: { role: 'assistant', content: [{ text }] } },
    stopReason,
    usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
  };
}

// 로그 줄 모으기
export function collectLog() {
  const lines = [];
  return { lines, log: (line) => lines.push(line) };
}

// 빈 포트에 띄우고 기본 주소를 돌려준다
export async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

// fetch가 막는 헤더(Content-Length 거짓말)를 보내는 요청. body가 없으면 헤더만 보내고 응답을 기다린다
export function rawPost(url, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'POST', headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        req.destroy();
        resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') });
      });
    });
    req.on('error', reject);
    if (body === undefined) req.flushHeaders();
    else req.end(body);
  });
}

// A6: 헤더만 먼저 보내고, 응답이 온 뒤에 본문을 마저 올린다(거절 뒤 남은 업로드 — plan '거절 뒤 남은 업로드').
// 클라이언트 오류는 던지지 않고 errors에 모은다. finished = 본문을 끝까지 다 올렸는지(req 'finish'). keepAlive가 거짓이면 Node가 Connection: close를 붙인다.
export function uploadAfterResponse(url, { headers = {}, body, keepAlive = false, destroyAfter } = {}) {
  return new Promise((resolve) => {
    const errors = [];
    let finished = false;
    const agent = keepAlive ? new http.Agent({ keepAlive: true }) : false;
    const req = http.request(url, { method: 'POST', headers, agent });
    let status = null;
    const chunks = [];
    let reqClosed = false;
    let resDone = false;
    const finish = () => {
      if (reqClosed && resDone) {
        if (agent) agent.destroy();
        resolve({ status, text: Buffer.concat(chunks).toString('utf8'), errors, finished });
      }
    };
    req.on('error', (e) => errors.push(e.code ?? e.message));
    req.on('finish', () => {
      finished = true;
    });
    req.on('close', () => {
      reqClosed = true;
      if (status === null) resDone = true; // 응답 없이 끊김
      finish();
    });
    req.on('response', async (res) => {
      status = res.statusCode;
      res.on('data', (c) => chunks.push(c));
      const done = () => {
        resDone = true;
        finish();
      };
      res.on('end', done);
      res.on('close', done);
      res.on('error', (e) => errors.push(e.code ?? e.message));
      // 응답을 받은 뒤 본문을 64KiB씩 쓴다
      const step = 64 * 1024;
      for (let off = 0; off < body.length; off += step) {
        if (destroyAfter !== undefined && off >= destroyAfter) {
          req.destroy();
          return;
        }
        if (req.destroyed) return;
        const ok = req.write(body.subarray(off, off + step));
        if (!ok) await new Promise((r) => req.once('drain', r).once('close', r));
      }
      if (!req.destroyed) req.end();
    });
    req.flushHeaders();
  });
}

// CAREER-26 AC-13: 브라우저가 만든 JPEG의 SOI 바로 뒤에 GPS 포인터가 든 EXIF를 끼운다(나머지는 그대로)
export function withGpsExif(bytes) {
  const exif = exifApp1({ gps: true });
  const out = new Uint8Array(2 + exif.length + bytes.length - 2);
  out.set([0xff, 0xd8], 0);
  out.set(exif, 2);
  out.set(bytes.subarray(2), 2 + exif.length);
  return out;
}
