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
