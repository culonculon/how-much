import { describe, expect, test } from 'vitest';
import { InputError } from '../src/input.js';
import { checkJpeg } from '../src/jpeg.js';
import { makeJpeg, PNG_BYTES, TEXT_BYTES } from './helpers.js';

const reasonOf = (bytes) => {
  try {
    checkJpeg(bytes);
  } catch (err) {
    expect(err).toBeInstanceOf(InputError);
    return err.reason;
  }
  throw new Error('InputError가 나지 않음');
};

describe('AC-2 JPEG 검사', () => {
  test('AC-2(e) PNG · 글자 · 빈 바이트 → not_jpeg', () => {
    expect(reasonOf(PNG_BYTES)).toBe('not_jpeg');
    expect(reasonOf(TEXT_BYTES)).toBe('not_jpeg');
    expect(reasonOf(new Uint8Array(0))).toBe('not_jpeg');
  });

  test('AC-2(g) EXIF GPS 포인터 → gps_present', () => {
    expect(reasonOf(makeJpeg({ gps: true }))).toBe('gps_present');
  });

  test('AC-2(g) XMP GPS 글자 → gps_present', () => {
    expect(reasonOf(makeJpeg({ xmpGps: true }))).toBe('gps_present');
  });

  test('AC-2 통과: GPS 없이 다른 EXIF만 · EXIF 없음', () => {
    expect(() => checkJpeg(makeJpeg({ otherExif: true }))).not.toThrow();
    expect(() => checkJpeg(makeJpeg())).not.toThrow();
  });

  test('세그먼트 길이가 파일 끝을 넘음 → malformed_jpeg', () => {
    const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0xff, 0x00, 0x00]);
    expect(reasonOf(bytes)).toBe('malformed_jpeg');
  });

  test('IFD0 오프셋이 끝을 넘음 → malformed_jpeg', () => {
    const bytes = makeJpeg({ otherExif: true });
    const tiff = Buffer.from(bytes).indexOf('Exif\0\0', 0, 'latin1') + 6;
    new DataView(bytes.buffer).setUint32(tiff + 4, 0xffffff, true);
    expect(reasonOf(bytes)).toBe('malformed_jpeg');
  });

  test('AC-2(h) 긴 변 1025px → too_many_pixels', () => {
    expect(reasonOf(makeJpeg({ width: 1025, height: 10 }))).toBe('too_many_pixels');
    expect(reasonOf(makeJpeg({ width: 10, height: 1025 }))).toBe('too_many_pixels');
  });

  test('AC-2(h) 통과: 긴 변이 정확히 1024px', () => {
    expect(() => checkJpeg(makeJpeg({ width: 1024, height: 1024 }))).not.toThrow();
  });

  test('SOF 없음 · 가로 0 → malformed_jpeg', () => {
    expect(reasonOf(makeJpeg({ sof: false }))).toBe('malformed_jpeg');
    expect(reasonOf(makeJpeg({ width: 0 }))).toBe('malformed_jpeg');
  });
});
