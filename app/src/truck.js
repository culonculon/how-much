// The truck, copied from specs/CAREER-40-pawnshop-concept/mockup-v3/Scene.dc.html (the bg / add / fr / box calls, values and order unchanged).
// Cells are [x, y, w, h, colour] in 3px cells; Shop.jsx draws them x3. Three marker lines (marked below) only note where the
// loudspeaker and the scale sit in the lists, so Shop can name them. tests/PawnScene.test.jsx compares the lists with the mockup.
export function truckLayers(night) {
  const ol = '#2b1a0e';
  const B = [], R = [], F = [];
  const bg = (x, y, w, h, c) => B.push([x, y, w, h, c]);
  const add = (x, y, w, h, c) => R.push([x, y, w, h, c]);
  const fr = (x, y, w, h, c) => F.push([x, y, w, h, c]);
  const box = (fn, x, y, w, h, fill, edge) => { fn(x + 1, y, w - 2, h, edge); fn(x, y + 1, w, h - 2, edge); fn(x + 1, y + 1, w - 2, h - 2, fill); };
  bg(0, 0, 130, 85, night ? '#2b2140' : '#f6e3b8');
  if (night) {
  [[40, 8], [70, 4], [112, 16], [96, 6], [20, 26], [124, 30]].forEach((s) => bg(s[0], s[1], 1, 1, '#fff4e0'));
  bg(9, 6, 6, 8, '#ffe9a8'); bg(8, 7, 8, 6, '#ffe9a8'); bg(12, 6, 4, 8, '#2b2140'); bg(11, 7, 2, 6, '#2b2140');
  } else {
  bg(9, 5, 6, 8, '#ffd27a'); bg(8, 6, 8, 6, '#ffd27a');
  bg(30, 10, 14, 3, '#fffaf2'); bg(32, 8, 8, 2, '#fffaf2');
  }
  bg(0, 85, 130, 15, '#5b5148');
  bg(0, 85, 130, 1, '#4a423b');
  for (let x = 2; x < 130; x += 10) bg(x, 92, 5, 1, '#e8dccb');
  box(add, 13, 8, 64, 12, '#3b2416', '#c58a52');
  add(14, 9, 62, 1, '#e0a96a');
  add(30, 20, 1, 3, ol); add(60, 20, 1, 3, ol);
  add(2, 23, 88, 1, ol);
  for (let i = 0; i < 11; i++) {
  const c = i % 2 === 0 ? '#c0503a' : '#fff4e0';
  add(2 + i * 8, 24, 8, 4, c); add(3 + i * 8, 28, 6, 1, c); add(4 + i * 8, 29, 4, 1, c);
  add(3 + i * 8, 29, 1, 1, ol); add(8 + i * 8, 29, 1, 1, ol); add(4 + i * 8, 30, 4, 1, ol);
  }
  add(4, 31, 84, 33, ol);
  add(5, 31, 82, 33, '#c58a52');
  add(7, 33, 78, 29, night ? '#5f666e' : '#9a6638');
  if (!night) {
  add(7, 33, 78, 1, '#7a4a26');
  add(7, 44, 78, 2, '#6b4224'); add(7, 46, 78, 1, '#4a2f1c');
  add(10, 38, 4, 6, '#4f86b8'); add(11, 37, 2, 1, '#4f86b8'); add(11, 39, 1, 3, '#cfe3f2');
  add(16, 39, 6, 5, '#e8b84a'); add(17, 40, 4, 3, '#fff4e0'); add(19, 41, 1, 1, ol);
  add(70, 39, 6, 5, '#c98a52'); add(70, 38, 2, 1, '#c98a52'); add(74, 38, 2, 1, '#c98a52'); add(72, 41, 1, 1, ol);
  add(78, 37, 4, 7, '#ffd27a'); add(77, 37, 6, 1, '#e8b84a');
  add(14, 38, 1, 2, '#fff4e0'); add(15, 40, 2, 2, '#fff4e0');
  add(76, 39, 1, 2, '#fff4e0'); add(76, 41, 2, 2, '#fff4e0');
  add(0, 31, 4, 33, '#b07a48'); add(0, 31, 1, 33, ol); add(1, 46, 2, 1, '#e8b84a');
  }
  add(88, 42, 34, 37, ol);
  add(89, 43, 32, 35, '#3f7f9f');
  add(89, 43, 32, 1, '#5b9bbb');
  box(add, 96, 46, 22, 14, night ? '#3c4a66' : '#cfe8f2', ol);
  if (!night) add(98, 48, 3, 1, '#ffffff');
  add(91, 63, 1, 12, '#2f5f77'); add(93, 66, 4, 1, '#2f5f77');
  add(119, 68, 3, 3, night ? '#5f666e' : '#ffd27a');
  add(86, 78, 38, 3, '#8a8f96'); add(86, 78, 38, 1, '#a9aeb5');
  const loud = [R.length]; // marker (not in the mockup): loudspeaker cells start
  add(100, 38, 6, 4, '#8a8f96'); add(100, 38, 6, 1, ol);
  if (!night) { add(106, 37, 2, 6, '#d9dde2'); add(108, 36, 2, 8, '#d9dde2'); add(110, 35, 2, 10, '#d9dde2'); add(112, 35, 1, 10, '#a9aeb5'); }
  else add(106, 38, 4, 4, '#8a8f96');
  loud.push(R.length); // marker: loudspeaker cells end
  [[13, 76], [99, 76]].forEach((w) => {
  const x = w[0], y = w[1];
  add(x + 2, y, 8, 12, ol); add(x, y + 2, 12, 8, ol); add(x + 1, y + 1, 10, 10, ol);
  add(x + 2, y + 2, 8, 8, '#3a3a3a'); add(x + 4, y + 4, 4, 4, '#8a8f96'); add(x + 5, y + 5, 2, 2, '#d9dde2');
  });
  fr(2, 62, 88, 1, ol); fr(2, 63, 88, 3, '#c58a52'); fr(2, 63, 88, 1, '#e0a96a'); fr(2, 66, 88, 1, ol);
  fr(4, 67, 84, 12, ol); fr(5, 67, 82, 11, '#3f7f9f'); fr(5, 67, 82, 1, '#5b9bbb');
  const scaleFrom = F.length; // marker: scale cells start
  if (!night) {
  fr(14, 57, 2, 5, '#8a8f96'); fr(11, 61, 8, 1, '#5f666e');
  fr(60, 58, 4, 3, '#e8b84a'); fr(61, 57, 2, 1, '#e8b84a'); fr(60, 61, 4, 1, '#a07a2a');
  }
  return { bg: B, rects: R, front: F, loud, scaleFrom }
}
