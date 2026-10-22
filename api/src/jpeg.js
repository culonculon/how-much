// JPEG 입구 검사 — 원본: contracts/appraise-http.md §3.
// 그림은 풀지 않고 SOI부터 SOS까지 마커만 걷는다. 모든 길이·오프셋을 끝과 대조한다(plan 실패 시나리오 4).
import { MAX_PHOTO_EDGE_PX } from './config.js';
import { InputError } from './input.js';

const EXIF_HEADER = Buffer.from('Exif\0\0', 'latin1');
const XMP_HEADERS = [
  Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'latin1'),
  Buffer.from('http://ns.adobe.com/xmp/extension/\0', 'latin1'), // 긴 XMP가 나뉘어 들어가는 곳
];
const XMP_GPS_WORDS = ['GPSLatitude', 'GPSLongitude'];
const GPS_IFD_POINTER = 0x8825;

const malformed = () => new InputError('malformed_jpeg');

// SOF: C0~CF 중 C4(DHT)·C8(JPG)·CC(DAC) 제외
const isSof = (m) => m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
// 길이가 없는 마커: TEM, RST0~7
const isStandalone = (m) => m === 0x01 || (m >= 0xd0 && m <= 0xd7);

export function checkJpeg(bytes) {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (buf.length < 3 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) {
    throw new InputError('not_jpeg');
  }

  let pos = 2;
  let size = null; // 첫 SOF의 { width, height }
  for (;;) {
    if (pos + 1 >= buf.length || buf[pos] !== 0xff) throw malformed();
    let marker = buf[pos + 1];
    while (marker === 0xff) {
      // 채움 0xFF는 건너뛴다
      pos += 1;
      if (pos + 1 >= buf.length) throw malformed();
      marker = buf[pos + 1];
    }
    if (isStandalone(marker)) {
      pos += 2;
      continue;
    }
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x00) throw malformed(); // SOS 전에 SOI·EOI·빈 마커

    if (pos + 4 > buf.length) throw malformed();
    const segLen = buf.readUInt16BE(pos + 2);
    const start = pos + 4;
    const end = pos + 2 + segLen;
    if (segLen < 2 || end > buf.length) throw malformed();

    if (marker === 0xda) break; // SOS — 여기까지만 본다

    const data = buf.subarray(start, end);
    if (marker === 0xe1) checkApp1(data);
    if (isSof(marker) && size === null) {
      if (data.length < 5) throw malformed();
      size = { height: data.readUInt16BE(1), width: data.readUInt16BE(3) };
    }
    pos = end;
  }

  if (size === null || size.width === 0 || size.height === 0) throw malformed();
  if (Math.max(size.width, size.height) > MAX_PHOTO_EDGE_PX) {
    throw new InputError('too_many_pixels');
  }
  return size;
}

function checkApp1(data) {
  if (startsWith(data, EXIF_HEADER)) {
    checkExif(data.subarray(EXIF_HEADER.length));
    return;
  }
  if (XMP_HEADERS.some((h) => startsWith(data, h))) {
    if (XMP_GPS_WORDS.some((w) => data.includes(w, 0, 'latin1'))) {
      throw new InputError('gps_present');
    }
  }
}

function checkExif(tiff) {
  if (tiff.length < 8) throw malformed();
  const order = tiff.toString('latin1', 0, 2);
  if (order !== 'II' && order !== 'MM') throw malformed();
  const le = order === 'II';
  const u16 = (o) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const u32 = (o) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
  if (u16(2) !== 42) throw malformed();

  const ifd = u32(4);
  if (ifd + 2 > tiff.length) throw malformed();
  const count = u16(ifd);
  if (ifd + 2 + count * 12 > tiff.length) throw malformed();
  for (let i = 0; i < count; i += 1) {
    if (u16(ifd + 2 + i * 12) === GPS_IFD_POINTER) throw new InputError('gps_present');
  }
}

function startsWith(data, prefix) {
  return data.length >= prefix.length && data.subarray(0, prefix.length).equals(prefix);
}
