[CAREER-40](https://culonculon98.atlassian.net/browse/CAREER-40) · spec: [spec.md](spec.md) · 작업: [tasks.md](tasks.md) · 시안 원본: [mockup-v3/](mockup-v3/README.md) · 약속: [contracts/appraise.md](../../contracts/appraise.md) §2 · §5 (아래 C1 · C2, **제안**) · 결정: ADR 새로 쓰지 않음(A1 — 11/10 사용자 답)

상태: 승인됨 (2026-11-10) — 같은 날 사용자 검토 답으로 고친 판(퇴근 트럭 떠남 ⑨ · `PRICE_TEXT.empty` · K7 · K8 다시 짬) · plan · tasks · C1 · C2 · K7 · K8 승인 · tasks T8 'A runs once…'는 고정 3초 대신 움직임이 끝날 때까지 기다림
<!-- 이 글을 쓴 architect 세션은 셸이 없다. 코드 · 빌드 · 테스트 · 네트워크를 돌리지 않았고 읽기와 grep만 했다. '확인 못 함'은 그 뜻이다. -->

## 한 줄
내 값은 ④의 숫자 칸 하나(1~9999 · '안 팔아')로 받고, **화면 안에서만 숫자로 쓰며** 감정 요청에는 자릿수로 고른 id 하나(`one`·`ten`·`hundred`·`never`)를 싣는다. 가게 그림은 시안 v3 `Scene`의 코드를 그대로 옮긴 트럭(3px 칸 div)과 색마다 path 하나인 아저씨로 바꾼다. 움직임은 CSS `steps()`(값 공개 숫자만 Web Animations)로 A~F를 넣되 **`transform`을 쓰지 않고 `left` · `top` · `width` · `height`를 3px 단위로만** 바꾼다. 퇴근 때는 셔터를 내린 트럭이 한 번 떠나고 빈 길과 기둥 팻말이 남는다. 카드는 `makeCard(photo, mine)`가 전당표를 처음부터 그린다. `api/` · `infra/` · 새 의존성 · 새 ADR 없음.

## 사용자가 정할 것 (이 plan 승인과 함께)
1. **이 plan · tasks 승인** — 11/10 답으로 고친 곳: ⑨ 퇴근(A2 '퇴근 E', `closed-sign` 자리는 **기둥 팻말 첫 줄**로 정함 — 시안과 다른 곳 ⑨-1) · A3 `PRICE_TEXT.empty` · 움직임 규칙(`transform` 없음)
2. **C1 · C2 — contracts 고친 줄 승인**(아래 'contracts 고친 줄'. C2는 트럭이 떠나는 그림으로 다시 적음. 머리 줄은 '제안 — 사용자 승인 전')
3. **K7 다시 짬**(A6) — 숫자 칸 **딱 하나만** 자유 글 검사에서 빼고, 같은 테스트 안에서 그 칸이 숫자 말고는 아무 글도 밖으로 내보내지 않음을 단언. ①②③⑤⑥의 `0개` 줄은 그대로
4. **K8 다시 짬**(A6) — 움직임에서 `transform`을 빼서 **지금 세 줄 검사(아저씨 폭 % 40 · 조상 `transform` 없음 · `crispEdges`)를 한 글자도 안 고친 채** 보통 설정(움직이는 중)에서 그대로 돌리고, 같은 검사를 모든 step 순간에 되감아 다시 돌림. 그 테스트에서 바뀌는 줄은 이름 · 값 글자 · 물건 줄(K1 · K2 · K4)뿐

---

## A5 — 숫자 → `myPrice` id 표 · 내 값 상태 (Q1 (a))

### 표 (원본: contracts/appraise.md §2 — 이 표와 코드 `priceIdOf`가 같아야 함)
| 사용자가 부른 값 | `myPrice` | 근거 |
|---|---|---|
| 1~9 | `one` | 자릿수 1 |
| 10~99 | `ten` | 자릿수 2 |
| 100~9999 | `hundred` | 자릿수 3~4 |
| '안 팔아' | `never` | 그대로 |

```js
// app/src/options.js — contracts/appraise.md §2 table. The number never leaves the browser.
export const MY_PRICE = { min: 1, max: 9999, quick: [1, 10, 100, 777] }
export const priceIdOf = (mine) => (mine == null ? 'never' : mine < 10 ? 'one' : mine < 100 ? 'ten' : 'hundred')
```

| 후보 | 장단 | |
|---|---|---|
| **자릿수(위 표)** | 한 줄로 설명된다. 빠른 버튼 1 · 10 · 100이 지금 id와 똑같이 나가서 `toHaveBeenCalledWith({ myPrice: 'ten' })` 같은 지금 단언이 그대로 산다 | **고름** |
| 로그 눈금으로 가장 가까운 id(1~3 · 4~31 · 32~) | '가까운'에 더 맞는다. 경계가 3.16 · 31.6이라 설명이 어렵고 서버는 이 값을 쓰지 않아 얻는 게 없다 | 버림 |
| 모두 `one`(숫자면 한 id) | 가장 단순하다. 1 · 10 · 100 빠른 버튼의 지금 단언(`hundred`)이 깨져 옮길 테스트가 는다 | 버림 |

- 되돌리기 쉬운 결정이다: 서버는 `myPrice`를 검사에만 쓴다(`api/src/input.js` · appraise-http.md §2 · §6 — 모델 · 기억 · 로그에 안 씀). CAREER-41에서 `myPrice`를 빼면 이 표는 통째로 없어진다(PR '범위 변경' 칸에 제안).
- 숫자 자체는 요청 어디에도 없다 — 쿼리 키는 지금처럼 `myPrice` · `tags`뿐(AC-2).

### 내 값 상태 (App.jsx)
`myPrice`(id) 상태를 **`mine` 하나로 바꾼다**: `{ text: string, never: boolean, quick: number | null }`, 처음 `{ text: '', never: false, quick: null }`.

```js
const DIGITS = /^[0-9]+$/ // ASCII only: '１２'(전각) · '-5' · '3.5' · ' 23'은 맞지 않는다
const numberOf = ({ text, never }) => {
  if (never || !DIGITS.test(text)) return undefined
  const n = Number(text)
  return n >= MY_PRICE.min && n <= MY_PRICE.max ? n : undefined
}
// ready = never || numberOf(mine) !== undefined. The value sent and drawn: never → null, else the number.
```

| 일 | 다음 `mine` | 비고 |
|---|---|---|
| 숫자 칸에 침 | `{ text: e.target.value, never: false, quick: null }` | **걸러 내지 않는다**(U3 (a) · '몰래 바꾸지 않음'). `maxLength`도 두지 않는다(10000이 1000으로 잘림) |
| `+` | `{ text: String((n ?? 0) + 1), never: false, quick: null }` | 빈 칸 · '안 팔아'에서 1. `n === 9999`이거나 칸이 틀린 글자(빈 칸 아님)면 꺼짐 |
| `−` | `{ text: String(n - 1), … }` | `n`이 없거나 `n <= 1`이면 꺼짐 |
| 빠른 버튼 q | `{ text: String(q), never: false, quick: q }` | 다시 눌러도 그대로(끄고 켜지 않음) |
| '안 팔아' | `{ text: '', never: true, quick: null }` | 다시 눌러도 그대로 |
| '다른 물건 꺼내기' | 처음 값 | 지금 `setMyPrice(null)` 자리 |

- **빠른 버튼 눌림(spec AC-1 '우연히 같을 때' — architect 결정)**: `aria-pressed`는 **마지막 일이 그 버튼이었을 때만** `true`다(`mine.quick === q`). 손으로 `10`을 치거나 `9`에서 `+`로 10이 돼도 `10개`는 `false`다. 이유: AC가 "손으로 바꾸면 모든 빠른 버튼이 `false`"라고 하고, 값에서 눌림을 끌어내면 `+`를 누를 때마다 다른 버튼이 켜졌다 꺼져 고른 적 없는 선택처럼 읽힌다. 버린 대안: 값과 같으면 눌림(시안 `s.val === n`) — 상태가 하나 줄지만 위 이유. 테스트 이름 `CAREER-40 AC-1 typing a quick number does not press its button`에 적는다.
- '안 팔아'일 때 숫자 칸 · `−` · `+`는 **꺼지지 않는다**(시안은 끔). AC-1 "다시 숫자 칸 · −/+를 만지면 '안 팔아'가 풀린다" 때문이다. 대신 숫자 칸을 흐리게(시안 `opacity .45`) 보인다.
- **보낸 숫자를 결과에 붙여 둔다**: `submit`에서 `const sent = never ? null : n`을 만들고 성공 때 `setResult({ ...r, mine: sent })`. ⑥ · 비교 · 카드는 `result.mine`만 읽는다. ⑥에는 입력이 없어 지금도 같겠지만, '보낸 값 = 보인 값'을 상태 흐름에 기대지 않게 한다(AC-3 '끝까지 같다').
- `appraise` 입력 모양(contracts §1 · §2 함수 모양)은 그대로다: `appraise({ photo, myPrice: priceIdOf(sent), tags })`. `appraise.js`는 고치지 않는다.

### 숫자 칸 마크업 (AC-1)
```jsx
<div role="group" aria-label="마음 가격" className="price-box">
  <label htmlFor="my-price-input">{PRICE_TEXT.label}</label>
  <div className="price-row">
    <button type="button" className="sq" aria-label="한 개 빼기" disabled={…}>{glyph('−')}</button>
    <span className="price-field">{/* 한정선 그림 svg aria-hidden */}
      <input id="my-price-input" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" enterKeyHint="done"
        value={mine.text} aria-invalid={bad || undefined} aria-describedby={ready ? undefined : 'price-hint'} onChange={…} />
      <span aria-hidden="true">개</span>
    </span>
    <button type="button" className="sq" aria-label="한 개 더하기" disabled={…}>{glyph('+')}</button>
  </div>
  {!ready && <p id="price-hint" className="note">{mine.text === '' ? PRICE_TEXT.empty : PRICE_TEXT.bad}</p>}
  <div className="chips">{MY_PRICE.quick.map((q) => <Chip key={q} on={mine.quick === q} …>{q}개</Chip>)}<Chip on={mine.never} …>안 팔아</Chip></div>
</div>
```
- `type="number"`을 쓰지 않는다: 값이 틀리면 브라우저가 `value`를 `''`로 바꿔 '빈 칸'과 '틀린 글자'를 가릴 수 없고, 바퀴 · 화살표로 몰래 바뀌며, Playwright `fill('abc')`가 던진다. `inputMode="numeric"`으로 숫자 자판은 그대로 뜬다(AC-1).
- 글자 크기 **16px 이상**(시안 36px). 16px 아래면 iOS Safari가 칸을 누를 때 화면을 확대한다.
- 그룹 이름 `마음 가격`은 그대로 둔다 — 지금 테스트의 `priceGroup()`이 이 이름으로 찾는다. 빠른 버튼은 지금 `Chip`(`.chip` · `.chip-mark` ▶)을 그대로 쓴다.
- `price-hint`는 `role="alert"`가 아니다(칠 때마다 읽히면 시끄럽다). 칸에 묶인 설명이라 칸에 머물면 읽힌다.

## A3 — 글자의 원본 (`app/src/options.js`, 시안 v3에서 옮김)
| 자리 | 지금 | 바뀐 글자 | 출처 |
|---|---|---|---|
| ① `STEPS.door` | `동네 감정소\n값은 아저씨 마음대로` | `kicker: '오늘 이 동네에 왔어요'` · `title: '이동식 전당포'` · `line: '안 쓰는 물건, 추억 있는 물건\n아저씨가 한정선으로 쳐 드려요'` | Main |
| ① 아래 안내 | — | `NOTICE_DOOR = '값은 아저씨 마음대로예요.\n진짜로 사거나 맡아 두지는 않아요.'` | Main |
| ① 꼬리표 3개 | — | `맡기면 값부터` · `고물도 OK` · `전당표 공유` (장식 글자, `aria-hidden` 아님 — 그냥 글) | Main |
| ① 버튼 | `가게에 들어가기` | **그대로** (시안 `창구로 가기` — 아래 표 ①) | spec AC-6 |
| ② ③ 대사 | 지금 글 | **그대로** (시안에 화면이 없고 '감정소' · '나무'가 없음) | — |
| ④ `STEPS.price.line` | `자네는 이걸 얼마로 치나?` | `자네는 이걸 한정선 몇 개로 치나?` | Price |
| ④ `PRICE_TEXT.label` | — | `내가 부르는 값 (1~9999개)` | Price |
| ④ `PRICE_TEXT.empty` | — | `한정선 몇 개에 넘길지 불러 주세요. 값만 궁금하면 ‘안 팔아’도 돼요.` (작은따옴표는 굽은 `‘ ’` U+2018 · U+2019 그대로) | **11/10 사용자가 고름** |
| ④ `PRICE_TEXT.bad` | — | `1부터 9999까지 정수만 넣을 수 있어요.` | **11/10 사용자 받음** |
| ④ 빠른 버튼 | `🍡 1개` … `🙅 안 팔아` | `1개` · `10개` · `100개` · `777개` · `안 팔아` | Price |
| ④ −/+ 이름 | — | `한 개 빼기` · `한 개 더하기` (보이는 글자 `−` · `+`는 `aria-hidden`) | Price |
| ⑤ `THINKING_LINE` | `🔍 어디 보자… 흐음…` | `어디 보자… 흐음…` (돋보기를 그림으로 그림) | Appraise |
| ⑤ 안내 | — | `NOTICE_THINKING = '아저씨가 돋보기로 살펴보는 중이에요.\n보통 몇 초면 끝나요.'` | Appraise |
| ⑥ 값 | `🍡 × N` / 읽기 `모찌 N개` | 보임 `한정선 N개` / 읽기 `한정선 모찌 N개` (`appraised-*` · `my-*` 같은 testid) | spec 가정 1 |
| ⑥ 비교 | 네 줄 | **그대로** (`compareLine`, spec AC-3) | spec |
| 퇴근 | `OFF_DUTY_TEXT` 지금 글 | `아저씨는 다른 동네로 떠났어요. 밤 12시에 다시 와요.` (원본 contracts §5) | spec Q3 |
| 퇴근 셔터 팻말 (트럭과 함께 떠남) | `오늘 영업 끝` | `오늘 영업 끝` / `다른 동네로 떠나요` 두 줄 — 장식, 표식 없음 | Scene |
| 퇴근 기둥 팻말 (끝 그림에 남음) | — | 첫 줄 `오늘 영업 끝`(**`closed-sign`** — 지금 이름 · 글자 그대로) / 둘째 줄 `내일 또 와요` | Scene + ⑨-1 |
| 장면 글자(그림, `aria-hidden`) | `HOW-MUCH` 간판 | 트럭 간판 `이동식 전당포` · 계산대 아래 `고물 · 추억 · 잡동사니 감정` · ① 말풍선 `물건 감정해요~\n추억도 쳐 드려요~` | Scene |
| 카드 | `CARD` | 아래 A2 '카드 자리표' | Card |

- `<h1>how-much</h1>`은 **모든 화면에서 `.sr-only`**다(시안에 HOW-MUCH 간판이 없고, `App.test.jsx`가 소문자 `how-much`를 찾는다).
- 그리는 글자 규칙(CAREER-35 그대로): `▶` · `▼` · `−` · `+` · `…`는 `aria-hidden`. 문구에 `<br>`을 넣지 않는다(`\n` + `white-space: pre-line`).

### 시안과 다르게 한 곳 (11/10 사용자 검토: ⑨는 '시안대로 떠남'으로 바꿈, 나머지 13줄 받음. ⑨-1은 새로 생긴 줄 — 승인 1에 포함)
| # | 시안 v3 | 이 plan | 왜 |
|---|---|---|---|
| ① | ① 버튼 `▶ 창구로 가기` | `가게에 들어가기` | spec AC-6이 이 이름을 적었고, 바꾸면 돕는 함수 2곳과 이름을 찾는 테스트 약 12줄이 함께 바뀐다. 바꾸려면 spec 고침 |
| ② | 시안 ④ 숫자 칸 기본값 7 | 빈 칸 | README '숫자는 예시'. 기본값이 있으면 고르지 않고 보내게 된다(지금도 가격을 골라야 켜짐) |
| ③ | 범위 밖은 1~9999로 맞춰 넣음(`clamp`) | 그대로 두고 끔 + 문구 2개(새 글자) | U3 (a) |
| ④ | '안 팔아'면 숫자 칸 · −/+ 꺼짐 | 켜 둠 · 칸만 흐림 | AC-1 '만지면 풀린다' |
| ⑤ | ⑤ 아저씨 표정 `base` | 지금 `think` 그대로 | 가정 6 표정 짝 그대로, 지금 테스트(ShopFaces) |
| ⑥ | ⑥ 큰 `× 23` + 그 아래 `한정선 23개` 두 줄 | 한 줄 `[한정선 그림] 한정선 23개`(24px) | 375×548 세로 예산(A4 표) · 9999 폭 |
| ⑦ | ⑥ 비교 `▲ 아저씨가 16개 더 쳐줬다!` | 지금 네 줄 그대로 | spec AC-3 '글자 그대로' |
| ⑧ | ⑥ 버튼 `전당표 공유하기` | `공유`(없으면 `저장`) | spec AC-7 · CAREER-37 테스트 |
| ⑨ | 퇴근: 셔터 내리고 **트럭이 떠남**(빈 길) · 6초마다 되풀이 | **시안대로 떠남**(11/10 사용자 답). 셔터를 내리고(E) 트럭이 **한 번** 떠나고, 끝 그림은 빈 길 + 기둥 팻말. 연기는 떠나는 동안만. '동작 줄이기'면 처음부터 빈 길 + 팻말 | spec AC-5 · AC-6 · AC-8 · AC-11(d) (11/10 고침). 자세히는 A2 '퇴근 E' |
| ⑨-1 | 기둥 팻말 60×33 · `내일` / `또 와요` | 84×33 · `오늘 영업 끝` / `내일 또 와요` — 첫 줄이 `closed-sign` | 셔터 팻말은 트럭과 함께 떠나서, 거기 `closed-sign`을 두면 끝 그림 · '동작 줄이기'에 **보이지 않는 팻말을 테스트가 통과시킨다**. 끝까지 남는 기둥 팻말에 두면 지금 테스트(ShopFaces)와 contracts §5 "'오늘 영업 끝' 팻말"이 끝 그림에서도 참이다(A2 '퇴근 E' 후보 표) |
| ⑩ | 퇴근 문구 · 둘째 칸 `오늘 맡을 수 있는 물건을 다 받았대요…` · 버튼 꺼짐 | 문구는 Q3 답 · 둘째 칸 없음 · 버튼 `내일 다시 오기`는 지금처럼 흐리지만 눌림 | contracts §5(다시 누를 수 있음) · 퇴근 글의 원본을 한 곳으로 |
| ⑪ | 카드: 아저씨 감정가 `한정선 23개` · `▲ 16개` · `No. 0023` · 꼬리표 `23` · 날짜 · `"추억 값까지 쳐 줬구먼!"` · `맡긴 물건` · `사연` 줄 | 아저씨 값 자리는 `한정선 ?개` · 꼬리표 `?` · 나무 칸에는 **내 값** · 번호 · 날짜 · 대사 · `맡긴 물건` · `사연` 줄 없음 | ADR-0010 · AC-7(아저씨 값 · 대사 없음, `makeCard`에 사진 · 내 값만). 물건 이름은 서버가 주지 않음 |
| ⑫ | 움직임 모두 되풀이 · ① 말풍선 깜빡 · ⑥ 반짝이 되풀이 · 연기 뻐끔 되풀이 | B · C만 되풀이, 나머지 한 번(말풍선 깜빡 없음) | U4 (a) |
| ⑬ | 트럭 도착 거리 399px · 셔터 87px을 6장으로 · 움직임은 `transform` | 396px(12장 × 33) · 셔터 높이를 3의 배수 키프레임으로 · **`transform` 대신 `left` · `top` · `width` · `height`** · 도장은 크기 3장(96→72→48) | 움직이는 중에도 반 픽셀에 걸리지 않고, 지금 검사(조상 `transform` 없음)를 움직이는 중에 그대로 지키게(A2 '움직임 규칙' · A6 K8) |
| ⑭ | ⑤ 막대 · `…` 깜빡임 되풀이 | C에 넣어 되풀이 | U4 답은 '돋보기 · 저울'이라 적었지만 같은 ⑤ · 같은 이유(끝을 모름). 아니면 CSS 한 줄 뺌 |

## A2 — 그림 대조 방법 (원본: `mockup-v3/*.dc.html`)

### 시안 코드 읽기 (테스트 돕는 함수, `app/tests/mockup-v3.js` 새로)
- `readFileSync(resolve(cwd(), '../specs/CAREER-40-pawnshop-concept/mockup-v3/<이름>.dc.html'))` → `<script type="text/x-dc" data-dc-script …>`의 본문을 꺼내 `new Function('DCLogic', 본문 + '\nreturn Component')(class { constructor(p) { this.props = p; this.state = {} } setState() {} })`로 `Component`를 얻고, `new Component({ mode, face }).renderVals()`를 부른다. 못 찾으면 **던진다**(빈 값으로 통과 금지 — CAREER-35 PixelMap과 같은 규칙). 저장소 안 파일이고 네트워크 · 파일 쓰기가 없다.
- 시안 `st` 글자는 `/^left:(\d+)px;top:(\d+)px;width:(\d+)px;height:(\d+)px;background:(#[0-9a-f]{6})$/`로 풀어 3으로 나눈 칸 `[x, y, w, h, 색]`으로 바꾼다. 맞지 않는 글자가 있으면 던진다.

### 트럭 장면 — 시안 코드를 그대로 옮긴다
| 후보 | 장단 | |
|---|---|---|
| **시안 `Scene`의 `bg` · `add` · `fr` 호출을 함수로 그대로 옮기고 칸마다 `div`(3px)로 그림** | 시안과 1:1로 맞대기 쉽다(위 돕는 함수로 목록 그대로 `toEqual`). 요소 약 170개. 바뀔 때는 낮/밤 두 벌뿐이라 `memo`로 충분 | **고름** |
| 칸을 미리 칠해 색마다 path 하나인 SVG로 그림 | 요소 약 30개. 칠하는 차례(뒤 칸이 앞 칸을 덮음)를 다시 짜야 하고 시안과 맞대기가 한 단계 멀어진다 | 버림 |
| 그림 파일(PNG) 한 장 | 가장 가볍다. 시안이 코드라 그림을 따로 뽑아야 하고 낮 · 밤 · 움직이는 부분을 나눠야 한다 | 버림 |

- `app/src/truck.js`: `export function truckLayers(night)` → `{ bg, rects, front }`(칸 단위 `[x, y, w, h, 색]` 배열). **시안 `Scene.dc.html` 155~215줄의 `bg(…)` · `add(…)` · `fr(…)` · `box(…)` 호출을 손으로 고치지 않고 옮긴다**(값 · 차례 그대로). 3배는 그리는 쪽에서 한다.
- 시안 `<div>`로 직접 적힌 부분(셔터 · 저울 접시 · 작은/큰 돋보기 · 말풍선 · 눈 깜빡 덮개 · 연기 · 기둥 팻말 · 간판 글자)은 시안 좌표(px)를 그대로 쓴다. 단 기둥 팻말 글자 `line-height: 13px` → **12px**(3의 배수).
- `app/src/Shop.jsx`가 장면을 그린다. 크기: 안쪽 판 **390×300**(130×100칸), 큰 장면(① · ⑤)은 다 보이고 **보통 장면(②~④ · ⑥ · 실패 · 퇴근)은 높이 180, 위를 66px 잘라** 22~82번째 줄(차양 · 창구 · 아저씨 · 계산대 · 계산대 아래 글자)을 보인다. 간판 · 말풍선은 ①에서만 보이면 된다.
- 폭: 375에서는 판을 왼쪽에 붙이고 오른쪽 15px(5칸, 길 · 하늘만)을 잘라 낸다. 390보다 넓으면 가운데에 두되 `margin-left: 0; margin-left: max(0px, round(down, (100% - 390px) / 2, 3px));`(모르는 브라우저는 둘째 줄을 버리고 왼쪽에 붙음). `translateX(-50%)`는 쓰지 않는다.

### 표식 (`data-testid` — 화면 단위 · e2e가 같은 방법으로 읽음)
| 표식 | 언제 있나 | 뜻 |
|---|---|---|
| `shop-scene` + `data-scene="day|night"` + **`data-shop="truck"`** + **`data-mode="arrive|idle|think|leave"`** | 언제나 | 장면 (지금 이름 유지) |
| `truck-board` | 언제나 | 390×300 안쪽 판(3px 칸 재기의 원점). 보통 장면에서는 `top: -66px` |
| `truck` + **`data-truck="here|gone"`** | 언제나(요소는 늘 있음) | 트럭 묶음(움직이는 A · E의 대상). 퇴근(`leave`)에서는 처음부터 `gone` = **끝 모습**(`visibility: hidden`)이고, 떠나는 움직임 동안만 보인다(A2 '퇴근 E') |
| `truck-loudspeaker` | 낮 | 확성기(시안 `add(100, 38, …)` ~ `add(112, 35, …)`를 감싼 묶음) |
| `truck-scale` | 낮 | 짐칸 저울(시안 `fr(14, 57…)` · `fr(60, 58…)` + 접시 div) |
| `magnifier` + `data-size="small|big"` | 낮 | 작은 돋보기(⑤ 밖) · 큰 돋보기(⑤) |
| `shutter` + `data-shutter="up|down"` | 언제나 | 셔터(① A 뒤 · 낮은 `up`, 퇴근은 `down`). `truck` **안에** 있어 트럭과 함께 떠난다. 셔터 위 팻말(`오늘 영업 끝` / `다른 동네로 떠나요`)은 장식이고 표식이 없다 |
| `smoke` | 퇴근 | 배기 연기(시안 `a-smoke` 묶음, `truck` 안). 늘 `visibility: hidden`이고 떠나는 움직임 동안만 보인다 |
| `post-sign` | 퇴근 | 기둥 팻말 묶음(`truck` **밖**, 판 기준 (153, 196) · 84×66). 끝 모습에서 보인다 |
| `closed-sign` | 퇴근 | `post-sign` 안 **첫 줄** 요소, 글자 `오늘 영업 끝` 그대로(지금 이름 · 글자 유지 — ShopFaces 109행). 둘째 줄 `내일 또 와요`는 따로 요소. 이 표식은 화면에 하나뿐 |
| `uncle` + `data-face` | 낮 | 지금 그대로. 퇴근엔 없음 |
| `shop-counter` | 언제나 | 트럭 앞 계산대(시안 `front` 묶음, `truck` 안) — 지금 이름 유지 |
| `stamp` | ⑥ 값 칸 | '감정필' 도장 (`aria-hidden`) |
| 없어야 함 | 언제나 | `shop-item` 0개 · `.shelf` 0개 · `.items` 0개 (= 선반 물건 · 나무 감정소 벽. '쇠창살'은 지금 코드에 없으므로 이 셋이 0개인 것으로 '없음'을 본다) |

### 아저씨 — 색 하나에 path 하나 (AC-5)
- `Pixel.jsx`의 `drawn`을 **가로로 이어진 칸을 한 조각으로**(`M{x} {y}h{n}v1h-{n}z`) 바꾼다 — 시안 `Scene` 216~228줄과 같은 방식. 지금의 칸마다 조각(`h1v1h-1z`)은 경계에 가는 금(격자 무늬)이 보일 수 있다(시안 v3 메모 '격자 무늬 없앰').
- 지도 `U`는 그대로다. 시안 v3의 `base` · `happy`는 지금 `pixels.js`와 같은 줄이라고 grep으로 봤다(세 줄 확인, 전부는 테스트가 본다). `think` · `frown` · `sweat` · `sleepy`는 CAREER-35 시안 그대로(가정 6).
- 맞대기: ① `base` · `happy` — 시안 `renderVals().u`의 색별 `d`와 앱 `<path>`의 `d`가 글자 그대로 같다(`M0 0` 빈 색은 뺌). ② 여섯 표정 모두 — `path` 수 = 쓴 색 수, `rect` 0개, 조각을 풀면 칸마다 색이 지도와 같다.
- 눈 깜빡(B) 덮개는 시안이 `base` · `happy` 눈에 맞춰 둔 것이라 **이 둘에서만** 그린다. 다른 표정은 숨쉬기만.

### 3px 칸 확인 (AC-5)
e2e, `reducedMotion: 'reduce'`(멈춘 그림)로 ① · ④ · ⑤ · ⑥ · refused · 퇴근에서: `shop-scene` 안 판(`data-testid="truck-board"`, 390×300) 기준으로 **모든 자손 요소**의 `getBoundingClientRect()` left · top · width · height를 판의 left · top에서 뺀 값이 3의 배수다(`Math.round(v * 100) / 100 % 3 === 0`). `svg`는 자기 상자만 본다(안쪽 path는 viewBox 칸). 판 자체의 left는 정수.

### 움직임 규칙 (AC-6 — 이름이 테스트와의 약속)
- 모두 `@media (prefers-reduced-motion: no-preference) { … }` 안에 쓴다. 바깥(=동작 줄이기 · 지원 안 함)의 모습이 **마지막 모습**이다(셔터 올라감 · 숫자 마지막 값 · 도장 찍힘 · 트럭이 떠난 빈 길과 기둥 팻말).
- **`animation-fill-mode: forwards` · `both` 금지**(끝난 뒤에도 `getAnimations()`에 남는다). 지연 동안 첫 키프레임 모습이어야 할 때만 `backwards`. 마지막 키프레임은 요소의 원래 모습과 같거나, 끝나는 순간 원래 모습으로 넘어가도 되는 것(퇴근 트럭 — 아래 '퇴근 E')이다.
- **`transform` · `translate` · `scale` · `rotate`를 쓰지 않는다**(움직임 · 멈춘 모습 모두, `app/src`의 CSS · 인라인 스타일 · WAAPI 키프레임). 자리는 `left` · `top`, 크기는 `width` · `height`(가운데를 지키려면 `margin`), 나타남은 `opacity` · `visibility`로만 바꾼다. 값은 모두 3의 배수(거리를 3 × 장 수로 나눠떨어지게, 아니면 키프레임을 손으로). 옛 `.closed`의 `rotate(-3deg)`는 F3에서 지운다.
  - 왜: CAREER-35 AC-9 검사는 '아저씨 조상에 `transform`이 없음'을 본다(반 픽셀 · 확대로 칸이 흐려지지 않게). 움직임이 `transform`을 쓰면 그 검사를 움직이는 중에는 못 돌리고, 돌리려면 검사를 고쳐야 한다(사용자가 받지 않음 — A6 K8). 자리 속성으로 움직이면 **지금 검사를 고치지 않고 움직이는 모든 순간에 돌릴 수 있다.**
  - 대가: `left` · `top`은 바뀔 때마다 레이아웃을 다시 잰다. 모두 `steps()`라 한 움직임에 많아야 14번이고, 움직이는 묶음은 `position: absolute`라 바깥 배치에 번지지 않는다.
  - `translate` 속성(개별 변환)은 `getComputedStyle().transform`에 안 잡혀 지금 검사를 빠져나간다 — 그래서 함께 금지하고, 새 검사(T8 K8)가 `translate` · `scale` · `rotate`도 `none`인지 본다.
- 시간은 시안의 6초 한 바퀴를 한 번으로 옮긴 값.

| 묶음 | 이름 (`animationName` / WAAPI `id`) | 대상 | 시간 · 장 | 되풀이 |
|---|---|---|---|---|
| A ① 열기 | `hm-arrive` | `truck` | 1.68s: 0→1.44s `left` −396px→0 `steps(12)`(33px씩), 1.56~1.68s `top` −3px 덜컹 | 1 |
| A | `hm-shut-up` | `shutter` | 지연 1.8s(`backwards`) · 0.84s · 높이 87→72→57→42→27→12→0 (장마다 `steps(1)`) | 1 |
| A | `hm-bubble` | ① 말풍선 | 지연 2.82s(`backwards`) · opacity 0→1 `steps(1)` | 1 |
| B 머무르기 | `hm-breathe` | 아저씨 묶음 | 1.4s · `top` 90/87px `steps(1)` | 무한 |
| B | `hm-blink` | 눈 덮개(`base` · `happy`) | 4s · 90~94%만 보임 `steps(1)` | 무한 |
| C ⑤ | `hm-mag` | 큰 돋보기 | 2s · `left` 153/126/99/126px `steps(1)` | 무한 |
| C | `hm-pan` | 저울 접시 | 0.8s · `top` 162/165px `steps(1)` | 무한 |
| C | `hm-bar` · `hm-dots` | ⑤ 막대 · `…` | 시안 Appraise 그대로(2.4s `steps(8)` · 0.9s). 막대는 `width`로 채움(3의 배수) | 무한 |
| D ⑥ | `hm-count` (WAAPI `el.animate`, `id: 'hm-count'`) | 큰 값 글자 | 0.6s · `easing: 'steps(12, end)'` · 키프레임 `opacity`만 | 1 |
| D | `hm-stamp` | `stamp`(48×48, `position: absolute` — 크기가 바뀌어도 값 글자를 밀지 않음) | 지연 0.6s(`backwards`) · 0.45s · 크기 96→72→48 · `margin` −24→−12→0 · opacity 0→1 (장마다 `steps(1)`) | 1 |
| D | `hm-spark` | 반짝이 3개 | 지연 1.05s(`backwards`) · 0.6s 깜빡 한 번 `steps(1)` | 1 |
| E 퇴근 | `hm-shut-down` | `shutter` | 1.2s · 높이 0→12→27→42→57→72→87 `steps(1)` | 1 |
| E | `hm-drive` | `truck` | 지연 1.8s(`backwards`) · 2.04s · `left` 0→420px `steps(14, end)`(30px씩) · 키프레임 모두 `visibility: visible` | 1 |
| E | `hm-smoke` | `smoke` | 지연 1.8s(**fill 없음** — 지연 중에는 원래대로 안 보임) · 2.04s · `visibility: visible` + 0.204s(10%)마다 `left`/`top` (−24, 228) ↔ (−30, 225) `steps(1)` | 1 |
| E | `hm-post` | `post-sign` | 3.96s · 키프레임 모두 `visibility: hidden` `steps(1)` → 끝나면 원래(보임) | 1 |
| F 누르기 | `hm-press` | `.btn:active` · `.chip:active` · `.sq:active` | 0.12s · `top` 3px `steps(1)` (세 클래스에 `position: relative` — 지금 `.btn` · `.chip`에 없음) | 1 |

### 퇴근 E — 트럭이 떠난다 (11/10 사용자 답 ⑨)
| 때 (보통 설정) | 보이는 것 | 무엇이 그렇게 하나 |
|---|---|---|
| 0 ~ 1.2s | 밤 트럭(아저씨 없음 · 짐칸 열림) · 셔터가 6장에 걸쳐 내려옴 | `hm-shut-down` · `hm-drive`의 `backwards`(지연 중 첫 키프레임 = 보임 · `left: 0`) |
| 1.2 ~ 1.8s | 셔터 내린 트럭 · 셔터 위 팻말 `오늘 영업 끝` / `다른 동네로 떠나요` | 같음 |
| 1.8 ~ 3.84s | 트럭이 30px씩 14장에 오른쪽으로 떠남 · 연기가 뻐끔(트럭 안이라 같이 감) | `hm-drive` · `hm-smoke` |
| 3.84 ~ 3.96s | 빈 길(트럭이 판 밖 — 판은 `overflow: hidden`) | `hm-drive` 끝 → `data-truck="gone"`의 원래 모습 `visibility: hidden` |
| 3.96s ~ | **끝 그림**: 빈 길 · 별 · 달 · 기둥 팻말 `오늘 영업 끝` / `내일 또 와요` · 움직임 0개 | `hm-post` 끝 → 원래(보임) |
| '동작 줄이기' | 처음부터 끝 그림 | 움직임이 없어 원래 모습만 |

- 퇴근 문구(`off-duty`)와 `내일 다시 오기` 버튼은 **처음부터** 보이고 눌린다(AC-6 '버튼은 늦게 켜지지 않는다'). 그림만 움직인다.
- 끝 모습을 `data-truck="gone"`(React가 렌더할 때 정함) + CSS 원래 모습으로 둔다. `animationend`를 듣고 JS로 지우지 않는다. 이유: '동작 줄이기' · jsdom · 움직임 지원 안 함에서도 같은 끝 모습이 이벤트 없이 바로 나오고, 길이 하나라 어긋날 일이 없다. 버린 대안: `onAnimationEnd`로 트럭 요소를 지움 — 움직임이 없으면 이벤트가 안 와 트럭이 남는다.
- `visibility: visible` 키프레임 + 원래 `hidden`: 움직이는 동안(지연 포함, `backwards`)만 보인다. `visibility`는 키프레임 사이에서 '하나라도 visible이면 visible'로 넘어가므로 두 키프레임이 모두 visible이면 내내 보인다.
- 셔터 · 셔터 팻말 · 계산대 · 연기는 `truck` 안이라 따로 숨기지 않는다. 기둥 팻말은 `truck` 밖(시안도 밖).
- 기둥 팻말 자리(⑨-1, 판 기준 · 모두 3의 배수): 묶음 (153, 196) 84×66 · 판자 84×33(`#fff4e0`, 3px 테두리 그림자는 시안 그대로) · 기둥 (39, 30) 6×36 `#6b4224` · 글자 칸 (0, 3) 폭 84 · 12px · `line-height: 12px` · 가운데 · 두 줄은 각각 `display: block` 요소. 시안의 가운데(195)를 지키려고 왼쪽을 165→153으로 옮김.

**`closed-sign`을 어디에 두나 (사용자 질문 — architect가 정함)**
| 후보 | 장단 | |
|---|---|---|
| (가) 셔터 위 팻말(시안 그대로) | 시안과 같다. 하지만 셔터가 트럭과 떠나 끝 그림 · '동작 줄이기'에는 **안 보인다.** jsdom은 `visibility`를 모르므로 ShopFaces 109행은 그대로 통과한다 — **화면에 없는 팻말을 테스트가 통과시킨다.** contracts §5 "'오늘 영업 끝' 팻말"도 끝 그림에서는 거짓 | 버림 |
| (나) 기둥 팻말을 `내일 또 와요` 한 줄로 두고 거기에 `closed-sign`, ShopFaces 기대 글자를 `내일 또 와요`로 바꾸는 짝 | 시안 팻말 모양 그대로. 대신 이미 있는 단언 글자 하나를 바꾸고(옮길 짝 하나 늘어남) contracts §5의 '오늘 영업 끝' 글도 바꿔야 한다 | 버림 |
| **(다) 기둥 팻말을 두 줄 `오늘 영업 끝` / `내일 또 와요`로 넓히고 첫 줄에 `closed-sign`** | 끝 그림 · '동작 줄이기'에서 보이는 팻말에 표식이 있다. ShopFaces · contracts §5 '오늘 영업 끝' 팻말이 고치지 않은 채 참이다. 사용자가 정한 `내일 또 와요`도 남는다. 대가: 팻말이 60→84px로 넓어지고 줄이 하나 는다(시안과 다른 곳 ⑨-1) | **고름** |
- (다)에서 퇴근 중(0~3.84s)에는 셔터 팻말과 기둥 팻말이 함께 보이지 않는다(기둥 팻말은 3.96s에 나타남). `getByTestId('closed-sign')`는 하나뿐이다(셔터 팻말에는 표식 없음).

- **값 공개 숫자(D)**: `app/src/countUp.js` 한 파일, `useCountUp(ref, target)` 하나. 마운트 때 `matchMedia('(prefers-reduced-motion: no-preference)')`가 맞고 `ref.current.animate`가 있을 때만 `el.animate([{ opacity: 1 }, { opacity: 1 }], { id: 'hm-count', duration: 600, easing: 'steps(12, end)' })`를 만들고, `requestAnimationFrame`마다 `Math.floor(target * (a.effect.getComputedTiming().progress ?? 1))`를 보인다. `a.finished.then(() => show(target), () => {})` · 언마운트 때 `a.cancel()`. 그 밖(jsdom · 동작 줄이기)에는 처음부터 `target`. 이렇게 하면 `getAnimations()`에 잡히고 동작 줄이기와 끝 값이 한 곳에서 정해진다. 버린 대안: 시안의 `setInterval` — `getAnimations()`에 안 잡혀 AC-6 D를 볼 수 없고 동작 줄이기를 따로 물어야 한다.
- 숫자가 오르는 글자(`appraised-shown`의 숫자 · 한정선 그림 옆)는 `aria-hidden`이고, 읽는 글자(`appraised-price` `한정선 모찌 N개`)는 **처음부터 마지막 값**이다. 라이브 영역이 아니므로 숫자마다 읽히지 않는다(⑥ 도착 때 `감정 결과` 칸으로 초점이 가서 한 번 읽힘).
- e2e가 '모두 `steps()`'를 보는 법: CSS 움직임은 `getKeyframes()`의 마지막 빼고 모든 `easing`이 `steps(`로 시작하거나 `effect.getTiming().easing`이 `steps(`로 시작. WAAPI는 `getTiming().easing`.
- iOS Safari의 `:active`는 터치 듣는 곳이 있어야 켜진다. React가 뿌리에 `touchstart`를 걸어 켜질 것으로 보지만 **확인 못 함** — AC-11 (a)에서 본다(안 켜져도 AC-6 e2e는 chromium이라 통과, 그때는 PR에 적고 알림).

### 카드 자리표 (AC-7 · AC-4, 시안 `Card` 540×675의 2배 = 1080×1350, 칸 6px)
| 요소 | x | y | w × h | 모양 |
|---|---|---|---|---|
| 바탕 나무 | 0 | 0 | 1080 × 1350 | `#4a2f1c`, 42px마다 6px `#3f2817` 가로줄 |
| 종이 | 60 | 66 | 948 × 1212 | `#fff4e0`, 테두리 12 `#2b1a0e`, 오른쪽 · 아래 그림자 24 |
| 차양 줄무늬 | 60 | 66 | 948 × 54 | 72px마다 `#c0503a` / `#fff4e0`, 아래 물결 (시안 `stripes` × 2) |
| 머리 글 `이동식 전당포 HOW-MUCH` | 가운데 | 기준선 186 | 24px | `#a3542a` |
| 제목 `전당표` | 가운데 | 기준선 288 | 72px · 글자 사이 36 | `#3b2416`, 밑줄 y 312 · 336 × 6, 그 아래 12에 `#e8b84a` 6 |
| 사진 칸 | 108 | 360 | 312 × 312 | 테두리 6 `#3b2416`, 사진은 안쪽 300×300에 비율 지켜 가운데 |
| 꼬리표 | 408 | 618 | 66 × 36 | `#ffd27a`, 테두리 6 `#3b2416`, 글자 `?` 24px · 끈 (402, 594) 6 × 24 |
| 점선 항목 2줄 | 462~960 | 기준선 396 · 456 | 24px | 이름 `#a3542a` · 점선 6px 칸 `#c58a52` · 값 `#3b2416` — `아저씨 감정가 ··· 한정선 ?개` · `감정사 ··· 동네 아저씨` |
| 나무 값 칸 | 108 | 726 | 852 × 132 | `#4a2f1c`, 테두리 6 `#2b1a0e`, 안쪽 위 6 `#6b4224` · 아래 6 `#3b2416` |
| 칸 안 한정선 그림 | 138 · 216 | 750 · 770 | 96×80 · 72×60 | 시안 svg(12×10칸) 8px · 6px 칸 |
| 칸 안 `내가 부른 값` | 312 | 기준선 774 | 24px | `#e8d3b4` |
| 칸 안 내 값 | 312 | 기준선 846 | 72px, **오른쪽 끝 ≤ 924** | `#ffd27a`, `한정선 {숫자}개` 또는 `안 팔아` |
| 아저씨 얼굴 | 108 | 1074 | 160 × 160 | `U.happy` 4px 칸 |
| 꼬리 글 | 288 | 기준선 1206 | 24px, **오른쪽 끝 ≤ 792**(도장 816 앞 24) — 넘으면 내 값처럼 6px씩 줄여 맞춤(최소 12px) | `#a3542a`, `내 물건도 감정받기 ▶ {location.host}` — 11/15 사용자: 실제 주소(`d2x05xzjhjvp9j.cloudfront.net`)에서 24px이면 x 946까지 가서 도장과 겹침(reviewer PR #28) → '글자 줄여 맞추기' |
| 감정필 도장 | 816 | 1092 | 132 × 132 | 테두리 12 `#c0503a`, 글자 `감정` / `필` 48px |

- 카드 글자는 `CARD`(options.js) 한 곳: `{ fileName: 'how-much-card.jpg', head: '이동식 전당포 HOW-MUCH', title: '전당표', capUncle: '아저씨 감정가', hidden: '한정선 ?개', capWho: '감정사', who: '동네 아저씨', capMine: '내가 부른 값', tag: '?', stamp: ['감정', '필'], foot: '내 물건도 감정받기 ▶' }`.
- **글자 폭 재기(AC-4)**: e2e가 공유된 카드 JPEG를 페이지 캔버스에 풀어, 내 값 줄 띠(y 786~870, x 312~972)에서 `#ffd27a`에 가까운(채널마다 ±48) 픽셀의 가장 오른쪽 x가 **924 이하**이고, 칸 오른쪽 테두리(x 954~959) 띠의 픽셀이 모두 `#2b1a0e`에 가깝다(±40). 실제로 그려진 그림을 재므로 코드가 `measureText`를 쓰든 말든 같다. 코드에서도 `measureText`가 612를 넘으면 글자 크기를 6px씩 줄여 그린다(9999 · 대체 글꼴 대비).
- **전당표 요소(AC-7)**: 같은 방법으로 점을 찍어 본다 — 차양(x 96 · 168, y 84 → 빨강 · 크림), 점선(y 390 줄에서 6px마다 `#c58a52` · 종이색 번갈아 3쌍 이상), 나무 칸(120, 840), 꼬리표(441, 636 → `#ffd27a`), 도장 테두리(822, 1098 → `#c0503a`), 아저씨 얼굴(`U.happy`에서 `S` 칸 3곳을 108+4x+2, 1074+4y+2에서). 허용 오차 채널마다 ±32(JPEG 0.92).
- `makeCard(photo, mine)` — 둘째 인자가 id에서 **부른 숫자 또는 `null`(안 팔아)**로 바뀐다. `mochi` · `line`은 여전히 받지 않는다(ADR-0010 그대로). `ShareRow`도 `mine`을 받는다.

### CAREER-35 AC-9 지도 대조를 어떻게 하나 (A2 끝)
| CAREER-35 확인 | 이 스토리에서 |
|---|---|
| 표정 6개 지도 = CAREER-35 시안 | **그대로 둔다**(표정 지도를 안 바꿈) |
| 물건 4개 지도 = 시안 · 칸마다 그림 | **물건 지도 · `Item`은 남기고 테스트도 남긴다.** 장면에서만 안 그린다. 지우면 지운 테스트가 생겨 AC-10과 부딪치고, 남겨도 빌드에 거의 안 든다(지도 4개). 정리는 범위 밖 — PR '범위 변경' 칸에 '나중에 지움' 제안 |
| 칸마다 조각 풀기 `M(\d+) (\d+)h1v1h-1z` | 이어진 조각 풀기 `M(\d+) (\d+)h(\d+)v1h-\3z`로 **푸는 법만** 바꾼다(K9). 칸 표 비교는 그대로 |
| `uncle` 폭 % 40 · 조상 transform 없음 · crispEdges | **고치지 않는다**(보통 설정 그대로 — ①에서는 A가 도는 중, ②⑥에서는 B가 도는 중에 돈다). 같은 세 줄을 모든 step 순간에 되감아 돌리는 새 테스트를 더한다(K8) |

## A4 — 시안에 없는 실패 4가지 · busy
- 모두 **보통 장면(180)의 낮 트럭** 위에 지금 표정(refused 찡그림 · unavailable · 코드 없음 식은땀 · person_limit 졸림 · invalid_input · busy 기본)을 창구에 둔다. 문구 · 버튼 · 초점은 지금 그대로(가정 6). 움직임은 B만(깜빡임은 `base`에서만).
- 새로 그리는 것이 없어 시안과 크게 달라 보이지 않는다고 본다. H0 화면 찍기에 넣어 사용자가 본다.

### 375×548 세로 예산 (계산값 · 재지 않음 · 통과 기준은 테스트)
| 화면 | 합 | 여유 | 비고 |
|---|---|---|---|
| ① (버튼까지) | 약 516 | 32 | 장면 300. 꼬리표 · 안내는 아래로 내려도 됨(CAREER-35 AC-11은 버튼만 봄) |
| ④ | 약 503 | 45 | 숫자 칸 묶음 상자는 테두리 3 · 안쪽 6만 |
| ④ + 남은 문구 또는 바쁨 안내 | 약 550 | **−2** | **가장 빠듯함.** CAREER-35 'busy and a leftover notice on step 4' |
| ⑤ | 약 470 | 78 | 장면 300 |
| ⑥ (30자 대사) | 약 504 | 44 | 값 한 줄(시안과 다른 곳 ⑥) |
| 실패 · 퇴근 | 약 370 | 약 180 | — |

- ④ + 문구가 548을 넘으면 **frontend-dev는 값을 스스로 정하지 말고 멈춘다.** 미리 고른 다음 수(사용자에게 보임): (가) 숫자 칸 이름표를 눈에서만 숨김(약 −27) (나) ④ 장면을 150(50줄)로. 추천은 (가)이고 이름은 그대로 읽힌다.

## A6 — 옮길 테스트 (요약, 짝 표는 [tasks.md T10](tasks.md#t10))
| 짝 | 지움 → 넣음 | 같은 것을 보나 |
|---|---|---|
| K1 | 빠른 이름 `🍡 1개` · `🍡 10개` · `🍡 100개` · `🙅 안 팔아` → `1개` · `10개` · `100개` · `안 팔아` | 같은 선택, 같은 id가 나감(A5 표) |
| K2 | 값 글자 `🍡 × N` → `한정선 N개`(`*-shown`) · `모찌 N개` → `한정선 모찌 N개`(`*-price` · `getByText`) | 같은 값 |
| K3 | 가격 칩 4개 목록 → `aria-pressed`를 가진 버튼 5개(`1개` … `안 팔아`) 목록 | 같은 '하나만 눌림' |
| K4 | `shop-item` 4개(`vase` …) → `truck` · `truck-loudspeaker` · `truck-scale` 각 1개 + `shop-item` 0개 / 물건 폭 % 12 → 트럭 칸 % 3 | 같은 '장면에 있어야 할 것' |
| K5 | `🔍` 있는 ⑤ 대사를 글자로 보던 곳(없음 — grep으로 봄) | — |
| K6 | 기본 걷기 `pickPrice()`의 이름 `🍡 10개` → `10개` (돕는 함수 두 곳) | 같음 |
| K7 | FirstFlow 'AC-5 no free-text field…' **④ 한 줄만**(135행): `toHaveLength(0)` → `FREE_TEXT`에 걸리는 요소가 **`마음 가격` 그룹의 그 숫자 칸 노드 하나와 같다** + 같은 테스트 안에서 '나가는 길 0' 단언 묶음. ①②③⑤⑥ 줄은 그대로 `0` | 아래 'K7 — 다시 짬'. 사용자 승인 3 |
| K8 | shop-view 'CAREER-35 AC-9 pixels stay on whole cells'는 **한 글자도 고치지 않는다**(K1 · K2 · K4 이름 · 값 글자 줄 말고). 대신 움직임에서 `transform`을 빼고(A2 '움직임 규칙'), 같은 세 줄 검사를 모든 step 순간에 되감아 돌리는 새 테스트를 더한다 | 아래 'K8 — 다시 짬'. 사용자 승인 4 |
| K9 | PixelMap `cellsOfSvg` 정규식 `M(\d+) (\d+)h1v1h-1z` → `M(\d+) (\d+)h(\d+)v1h-\3z`로 풀어 `n`칸 펼침. '남는 글자 · 같은 칸 두 번이면 던짐'과 칸 표 비교는 그대로 | 같다 — 그리는 조각 모양만 바뀌고, 펼친 칸 표를 지도와 맞대는 것은 같다 (지난 판 K8의 뒷부분을 떼어 냄) |

### K7 — 다시 짬 (지금 뜻: ④에 글을 칠 수 있는 칸 0개 = CLAUDE.md §9 '자유 글 입력은 받지 않는다')
- 바탕: spec AC-1은 ④에 `inputmode="numeric"` 숫자 칸을 요구한다(AC-11(b) 숫자 자판). 그래서 **④의 '칠 수 있는 칸 0개'를 글자 그대로 지키는 길은 spec을 바꾸는 길뿐이다**(아래 후보 (가)). spec을 그대로 두면 지킬 수 있는 것은 '자유 글이 들어와 나갈 길이 0'이고, 아래 (나)는 그것을 **칸 하나**에만 허락하고 그 칸의 모든 출구를 막아 단언한다.

| 후보 | 지금 단언보다 약해지나 | |
|---|---|---|
| (가) `<input>` 없이 화면 숫자판(0~9 · 지움 버튼)과 `<output>`으로 숫자를 만든다 | 안 약해진다 — 135행을 안 고친다. 하지만 휴대폰 숫자 자판이 안 뜨고 '숫자 칸에 친다'가 없어져 **spec AC-1 · AC-11(b)를 바꿔야 한다**(architect가 못 바꿈). 버튼 12개가 375×548 ④ 예산(A4, 여유 −2px)에 안 들어간다 | 버림 (사용자가 spec을 바꾸면 다시 봄) |
| **(나) 정체로 하나만 뺀다 + 그 칸의 출구를 같은 테스트에서 모두 단언** | 아래 표. 다른 칸이 하나라도 생기면 지금처럼 실패하고, 그 칸이 숫자 칸이 아니게 되거나(속성) 친 글이 어디로든 새면 실패한다 | **고름** |
| (다) `FREE_TEXT`에서 `input[inputmode=numeric]`을 속성으로 뺀다 | **약해진다** — 앞으로 아무 칸이나 `inputmode="numeric"`만 붙이면 검사를 빠져나간다. 칸이 실제로 무엇을 내보내는지 보지 않는다 | 버림 |
| (라) 칸이 숫자 말고는 받지 않게 거른다(친 글자를 지움) | spec U3 (a) '몰래 바꾸지 않음'과 부딪친다(AC-1 `１２` · `abc`를 친 그대로 둠) | 버림 |

(나)에서 135행 자리에 들어가는 것 — **모두 같은 테스트(`AC-5 no free-text field on the first screen or the result card`, 이름 그대로) 안**:
| # | 단언 | 무엇을 막나 |
|---|---|---|
| 1 | `[...container.querySelectorAll(FREE_TEXT)]`가 `[priceInput()]`과 `toEqual`(같은 노드 하나). `priceInput()`은 `마음 가격` 그룹 안 이름 `내가 부르는 값 (1~9999개)`인 textbox | ④에 다른 자유 글 칸이 생김 (지금 단언과 같은 힘) |
| 2 | 그 칸: `type === 'text'` · `inputMode === 'numeric'` · `getAttribute('pattern') === '[0-9]*'` · `form`이 `null`(폼 밖) · `name`이 비어 있음 | 칸이 글 칸으로 바뀜 · 폼 제출로 글이 나감 |
| 3 | 글 넣어 보기 — `['자유글', '23abc', '<b>zz</b>', '１２', '🍡7', 'x'.repeat(500)]` 하나씩 `typePrice` → `감정 받기!` 꺼짐 · 누르고 칸에서 Enter(`keyDown`)도 쳐 봄 → `appraise` **0번** | 친 글이 요청으로 나감 |
| 4 | 3의 각 글마다: 칸을 뺀 `container` 복제본의 `textContent`와 **모든 요소의 모든 속성 값**에 그 글이 0번 · `localStorage.length === 0` · `sessionStorage.length === 0` · `location.href`가 처음과 같다 | 친 글이 화면 다른 곳 · 저장소 · 주소로 나감 (React가 칸 자신의 `value` 속성에 글을 비추므로 칸만 뺀다) |
| 5 | 그다음 지금 흐름 그대로 `pickPrice('10개')` → … → ⑤ · ⑥ 줄 `0` (지금 줄 그대로 — ④의 칸이 ⑤ · ⑥에 남지 않음) | 칸이 다음 화면에 남음 |

숫자가 나갈 때 **숫자로만** 나가는 것(같은 칸의 나머지 출구)은 새 테스트로 짝을 이룬다 — 이름이 바뀌지 않는 135행 테스트를 길게 만들지 않으려고 따로 두지만, T10 확인 명령이 K7 짝으로 함께 묶어 보인다:
- 단위 `CAREER-40 AC-1 only the number leaves the price field`(T2 파일): `'0023'`과 `'23'`을 따로 쳐서 감정 → 두 번의 `appraise` 인자가 `toEqual`(열쇠는 `photo` · `myPrice` · `tags` 셋뿐, `myPrice === 'ten'`) · ⑥ `my-shown` `한정선 23개` · ⑥ `textContent`에 `0023` 0번 · `'공유'`를 누른 뒤 `makeCard`(가짜, `vi.mock('../src/shareCard.js')`) 둘째 인자가 **숫자 `23`**(`typeof === 'number'`).
- e2e `CAREER-40 AC-1 0023 and 23 leave the same`(T9 파일): 같은 사진에서 `'0023'` · `'23'`의 요청 URL이 같고 카드 바이트가 같다.

### K8 — 다시 짬 (지금 뜻: 그림의 칸이 흐려지지 않는다 = 아저씨 폭 % 40 · 조상에 `transform` 없음 · `crispEdges`. 사용자 말로 '그림의 모든 좌표가 3의 배수')
| 후보 | 지금 단언보다 약해지나 | |
|---|---|---|
| **(가) 움직임을 `left` · `top` · `width` · `height`의 3px 단위 `steps()`로만 만들고(`transform` 0), 지금 테스트를 고치지 않은 채 보통 설정에서 돌리고, 같은 검사를 모든 step 순간에 되감아 다시 돌린다** | 안 약해진다 — 지금 세 줄이 글자 그대로, **움직이는 중에** 돈다. 새 테스트는 순간 수를 늘릴 뿐이다 | **고름** |
| (나) 움직임은 `transform`으로 두고, 검사를 '`transform`이 3의 배수 이동뿐'으로 바꾼다 | **약해진다** — '조상에 `transform` 없음'을 '있어도 됨'으로 바꾼다 | 버림 |
| (다) `translate` 개별 속성으로 움직인다 | 겉으로는 지금 검사가 통과하지만 `getComputedStyle().transform`이 `translate`를 못 봐서 **검사를 빠져나간다** — 뜻을 못 지킨다 | 버림 (새 검사가 이것도 막음) |
| (라) JS 타이머로 `style.left`를 바꾼다 | 지금 검사는 지키지만 `getAnimations()`에 안 잡혀 AC-6(한 번 · steps · 동작 줄이기 0개)을 볼 수 없다 | 버림 |
| (마) 지난 판: 지금 검사를 '동작 줄이기'에서만 돌린다 | 보는 자리를 옮김 — 움직이는 중을 안 본다 | 버림 (11/10 사용자가 안 받음) |

(가)에서 하는 것:
1. **shop-view 'CAREER-35 AC-9 pixels stay on whole cells'는 그대로**: `emulateMedia`를 넣지 않는다. 바뀌는 줄은 K1(`pickPrice` 이름) · K2(`모찌 3개` → `한정선 모찌 3개`) · K4(`shop-item` 폭 % 12 줄 → `truck-board` 자손 상자가 판 기준 % 3 === 0이고 1개 이상)뿐이다. `uncle` 폭 % 40 · 조상 `transform` · `crispEdges` 세 줄은 **안 고친다.** ① 검사는 `goto` 바로 뒤라 A(트럭 도착)가 도는 중이고, ② · ⑥은 B(숨쉬기)가 도는 중이다.
2. **새 e2e `CAREER-40 AC-5 the CAREER-35 cell check holds at every step of motion`**(T8 파일, 보통 설정): ① · ④ · ⑤ · ⑥ · 퇴근에서 화면이 뜨자마자 `document.getAnimations()`를 모두 `pause()`하고, 그 화면 모든 움직임의 **step 구간마다 가운데 시각**(지연 · `steps(n)`의 n칸 · 손 키프레임 구간 · 무한은 한 바퀴)을 모은 뒤, 시각마다 모든 움직임의 `currentTime`을 그 값으로 맞추고 다음을 돈다:
   - (i) CAREER-35 세 줄을 **글자 그대로 옮긴 것**: `uncle`이 있으면 폭 % 40 === 0 · 조상 모두 `getComputedStyle(n).transform === 'none'` · `shapeRendering` `crispedges`. 여기에 (다)를 막는 한 줄: 같은 조상들의 `translate` · `scale` · `rotate`도 `'none'`.
   - (ii) T7의 3px 칸 검사: `truck-board` 안 모든 자손 상자(판 기준) left · top · width · height % 3 === 0 · `stamp`가 있으면 그 폭 · 높이 % 3 === 0.
   - 어긋난 것을 `시각 · 움직임 이름 · 요소 · 값`으로 모아 한 번에 실패. **움직임 이름마다 잰 순간 수가 그 step 수 이상**인지도 단언한다(아무것도 안 재고 통과 금지). 이 화면에 있어야 할 이름(A2 표)이 하나라도 없으면 실패.
3. `CAREER-35 AC-8 nothing moves with reduced motion`(shop-a11y)은 그대로 — '동작 줄이기' 0개는 그 테스트가 본다.

- 퇴근 문구를 보는 테스트는 모두 `OFF_DUTY_TEXT` · `contractText('daily_limit')`에서 읽으므로 **코드를 고치지 않는다.** contracts §5가 바뀐 때부터 F1 전까지 빨강이고, F1에서 `OFF_DUTY_TEXT`를 바꾸면 초록이다.
- `closed-sign` 글자 `오늘 영업 끝`은 그대로이고 끝 그림에 보이는 기둥 팻말에 있으므로(A2 '퇴근 E' (다)) ShopFaces 109행을 안 고친다. ShopFaces 'daily_limit has no uncle'의 `data-scene="night"` · `face() === null`도 그대로 맞다.
- e2e first-flow 32행(①) · 79행(⑥)은 숫자 칸이 없는 화면이라 **고치지 않는다**(지난 판 T10 표가 이 둘을 K7에 넣은 것은 잘못).
- 줄지 않았음을 보이는 법: CAREER-35 tasks T11의 'A4 확인 명령'(파일마다 AC 이름 목록이 main과 같음 · `expect(` 수가 main 이상 · `expect`가 든 `-` 줄이 모두 짝 표에 있음)을 이 스토리 파일 목록으로 돌린다(tasks T10).

## A1 — ADR (제안. 사용자가 정한다 — 11/10 결정 2)
**추천: 새 ADR을 쓰지 않고 0009 · 0010을 고치지도 않는다(둘 다 `확정` 그대로).**
- ADR-0009의 결정은 '주소 `/` · 깊이 숫자 칸 · 줄었을 때만 앞 화면'이다. 이 스토리는 단계 수 · 뒤로 · 주소를 바꾸지 않는다(가정 5). '나무 감정소'는 제목의 말일 뿐 결정이 아니었다(가게 모양은 CAREER-35 plan에서 정함).
- ADR-0010의 결정은 '`mochi` · `line`을 받지 않는 함수가 다시 그린 사진으로 처음부터 그린다'이다. 이 스토리도 그대로 지킨다(AC-7). 바뀌는 것은 모양과 둘째 인자의 값(id → 부른 숫자)뿐이고 둘 다 되돌리기 쉽다. 인자 이름이 본문(`makeCard(photo, myPrice)`)과 달라지는 것은 PR '결정' 칸에 적는다.
- 이 스토리의 다른 결정(숫자 → id 표 · 그림을 div로 · 움직임 이름 · 카드 자리표)은 모두 되돌리기 쉬워 이 plan과 PR '결정' 칸에 둔다. contracts §2의 뜻 바뀜은 contracts 자체에 사용자 승인과 함께 남는다.

| 후보 | 좋은 점 | 왜 아님 |
|---|---|---|
| **둘 다 그대로 (추천)** | 읽는 사람이 쫓을 글이 늘지 않는다. 살아 있는 결정을 '대체됨'으로 잘못 표시하지 않는다 | (나쁜 점) ADR-0009 제목의 '감정소'가 옛 말로 남는다 — 기록이므로 둔다 |
| 0011 새로 써서 0009 · 0010 대체 | 이번 모양이 한 장에 모인다 | 두 결정은 그대로 살아 있다. 대체로 적으면 다음 사람이 0011에서 0009의 history 규칙을 다시 찾아야 하고, 0011의 결정은 되돌리기 쉬운 것뿐이라 ADR 기준(되돌리기 어려운 결정)에 안 맞는다 |
| 0009 · 0010 본문 고침 | 글이 지금 코드와 맞는다 | 확정된 ADR을 고치면 그때 무엇을 정했는지가 지워진다. 바꿀 결정이 없다 |

## contracts 고친 줄 (C1 · C2 — 이미 파일에 적음, 승인 기다림)
테스트가 이 글을 읽는다: `api/tests/input.test.js`는 **§2 첫 표의 첫 열**이 `one` · `ten` · `hundred` · `never` 차례인지 보고(`checks.app.api`), 화면 테스트들은 **§5 `| \`daily_limit\`` 줄의 첫 큰따옴표 글자**를 문구로 읽는다. 두 모양을 지켰다.

| # | 자리 | 지금 | 고친 글 |
|---|---|---|---|
| C0 | 머리 '상태' 줄 끝 | — | `· **11/10 CAREER-40 고침 (제안 — 사용자 승인 전, CAREER-40 plan C1 · C2)**: §2 \`myPrice\` 설명 줄과 표 · §5 \`daily_limit\` 줄만. 함수 모양 · id 넷 · 코드 다섯 · role · data-testid는 바뀌지 않음` (승인되면 '제안 — 사용자 승인 전'을 '사용자 승인 YYYY-MM-DD'로) |
| C1 | §2 `myPrice` 설명 줄 | `단위(모찌)가 들어가지 않은 id다 — 환율을 바꿔도 id는 그대로다.` | **자리 지킴 값**이다 … 화면이 아래 표대로 id 하나로 바꿔 넘긴다. 부른 숫자 자체는 브라우저 밖으로 나가지 않는다. 그래서 **서버가 받은 `myPrice`는 사용자가 부른 값과 다를 수 있다**(23을 불러도 `ten`). 서버는 검사에만 쓰고 모델 · 기억 · 로그에 넣지 않는다. 단위가 들어가지 않은 id라 환율을 바꿔도 id는 그대로다. |
| C1 | §2 표 | `myPrice` · 버튼 글자 `🍡 1개` … · 카드 '내 값' `모찌 1개` … | `myPrice` · 부른 값 `1~9` / `10~99` / `100~9999` / '안 팔아' · '내 값' 글자 `한정선 {부른 숫자}개` / `안 팔아` (첫 열 그대로) |
| C1 | §2 표 아래 새 줄 | — | `'내 값' 글자는 id가 아니라 **부른 숫자**에서 만든다(화면 읽기는 \`한정선 모찌 {부른 숫자}개\`). 비교 한 줄도 부른 숫자로 고른다.` |
| C2 | §5 표 `daily_limit` 줄 | `아저씨 없는 어두운 가게 · '오늘 영업 끝' 팻말 (CLAUDE.md §9 · CAREER-35) · 문구 "아저씨 오늘 퇴근했어요. 밤 12시에 다시 출근해요." (CAREER-27 plan D1 후보 B — 10/23 사용자 승인)` | `셔터를 내린 트럭이 한 번 떠나고 남는 빈 길 · 아저씨 없음 · 기둥 팻말 '오늘 영업 끝' / '내일 또 와요' ('동작 줄이기'면 처음부터 빈 길과 팻말) (CLAUDE.md §9 · CAREER-40) · 문구 "아저씨는 다른 동네로 떠났어요. 밤 12시에 다시 와요." (CAREER-40 spec Q3 (a) — 11/10 사용자 결정)` (11/10 사용자 답 ⑨로 다시 적음. 첫 큰따옴표는 여전히 문구) |

- 고치지 않은 곳: §1 · §2 코드 블록(`myPrice: 'one' | 'ten' | 'hundred' | 'never'`) · §3~§7 · '화면 처리' 문단들(`daily_limit` 화면 처리 문단의 '가게를 어둡게 하고 아저씨를 그리지 않으며'는 밤 장면 · 아저씨 없음이라 그대로 맞음) · `appraise-http.md`(§2는 'id 넷 중 하나'라 그대로 맞음).
- `docs/runbook/배포.md`의 퇴근 글자는 release-ops 몫(tasks R1). 161행(§6-2)에도 같은 `🚶퇴근`이 있다 — CAREER-35 R1이 아직 안 돌아 둘 다 남아 있어 R1에 함께 넣었다.

## 신뢰 경계
`strict_review_areas`(guard = `api/`)를 건드리지 않아 절을 두지 않는다. 새 입력(숫자 칸)은 브라우저 안에만 있고 서버로 가는 것은 지금과 같은 id 넷 중 하나다(서버가 다시 검사 — `api/src/input.js`). AI 호출 길은 그대로 `App.jsx` 한 곳 → `appraise.js` → `POST /api/appraise` → 서버 막기. AI 호출 수 · 기억 hit · 과금은 바뀌지 않는다(spec '비용·남용 영향').

## 실패 시나리오 (premortem)
| # | 언제 깨지나 | 어떻게 알아채나 | 막는 것 |
|---|---|---|---|
| 1 | contracts §2 표 첫 열을 바꿔 `api` 테스트가 빨강(`api/`는 못 고침) | `checks.app.api` | 첫 열 그대로(C1) |
| 2 | §5 줄 첫 큰따옴표가 문구가 아니게 됨 → 퇴근 테스트가 엉뚱한 글자와 비교 | `contractText` 테스트들 | C2가 첫 큰따옴표를 문구로 둠 |
| 3 | `type="number"`로 '빈 칸'과 'abc'를 못 가림 · 바퀴로 몰래 바뀜 | AC-1 단위 | `type="text"` + `inputMode` |
| 4 | `maxLength`나 걸러 내기로 10000 → 1000 · `１２` → 12로 몰래 바뀜 | AC-1 '몰래 바꾸지 않음' | 걸러 내지 않음 |
| 5 | 숫자 칸 글자 < 16px → iOS가 확대 | AC-11 눈 | 16px 이상 |
| 6 | ⑥의 내 값이 보낸 값과 다름(바쁨 중 뒤로 가 고친 뒤 늦은 답) | AC-3 · CAREER-35 AC-5 ④ | `reqRef`로 버림 + `result.mine` 붙여 둠 |
| 7 | 숫자를 URL에 실음(누가 `myPrice=23`) → 모든 감정 `invalid_input` | AC-2 e2e · AC-11 (e) `bad_my_price` 0줄 | `priceIdOf` 한 곳 · AC-2 단위가 `checkQuery`에 넣어 봄 |
| 8 | `fill-mode: forwards`로 끝난 움직임이 남음 | AC-6 '끝난 뒤 0개' | 움직임 규칙 |
| 9 | `steps(6)`에 87px처럼 나눠떨어지지 않아 움직이는 중 반 픽셀로 흐림 | K8 새 테스트(모든 step 순간) · AC-11 눈 | 거리 · 키프레임을 3의 배수로 |
| 9-1 | 누가 움직임에 `transform`(또는 `translate` 속성)을 다시 씀 | CAREER-35 AC-9(움직이는 중) · K8 새 테스트(`translate` · `scale` · `rotate`도 봄) | 움직임 규칙 '`transform` 금지' |
| 9-2 | K8 새 테스트가 움직임을 못 찾아 아무것도 안 재고 통과 | 이름마다 잰 순간 수 ≥ step 수 단언 · 있어야 할 이름이 없으면 실패 | — |
| 9-3 | 퇴근 끝에 트럭이 남음(`visibility` 원래 모습을 안 둠) 또는 지연 중 트럭이 안 보임(`backwards` 빠짐) | AC-6 E · AC-8 단위(`data-truck="gone"`) · e2e 끝에 `truck` 숨음 · K8 새 테스트 0.6s 순간 트럭 보임 | A2 '퇴근 E' |
| 9-4 | 연기가 지연 중에도 보임(`backwards`를 잘못 붙임) · 끝난 뒤 남음 | AC-6 E e2e(0.6s 순간 `smoke` 숨음 · 끝에 숨음) | `hm-smoke`는 fill 없음 |
| 9-5 | `closed-sign`이 화면에 안 보이는 곳에 있는데 jsdom 테스트가 통과 | AC-6 E e2e: 끝 그림 · '동작 줄이기'에서 `closed-sign` `toBeVisible` | 기둥 팻말 첫 줄(⑨-1 · (다)) |
| 9-6 | 숫자 칸에 친 글이 화면 · 저장소 · 주소 · 요청 · 카드로 샘 | K7 묶음 1~5 · `only the number leaves` 단위 · e2e | 숫자만 `Number`로 바꿔 씀(`numberOf`) · 안내 문구는 고정 글자 |
| 10 | 숫자 오르기를 화면 읽기가 하나씩 읽음 | AC-6 D (단위: `appraised-price`가 처음부터 끝 값 · 라이브 영역 아님) | 보이는 숫자 `aria-hidden` |
| 11 | 숫자가 끝 값에 못 닿음(탭 숨김 · 취소) | AC-6 D '마지막 값 = mochi' | `finished`에서 끝 값 · 동작 줄이기는 처음부터 |
| 12 | ④ + 남은 문구가 548을 넘음 | CAREER-35 AC-11 e2e | A4 예산 · 넘으면 멈춤 |
| 13 | ⑥ 9999에서 값 칸이 넘침 · 줄바꿈 | AC-4 `scrollWidth` · 줄 수 | 값 한 줄 24px · `white-space: nowrap` |
| 14 | 카드 대체 글꼴에서 `한정선 9999개`가 칸을 넘음 | AC-4 카드 폭(글꼴 정상), 대체 글꼴은 안 잼 | `measureText`로 6px씩 줄임 |
| 15 | 시안 코드를 옮기다 칸 하나 틀림 | AC-5 시안 맞대기(목록 `toEqual`) | 손으로 고치지 않고 옮김 |
| 16 | 눈 덮개가 다른 표정 눈과 안 맞아 얼룩 | H0 화면 찍기 | `base` · `happy`에서만 |
| 17 | 테스트 옮기다 확인이 사라짐 | T10 확인 명령 | 짝 표 |
| 18 | iOS에서 `:active` 안 켜짐(F) | AC-11 (a) 눈 | 안 되면 PR에 적고 알림(AC ✘ 아님 — 자동 검사는 chromium) |
| 19 | 첫 화면 무게가 1,000,000B 넘음 | AC-9 측정 | 그림은 코드(이미지 파일 없음) — 몇 KB 늘 것으로 어림 |
| 건너뜀 | Android · 다른 iPhone(spec 범위 밖) · 대체 글꼴에서 ⑥ 폭(글꼴은 같은 출처 · swap) · 숫자 칸 한글 조합 입력(숫자 자판에서는 안 생기고, 생겨도 '틀린 글자'로 꺼짐) · 시안 Scene 코드가 바뀌는 경우(그때 맞대기가 빨강으로 알림) | — | 일부러 건너뜀 |

## 바뀌는 파일
| 파일 | 하는 일 | 누가 | AC |
|---|---|---|---|
| `app/src/options.js` | `MY_PRICE` · `priceIdOf` · `PRICE_TEXT` · `STEPS` · `THINKING_LINE` · `NOTICE_*` · `OFF_DUTY_TEXT` · `CARD`. `PRICES` 지움 | frontend-dev | 1~3 · 5 · 7 · 8 |
| `app/src/App.jsx` | `mine` 상태 · 숫자 칸 · ⑥ 한정선 · `result.mine` · 장면 `mode` | frontend-dev | 1~3 · 5 · 6 · 8 |
| `app/src/Shop.jsx` | 트럭 장면 · 표식 · 셔터 · 팻말 | frontend-dev | 5 · 6 · 8 |
| `app/src/truck.js` (새로) | 시안 `Scene`의 칸 목록 | frontend-dev | 5 |
| `app/src/Pixel.jsx` | 이어진 조각 path | frontend-dev | 5 |
| `app/src/countUp.js` (새로) | `useCountUp` | frontend-dev | 6 |
| `app/src/shareCard.js` · `ShareRow.jsx` | 전당표 · `mine` 인자 | frontend-dev | 4 · 7 |
| `app/src/shop.css` | 트럭 · 숫자 칸 · 움직임(`transform` 없음) · 기둥 팻말 · 375 예산. 옛 `.closed`(`rotate`) 지움 | frontend-dev | 1 · 4~6 · 8 |
| `app/tests/mockup-v3.js` (새로) | 시안 코드 읽기(돕는 함수, `expect` 없음) | test-writer | 5 |
| `app/tests/PriceInput.test.jsx` · `PriceQuery.test.js` · `PawnReveal.test.jsx` · `PawnScene.test.jsx` · `OldUnit.test.js` (새로) | AC-1 · 2 · 3 · 5 · 8 | test-writer | — |
| `e2e/pawn-request.spec.js` · `pawn-fit.spec.js` · `pawn-scene.spec.js` · `pawn-motion.spec.js` (새로) · `e2e/share-card.spec.js`(끝에 새 테스트만) | AC-2 · 4 · 5 · 6 · 7 | test-writer | — |
| 이미 있는 테스트 · 돕는 함수 | A6 옮기기 | test-writer | 10 |
| `contracts/appraise.md` | C0 · C1 · C2 (이미 적음) | architect · 사용자 승인 | 10 |
| `docs/runbook/배포.md` | §6-2 · §8 퇴근 글자 | release-ops | — |

- 건드리지 않는 것: `api/` · `infra/` · `appraise.js` · `photo.js` · `pixels.js` · `main.jsx` · `index.html` · `App.test.jsx` · `appraise.test.js` · `photo.test.js` · `FontBuild.test.js` · `e2e/playwright.config.js` · `photo-fixtures.js` · `guard-8787.js` · `vite.config.js` · `eslint.config.js` · `mockup-v3/` · ADR · `pipeline.config.json` · CLAUDE.md
- **새 의존성: 없음.**
- **확인 못 함**: app ESLint가 `app/tests/PriceQuery.test.js`의 `../../api/src/input.js` import를 막는지(설정을 안 읽음). 막으면 test-writer는 lint 설정을 고치지 말고 멈춘다.

## AC ↔ 작업
| AC | 빨강 | 초록 | 그 밖 |
|---|---|---|---|
| AC-1 | T2 | F1 | — |
| AC-2 | T3 | F1 | — |
| AC-3 | T4 | F2 | — |
| AC-4 | T5 · T9(카드) | F2 · F6 · F5 | — |
| AC-5 | T6 · T7 | F3 | — |
| AC-6 | T8 | F4 | — |
| AC-7 | T9 | F5 | — |
| AC-8 | T6 | F3 | contracts C2 |
| AC-9 | — | F6 (측정) | — |
| AC-10 | T10 | F1~F6 | P1 |
| AC-11 | — | — | H1 (사람 · 머지 · 배포 뒤) |

## 사용자 답 (11/10 plan 검토)
1. A1 — ADR 0009 · 0010 둘 다 그대로(추천안).
2. '시안과 다르게 한 곳' ⑨ — 퇴근 때 트럭이 시안처럼 떠난다(셔터 E → 한 번 떠남 → 빈 길 + 기둥 팻말 `내일 또 와요`, 연기는 떠날 때만, '동작 줄이기'면 처음부터 빈 길 + 팻말). 나머지 13줄 받음. → A2 '퇴근 E' · 표식 · 움직임 표 · C2 · ⑨-1(`closed-sign` 자리 — architect가 (다)로 정함, 승인 1에서 봄)
3. `PRICE_TEXT.empty` = `한정선 몇 개에 넘길지 불러 주세요. 값만 궁금하면 ‘안 팔아’도 돼요.` · `PRICE_TEXT.bad` 그대로.
4. K7 · K8 — '보는 자리 옮기기'는 받지 않음, 지금 뜻을 지키는 길로 다시 짬 → A6 'K7 — 다시 짬' · 'K8 — 다시 짬'(승인 3 · 4)
5. '사용자가 정할 것'에는 남은 것만 둠.
