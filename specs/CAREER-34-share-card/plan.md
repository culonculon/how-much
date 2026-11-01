[CAREER-34](https://culonculon98.atlassian.net/browse/CAREER-34) · spec: [spec.md](spec.md) · 작업: [tasks.md](tasks.md) · 결정: [ADR-0010](../../docs/adr/0010-share-card-drawn-without-value.md)(제안) · 약속: contracts 바꾸지 않음

상태: 승인됨 (2026-11-01)
<!-- 이 글을 쓴 세션은 코드 · 빌드 · 브라우저 · 네트워크를 돌리지 않았다(읽기와 grep만). '계산값' · '확인 못 함'은 그 뜻이다. Safari 동작은 알고 있는 지식이고 기기에서 본 적이 없다. -->

## 한 줄
⑥에 올 때 브라우저 캔버스로 1080×1350 JPEG 카드를 **아저씨 값을 받지 않는 함수**로 미리 그려 두고, '공유'를 누르면 기다리는 일 없이 바로 공유 창에 넘긴다. 버튼은 '다른 물건 꺼내기'와 나란히 둬 세로를 쓰지 않는다. 새 라이브러리 · `api/` · `infra/` · `contracts/` · Playwright 설정 변경은 없다.

## 고른 구조 — 왜 이 모양인가
| 뼈대 | 지켜 주는 것 | 왜 코드 검사가 아니라 구조인가 |
|---|---|---|
| `makeCard(photo, myPrice)` — 인자에 `mochi` · `line`이 없다 | AC-3 · 가정 1 | 값이 함수에 들어오지 않으니 그릴 수 없다 |
| 카드는 `ShareRow` 컴포넌트의 상태이고, 이 컴포넌트는 ⑥에서만 그려진다 | AC-1 · AC-4 · 앞 감정이 남지 않음 | ⑥을 떠나면 사라지고 ⑥에 오면 새로 만들어진다. 지우는 코드가 없다 |
| 그리는 동안 버튼이 꺼져 있고, 눌림 처리 안에 `await`가 없다 | AC-2 · AC-7 ③ · AC-9 (a) | 눌렀다면 `File`이 이미 있으니 `share`가 늘 클릭 안에서 불린다. 누른 뒤 기다렸다가 뒤늦게 공유 창을 띄우는 길 자체가 없다 |

## A1 — 그림 만드는 법
### 형식 · 크기
| 후보 | 장단 | |
|---|---|---|
| **JPEG q=0.92, 1080×1350** | 카드 대부분이 사진이라 작다(어림 150~400KB). 인코딩이 빠르다. 도트 · 글자 둘레에 번짐이 조금 생길 수 있다. `jpegInfo` 도우미가 이미 있어 AC-5가 쉽다 | **고름** |
| PNG, 같은 크기 | 도트 · 글자가 가장 또렷하다. 사진 때문에 어림 1~2.5MB이고, iPhone에서 인코딩이 더 오래 걸려 버튼이 늦게 켜진다. 카톡이 어차피 다시 압축할 가능성이 크다(확인 못 함) | 버림. H0에서 번짐이 거슬리면 상수 두 개(형식 · 파일 이름)만 바꾼다 |
| 화면 크기 × `devicePixelRatio` | 기기마다 크기가 달라 AC-3 · AC-4가 흔들린다 | 버림 |

- 1080×1350(4:5): 세로 사진이 많은 휴대폰 화면에서 크게 보이고, 40칸 도트(×8)와 12px 글꼴 격자(×3 · ×6)가 모두 정수배로 떨어진다.
- `devicePixelRatio`를 쓰지 않는다. 캔버스는 DOM에 붙이지 않는다(AC-8 '화면 읽기에 새 글자 없음').
- 파일 이름은 늘 `how-much-card.jpg`. 원본 파일 이름 · 날짜 · 값이 들어가지 않는다(AC-3).

### 사진을 얻는 법
| 후보 | 왜 | |
|---|---|---|
| **`shareCard.js`가 `preparePhoto(photo)`를 다시 부른다** | `photo.js`는 입력 `File` → 다시 그린 JPEG의 순수 함수다. `appraise` 모양 · 보내는 길이 그대로이고, `appraise.js`를 import하지 않으므로 contracts §1도 그대로다. 화면은 `File`을 넘기기만 하므로 §2 '줄이기 · 지우기는 화면 몫이 아님'도 그대로다. 대가는 사진을 한 번 더 다시 그리는 것(iPhone 계산 약간) | **고름** |
| `appraise`가 준비한 JPEG를 함께 돌려줌 | contracts §4 '다른 키는 없다'를 깬다(가정 2) | 버림 |
| 어댑터가 마지막 JPEG를 기억하고 꺼내는 함수를 더 내보냄 | §1 '내보내기 하나'를 깨고 숨은 상태가 생겨 앞 감정 사진이 남을 위험이 있다(AC-4) | 버림 |
| App이 먼저 준비해 어댑터에 넘김 | ADR-0003 대안 4에서 이미 버렸다. §2 입력이 바뀐다 | 버림 |
| 원본 `File` · `previewUrl`을 바로 그림 | Jira 전제 · AC-5 reviewer 항목에 어긋난다 | 버림 |

- 흐름: `preparePhoto(photo)` → `createImageBitmap(jpeg)` → 카드 캔버스. **`shareCard.js`의 `createImageBitmap` 인자는 `jpeg` 하나뿐**이다(reviewer가 diff로 본다).
- ADR-0003의 '기기를 떠나는 것은 언제나 … 하나다'는 **감정으로 나가는 사진**의 약속이다. 사용자가 공유로 내보내는 카드는 새로운 길이라 [ADR-0010](../../docs/adr/0010-share-card-drawn-without-value.md)에 적는다. ADR-0003은 대체하지 않는다.

### 언제 그리나
| 후보 | 장단 | |
|---|---|---|
| **⑥ 도착 때 (`ShareRow` 처음 그려진 뒤)** | 눌렀을 때 이미 끝나 있다. 실패 · 퇴근에서는 일을 하지 않는다. 어댑터의 다시 그리기가 끝난 뒤라 큰 비트맵이 겹치지 않는다. 값을 먼저 그린 다음 시작하므로 값 공개를 막지 않는다 | **고름** |
| '감정 받기!' 누를 때 | ⑥에 오면 벌써 끝나 있다. 대신 어댑터와 동시에 큰 사진을 두 번 풀어 메모리가 겹치고, 실패하면 헛일이다 | 버림 |
| '공유' 누른 뒤 | 쉽지만 Safari가 공유를 거절할 수 있다(spec A1) | 버림 |

- **그리는 동안**: 버튼은 `disabled`(이미 있는 `.btn:disabled`). 그림을 다 그리면 켜진다. 사용자가 값을 읽는 사이에 끝날 것으로 보며, 걸리는 시간은 H1에서 눈으로 본다(확인 못 함).
- **글꼴**: 그리기 전에 `document.fonts.load(font)`를 **최대 1,500ms** 기다린다. ⑥까지 왔으면 보통 이미 받았으므로 바로 끝나고 새 요청은 없다(화면의 `@font-face`와 같은 글꼴). 실패하거나 늦으면 대체 글꼴로 그린다(AC-7 ③). 늦은 경우 나중에 글꼴이 와도 다시 그리지 않는다(드문 경우 · 값은 안 드러남 · 코드만 는다).

### 카드 구성 (좌표는 캔버스 픽셀 · H0에서 값만 고칠 수 있음)
| 항목 | 자리 | 그리는 법 |
|---|---|---|
| 바탕 | 전체 | `#b07a48` 단색 (spec U1) |
| 사진 틀 | x48 y48 w984 h792 | `#3b2416` 칠 → 안쪽 x60 y60 w960 h768 `#2b1a0e` |
| 사진 | 틀 안 가운데 | **잘라 내지 않는다**(비율 유지, 긴 쪽 맞춤, 좌표 `Math.round`). 세로 3:4 사진은 576×768 |
| 웃는 아저씨 | x48 y872, 320×320 | `U.happy` · `PU`를 칸당 8px `fillRect`. `.` 칸과 팔레트에 없는 글자는 건너뜀(`Pixel.jsx`와 같은 규칙) |
| 값 창 | x392 y872 w640 h320 | `#3b2416` 12px 테두리 · `#fff4e0` 안쪽(`.win` 색) |
| `아저씨 감정가` | 값 창 가운데, 밑줄 y940 | 36px · `#3b2416` |
| `🍡 × ?` | 밑줄 y1040 | 72px · `#a3542a` |
| `내가 부른 값 🍡 × 10` / `내가 부른 값 안 팔아` | 밑줄 y1130 | 36px · `#3b2416` |
| 사이트 주소 | 가운데, 밑줄 y1290 | 36px · `#2b1a0e`. 글자는 `location.host`(배포에서는 `d2x05xzjhjvp9j.cloudfront.net`, 주소가 바뀌면 따라감) |

### 도트 · 글꼴 · 이모지가 또렷한가
- **도트**: 정수 좌표 · 정수 칸 `fillRect`라 번지지 않는다. SVG를 옮기지 않는다(`pixels.js` 지도에서 바로). 새 파일 · 그림 없음.
- **갈무리**: 캔버스 글자는 안티앨리어싱을 끌 수 없지만, 글꼴 격자의 정수배 크기(36 · 72 = 12의 3 · 6배)와 **정수 좌표**(`Math.round(cx - width / 2)`, `textAlign` 기본 `left`)면 칸 경계가 픽셀에 맞아 거의 또렷할 것으로 본다. Galmuri11 격자가 12라는 것은 기억이며 묶음에서 확인하지 못했다(CAREER-35 plan A5와 같음).
- **이모지**: `🍡`는 시스템 글꼴로 그린다. iOS는 컬러 이모지, CI는 없으면 빈 네모일 수 있다. 바이트 비교는 같은 브라우저 안이라 영향이 없다.
- **판정**: 자동 검사로 '또렷함'을 재지 않는다. H0(Chromium 카드 파일)와 AC-9 (b)(iPhone · 카톡)에서 눈으로 본다. 거슬리면 H0에서 값만 바꾼다.

### 무게
- 새 코드 어림 3~5KB(raw). 그림 · 글꼴 · 의존성이 늘지 않고 `pixels.js`는 이미 들어 있다.
- **752,338B + 어림 5KB ≈ 757,000B — 1,000,000B 안**(계산값). F5에서 재고, 넘으면 멈춘다.
- **동적 import를 쓰지 않는다**(⑥에서 파일 요청이 생겨 AC-8 '요청 0' 위반).

### 새 라이브러리: 없음 (사용자 결정 불필요)
| 후보 | 왜 아님 |
|---|---|
| html2canvas · html-to-image | DOM을 찍는 도구다. 카드는 ⑥과 다른 모양이고 값이 든 DOM을 찍으면 가정 1에 어긋난다. 크기도 수십~수백 KB(기억, 확인 못 함) |
| 캔버스 직접 | 브라우저 기본 기능, 코드 약 100줄(CLAUDE.md §8 단계 3) — **고름** |

### 코드 모양 (frontend-dev는 이대로 쓴다, 이름 고정)
```js
// app/src/shareCard.js — mochi and line never come in: the card cannot show them (ADR-0010).
export async function makeCard(photo, myPrice) { /* fontReady → preparePhoto → createImageBitmap(jpeg) → draw → toBlob */
  // null blob -> throw. Returns new File([blob], CARD.fileName, { type: 'image/jpeg' })
}

async function fontReady() {
  let timer
  const late = new Promise((done) => { timer = setTimeout(done, FONT_WAIT_MS) })
  try {
    await Promise.race([document.fonts?.load(font(36)), late])
  } catch {
    // font failed: draw with the fallback (AC-7 ③)
  } finally {
    clearTimeout(timer)
  }
}

export function saveCard(file) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
```
```jsx
// app/src/ShareRow.jsx — mounted only on the reveal, so leaving it forgets the card (AC-4).
export default function ShareRow({ photo, myPrice, children }) {
  const [card, setCard] = useState(null) // null = drawing | File | 'failed'
  const [saving, setSaving] = useState(false) // true: the button saves instead of sharing
  const [note, setNote] = useState(null)
  const sheetOpen = useRef(false)

  useEffect(() => {
    let alive = true
    makeCard(photo, myPrice).then(
      (file) => alive && setCard(file),
      (e) => {
        console.warn('card not drawn:', e?.name) // the name only, never the photo (contracts §6)
        if (alive) setCard('failed')
      },
    )
    return () => { alive = false }
  }, [photo, myPrice])

  // No await before share: it must run inside the click (Safari may refuse otherwise).
  function press() {
    if (sheetOpen.current) return
    if (card === 'failed') return setNote(SHARE_TEXT.notDrawn)
    const data = { files: [card] }
    if (saving || !navigator.share || !navigator.canShare?.(data)) {
      saveCard(card)
      setSaving(true)
      setNote(null)
      return
    }
    sheetOpen.current = true
    navigator.share(data)
      .catch((e) => {
        if (e.name === 'AbortError') return // cancelled is not a failure
        setSaving(true) // a click ended: a second press can download
        setNote(SHARE_TEXT.useSave)
      })
      .finally(() => { sheetOpen.current = false })
  }

  return (
    <>
      <div className="btn-row">
        <button type="button" className="btn" data-testid="share-button" disabled={card === null} onClick={press}>
          {saving ? '저장' : '공유'}
        </button>
        {children}
      </div>
      {note && (
        <div className="toast">
          <span aria-hidden="true">⚠</span> <p role="alert" data-testid="share-note">{note}</p>
        </div>
      )}
    </>
  )
}
```
- `App.jsx`는 249행만 바꾼다: `{showCard && <ShareRow photo={photo} myPrice={myPrice}><button type="button" className="btn" onClick={another}>다른 물건 꺼내기</button></ShareRow>}`. `result`를 넘기지 않는다.
- `.btn-row { display: flex; gap: 10px } .btn-row .btn { flex: 1 1 0; width: auto; min-width: 0 }`을 `shop.css`에 더한다.
- `options.js`에 더함: `CARD = { fileName: 'how-much-card.jpg', capUncle: '아저씨 감정가', hidden: '🍡 × ?', capMine: '내가 부른 값' }` · `SHARE_TEXT`(A2 문구).

## A2 — 저장으로 잇기 · 글자 · 다시 누름 · 문구
| 경우 | 누르면 | 그 뒤 버튼 글자 |
|---|---|---|
| 카드 그리는 중 | 꺼져 있어 못 누름 | '공유' |
| `share`와 `canShare({files})`가 됨 | 바로 `share` | '공유' 그대로 |
| AC-6 ①②③ `share` 없음 · `canShare` 없음 · `false` | **같은 클릭에서 바로 내려받기**(동작이 살아 있음) | '저장' |
| AC-6 ④⑤ `NotAllowedError` · 그 밖의 오류 | 저절로 내려받지 않고 **문구 + 글자를 '저장'으로** → 한 번 더 누르면 내려받기 | '저장' |
| AC-7 ① `AbortError` | 아무 일 없음. 다시 누르면 다시 `share` | '공유' 그대로 |
| AC-7 ② 그리기 실패 | 문구만 | '공유' 그대로 |

- **글자**: 처음에는 늘 '공유'로 둔다. 공유 창 없는 브라우저(주로 데스크톱)에서 첫 '공유'가 내려받기가 되는 대신 분기가 줄고, jsdom에서도 AC-1 이름이 그대로 선다. 처음부터 '저장'으로 나누면 `canShare`에 파일을 넘겨야 해서 글자가 그림이 끝난 뒤 바뀌고, AC-1 테스트도 공유를 흉내 내야 한다. 버린다.
- **자동 내려받기를 안 하는 이유**: 거부된 뒤에는 클릭이 끝나 있어 Safari에서 막히거나 말없이 사라질 수 있다(확인 못 함). 말없는 실패보다 한 번 더 누르는 쪽을 고른다(spec A2).
- **다시 누름**: `sheetOpen` ref. `disabled`로 막지 않는다. 눌린 버튼을 끄면 초점이 `body`로 떨어질 수 있어(AC-8 초점) ref로 막고 버튼은 켜 둔다. 글자가 바뀌어도 같은 요소라 초점이 남는다.
- **⑥을 떠나면**: 카드 그리기는 `alive`로 버린다. 누른 뒤 기다리는 일이 없으므로 '뒤늦게 공유 창이 뜨는' 길은 없다.
- **문구는 한 줄(약 25자 이하)**이어야 A3 세로 예산에 들어간다. `data-testid="share-note"`, `appraise-error`를 쓰지 않는다. 후보는 [사용자가 정할 것](#사용자가-정할-것) 2.

## A3 — ⑥ 자리
`shop.css`를 읽고 다시 계산한 값(459)이 CAREER-35 plan A5의 값(489)보다 30 작다. 왜 다른지는 재 보지 못했다. **어느 쪽이든 결론은 같으므로** 둘 다 적는다.

| 배치 (30자 대사, 548 기준 · 계산값, 재지 않음) | 마지막 요소 아래 끝: `shop.css` 계산 / plan A5 기준 | 문구 한 줄(+46)까지 | |
|---|---|---|---|
| 지금 ⑥ | 459 / 489 | — | — |
| **나란히(높이 48 그대로)** | **459 / 489** | **505 / 535 — 안 넘음** | **고름** |
| 쌓기(+58) | 517 / 547 | 563 / 593 — **넘음** | 버림 |
| 값 창 · 장면 줄이기 | 줄어드는 만큼 | — | 버림. spec '안 할 것'(값 창 · 표정 그대로), CAREER-35 AC 영향 |

- 버튼 폭은 약 170px씩이다. '다른 물건 꺼내기'는 16px로 어림 120px이라 한 줄에 들어간다(계산값). 높이 48 그대로(A5 ≥44).
- 읽는 차례 · 왼쪽부터 '공유', '다른 물건 꺼내기'. 초점은 지금처럼 ⑥ 도착 때 '감정 결과' 영역이고, 그림이 끝나도 옮기지 않는다.
- 문구는 두 버튼 아래. `.toast`를 그대로 쓴다.
- **시안과 달라지는 점(사용자에게 보임, tasks H0)**: 전체 폭 버튼 하나가 반 폭 두 개로 바뀐다. 통과 기준은 AC-8 '자리' e2e다.

## A4 — 바이트 비교 · WebKit · 테스트에서 흉내 내기
- **바이트 같음은 믿을 만하다고 본다**(돌려 보지 않음). 같은 브라우저 · 같은 입력의 캔버스 그리기와 JPEG 인코딩에 시간 · 난수가 없고, 카드는 뷰포트 · `devicePixelRatio`를 쓰지 않는다. 글꼴은 코드가 기다리고(`fontReady`), 테스트도 `document.fonts.ready` 뒤에 비교한다. 언제나 같은 그림을 내는 가짜 통과는 AC-4 '다르다' · AC-10이 잡는다.
- **흔들리면**: 느슨하게 고치지 말고 멈춘 뒤 알린다. 대안은 `createImageBitmap` → `getImageData` 픽셀 비교이고 '글자를 읽지 않고 값의 영향이 없음을 본다'는 뜻은 같다.
- **WebKit은 넣지 않는다.** Playwright WebKit은 iPhone Safari의 공유 창을 재현하지 못하고, `navigator.share` 흉내는 어차피 가짜이며, 설정을 고쳐도 AC-9가 보는 것을 대신하지 못한다. **`e2e/playwright.config.js`는 바꿀 일이 없다**(크기는 `test.use`, 내려받기는 기본값으로 됨). 바꿔야 한다는 결론이 나오면 test-writer · frontend-dev는 훅에 막히므로, 사유를 PR에 적고 사용자가 고친다.

### 공유 창 흉내 (`e2e/share-card.spec.js` 안, `goto` 전 `page.addInitScript`)
| 함정 | 정한 것 |
|---|---|
| **mac Chromium에는 `navigator.share`가 있고 Linux CI에는 없다** | `Navigator.prototype`의 `share` · `canShare`를 먼저 지우고 경우별로 다시 정의한다. '없음' 경우도 지워서 만든다 |
| **바로 끝나는 가짜로는 '2번 눌러도 1번'을 볼 수 없다** | 진짜 공유 창은 닫힐 때까지 끝나지 않는다. AC-2 잇달아 누르기는 **`hold` 모드(끝나지 않는 Promise)** 로 시험한다 |
| **`isActive`는 Chromium에서 몇 초간 `true`로 남아 '누른 뒤 그림' 회귀를 놓친다** | `toBlob` 호출 수를 감싸 세고, 누르기 직전 값과 `share` 때 값이 같은지 함께 본다(눌렀을 때 그리지 않음) |
| **`toBlob`을 처음부터 `null`로 바꾸면 어댑터의 `preparePhoto`도 실패해 ⑥에 못 간다**(AC-7 ②) | `routeQueue(['hold', ok])`로 요청을 붙잡고, 요청이 온 뒤(= 어댑터 다시 그리기 끝) `toBlob`을 바꾸고 나서 푼다 |
| Playwright 요청 이벤트에 `blob:`이 잡힐 수 있다 | AC-8 '요청'은 CAREER-35 AC-10처럼 `blob:` · `data:`를 뺀다(네트워크가 아님) |
| 공유 파일 읽기 | 가짜 `share`가 **동기로** `Object.keys` · `isActive` · `toBlob` 수를 먼저 기록한 뒤 파일을 base64로 읽고 `createImageBitmap`으로 가로 · 세로를 잰다 |

## 신뢰 경계
`strict_review_areas`(guard)를 건드리지 않으므로 절을 두지 않는다. AI 호출 길은 그대로이고 공유 · 저장은 네트워크를 쓰지 않는다. 카드가 기기를 떠나는 것은 사용자가 공유 창에서 직접 보낼 때뿐이다. 받는 입력은 이미 고른 사진과 `PRICES`의 id이며 서버 `line`은 카드에 들어가지 않는다.

## 실패 시나리오 (premortem)
| # | 언제 깨지나 | 어떻게 알아채나 | 막는 것 |
|---|---|---|---|
| 1 | 누군가 값을 카드 인자에 더하거나 ⑥ DOM을 찍음 | AC-3 빨강 · AC-10이 고의로 확인 | 인자에 값 없음 |
| 2 | 눌림 처리에 `await`가 들어가 iPhone만 `NotAllowedError` | `toBlob` 수 확인(그리기만) · AC-9 (a) · ④ 문구 | 미리 그림 · 코드 모양 |
| 3 | 앞 감정 사진 · 내 값이 카드에 남음 | AC-4 | 컴포넌트가 ⑥에서만 존재 |
| 4 | 원본 `File`을 그려 위치 정보 · 큰 파일이 나감 | AC-5 · reviewer diff | 캔버스는 메타데이터를 옮기지 않음 · `createImageBitmap(jpeg)` |
| 5 | 글꼴이 늦거나 실패해 버튼이 영영 안 켜짐 | AC-7 ③ · 붙잡기 경우 | 1,500ms 상한 |
| 6 | iPhone 메모리 부족으로 그리기 실패 · `toBlob` `null` | 누르면 문구, 값 · '다른 물건' 그대로(AC-7 ②) | ⑥은 카드와 독립. 어댑터와 동시에 돌지 않음 |
| 7 | iOS `share` Promise가 끝나지 않아 다음 누름이 먹지 않음(확인 못 함) | H1 '돌아와 다시 누름' | **일부러 안 막음**: ⑥이 안 망가지고 코드만 는다. H1에서 보이면 D2 |
| 8 | 그리는 시간이 길어 버튼이 오래 흐림 | H1 눈 | 값을 먼저 보여 줌. 자동 기준 없음(기기 값은 CI에 없음) |
| 9 | 카톡 압축으로 글자 · 도트가 뭉개짐 | AC-9 (b) | 크게 그림. 안 되면 사용자에게 알림 |
| 10 | 새 버튼이 CAREER-35 테스트를 깸 | `checks.app`. ⑥의 버튼 수를 세는 테스트는 없음(grep) | 기존 테스트 안 고침 |
| 11 | jsdom에 캔버스가 없어 단위 테스트가 터짐 | `unit` | `makeCard` 실패는 `'failed'`로 받음. 경고 줄(`card not drawn` · `act`)이 늘 뿐이다 |
| 12 | 문구가 두 줄이 되어 548을 넘음 | AC-8 '자리' | 약 25자 이하 |

- **건너뜀(일부러)**: 사용자가 많이 눌러도 비용 없음(서버 호출 0) · 늦게 온 글꼴로 다시 그리기 · 화면 쪽 실패 집계(요청 0 약속 · 서버에 안 보임, 사용자에게는 문구로 보임, 원인은 Safari 인스펙터 `card not drawn`) · 카드 파일 크기 상한(사진이 1024px로 묶여 커질 수 없고 넘어도 막을 곳이 없음) · 태블릿 · 넓은 화면 배치 · Android(spec 범위 밖).

## 바뀌는 파일
| 파일 | 하는 일 | 누가 | AC |
|---|---|---|---|
| `app/src/shareCard.js` (새로) | `makeCard` · `saveCard` | frontend-dev | 2~7 |
| `app/src/ShareRow.jsx` (새로) | 버튼 · 문구 · 눌림 처리 | frontend-dev | 1·2·6·7·8 |
| `app/src/App.jsx` | 249행 + import | frontend-dev | 1·8 |
| `app/src/options.js` | `CARD` · `SHARE_TEXT` | frontend-dev | 2·7 |
| `app/src/shop.css` | `.btn-row` | frontend-dev | 8 |
| `app/tests/ShareCard.test.jsx` (새로) | AC-1 | test-writer | 1 |
| `e2e/share-card.spec.js` (새로) | AC-2~8 · 카드 찍기 | test-writer | 2~8 |
| `docs/adr/0010-…` | 상태 | architect · 사용자 승인 | — |

- 건드리지 않는 것: `appraise.js` · `photo.js` · `Pixel.jsx` · `pixels.js` · `Shop.jsx` · `api/` · `infra/` · `contracts/` · `e2e/playwright.config.js` · `e2e/shop-steps.js` · `app/tests/shop-steps.jsx` · 이미 있는 테스트 전부 · `app/package.json`
- **새 의존성: 없음.**

## 사용자가 정할 것
### 사용자 답 (2026-11-01) — 1~4 모두 추천안
1. plan · tasks · ADR-0010 승인(contracts 안 바꿈)
2. 문구: 그림 실패(AC-7 ②) `공유 그림을 만들지 못했어요.` · 공유 거부 뒤(AC-6 ④⑤) `공유 창을 열지 못했어요. 저장을 눌러 주세요.` (⑥에 머문다로 읽음 — 사용자 그대로 받아들임)
3. 버튼 첫 글자는 '공유'로 고정(D3은 하지 않음)
4. '공유'와 '다른 물건 꺼내기' 나란히 반 폭(H0 화면 보고 다시 볼 수 있음)

1. 이 plan · tasks · **ADR-0010**(제안 → 확정) 승인. contracts는 바꾸지 않으므로 '바꿀 것 없음'을 승인한다.
2. **문구 둘** (`options.js` `SHARE_TEXT`, 한 줄 이내)
   - 그림 실패(AC-7 ②): **A `공유 그림을 만들지 못했어요.` — 추천**(사실만. 다시 눌러도 낫지 않으므로 행동을 권하지 않음) / B `카드를 그리지 못했어요. 다른 물건으로 해 보세요.` / C `그림이 안 그려지네. 미안하네.`(아저씨 말투 — 말투는 아직 안 정함)
   - 공유 거부 뒤(AC-6 ④⑤): **A `공유 창을 열지 못했어요. 저장을 눌러 주세요.` — 추천** / B 문구 없이 버튼 글자만 '저장'으로(더 작지만 말없이 글자만 바뀌고 VoiceOver가 못 알릴 수 있음)
3. **첫 글자 '공유' 고정**(A2): 공유 창 없는 브라우저에서 처음 누르면 내려받아지고, 그 뒤 글자가 '저장'으로 바뀐다. **그대로(추천)** / 처음부터 나눔(분기 · 테스트가 는다)
4. **버튼 나란히**(A3): **나란히(추천)** — 시안의 전체 폭 버튼이 반 폭 두 개가 된다. 지금 정하지 않아도 되고 H0 화면을 보고 말해도 된다.

사용자가 정할 필요 없는 것: 새 라이브러리(없음) · Playwright 설정(안 바꿈) · WebKit(안 넣음) · 카드 형식(JPEG, H0에서 번짐이 거슬리면 PNG로 바꿈).

## spec에 대한 메모 (spec을 고칠 필요는 없음 — 다르게 읽었다면 알려 주세요)
- **AC-6 '화면은 ⑥ 그대로'**: ④⑤에 문구를 띄우는 것을 '⑥에 머문다'로 읽었다. 값 창 · 버튼 · 표정은 그대로다. 문구를 원치 않으면 정할 것 2 B.
- **AC-8 초점 "'공유' 버튼에 남는다"**: 저장 뒤에는 같은 버튼의 글자가 '저장'이다. 테스트는 `data-testid="share-button"`으로 본다.
- **AC-8 '요청'**: `blob:` · `data:`는 요청으로 세지 않는다.
- **테스트 표 밖 추가**: AC-7에 '글꼴을 붙잡은 경우' 한 건(느린 것이 실패보다 까다로움), `CAREER-34 H0 shots` 한 건(눈으로 볼 카드 파일). 표의 이름은 그대로다.

## AC ↔ 작업
| AC | 빨강 | 초록 | 그 밖 |
|---|---|---|---|
| AC-1 | T1 | F1 | — |
| AC-2 | T2 | F2 | — |
| AC-3 | T3 | F2 | P1(고의로 고쳐 보기) |
| AC-4 | T4 | F2 | — |
| AC-5 | T5 | F2 | reviewer diff |
| AC-6 | T6 | F3 | — |
| AC-7 | T7 | F4 | U1(문구) |
| AC-8 | T8 | F5 | — |
| AC-9 | — | — | H1 (사람 · 머지 · 배포 뒤) |
| AC-10 | — | — | P1 |
| 눈 확인(A1 또렷함 · A3 자리) | T9 | — | H0 |
