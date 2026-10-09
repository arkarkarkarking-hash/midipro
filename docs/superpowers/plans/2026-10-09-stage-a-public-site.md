# 단계 A: 공개 사이트 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 SPA를 걷어내고, 랙 하드웨어 디자인의 Astro 정적 사이트(8개 페이지, 곡별 페이지, 끊기지 않는 플레이어, SEO 일체)를 Cloudflare Workers의 `*.workers.dev` 미리보기 주소에 배포한다.

**Architecture:** Astro(`output: 'static'`)가 모든 공개 페이지를 HTML로 만든다. 같은 저장소의 작은 Worker(`worker/index.ts`)가 정적 자산을 서빙하고, 전화 버튼 클릭 집계 API와 미리보기 주소의 `noindex` 헤더만 처리한다. 음원은 R2 버킷에서 직접 재생하고, 곡 정보는 `src/data/*.json`이 원본이다.

**Tech Stack:** Node.js 22 LTS, Astro 5, TypeScript, Zod(Astro content collections), Vitest, Playwright, Wrangler 4, Cloudflare Workers + D1 + R2, satori + @resvg/resvg-js(OG 이미지), sharp(파비콘), opentype.js(로고 윤곽선), music-metadata + mpg123-decoder(음원 길이와 파형)

**Spec:** `docs/superpowers/specs/2026-10-09-midipro-site-redesign-design.md`

## Global Constraints

- 사이트 전체에서 "합격곡"이라는 단어를 쓰지 않는다. 곡은 "입시곡", 결과는 "입시 결과"다. 입시 결과와 곡을 서로 링크하지 않는다.
- 숫자 요약(학교 수, 합격 건수, 첫 합격 연도)을 어디에도 표시하지 않는다.
- "1등", "최고", "최초" 같은 최상급 표현을 쓰지 않는다.
- 메인 타이틀은 정확히 `곡으로 합격을<br>만드는 학원.`, 설명은 `미디·피아노·화성학·음향을 한 팀이 함께 가르치고, 매달 월말고사로 실력을 확인합니다. 그렇게 만든 입시곡을 그대로 공개합니다.`
- 슬로건(홈 하단): `빛나는 곳에서 연주하기보단 내가 연주하는 곳이 빛나게 되길`
- 학원 정보: 이름 `미디프로실용음악학원`, 주소 `충청남도 천안시 서북구 불당21로 65, 6층`, 전화 `041-558-3101`(`tel:0415583101`, JSON-LD는 `+82-41-558-3101`), 운영 평일 `13:00–22:00`, 토 `09:00–18:00`, 일요일·공휴일 휴무(대체공휴일 운영)
- 외부 링크: `https://blog.naver.com/midi-pro`, `https://www.instagram.com/midipro__/`, `https://www.youtube.com/@midipro_159sound`
- 색: 강조 그라데이션 `#5B7CFA → #8F63F0`(LED 선, 전원 LED, 진행 바, 재생 중 채널, 파형 재생 구간에만), 배경 `#111112`~`#1E1E21`, `theme-color` `#111112`. 발광(`box-shadow` 글로우) 금지.
- 글꼴: Pretendard(한글), IBM Plex Mono(숫자·라벨), 로고는 Jost 윤곽선 SVG. 모두 자체 호스팅(`public/fonts`), 외부 글꼴 CDN 금지.
- 아이콘: Tabler Icons만. 기존 `image/` 폴더의 파일은 어떤 것도 새 사이트에 쓰지 않는다. Apple 로고·아이콘·SF 글꼴 금지. 대학 로고 금지.
- 모서리 3px 이하(키캡·모듈), 나사 6px, 랙 귀 16px. 시각 기준은 `.superpowers/mockups/rack-v6.html`.
- 모바일 우선(375px 기준). 하단 고정: 1U 모듈 안의 [전화 상담](밝은 키캡) [오시는 길](어두운 키캡), 그 위 미니 플레이어.
- 모든 공개 URL은 영문 소문자와 하이픈. 대표 주소 `https://midipro.kr`.
- `audio/` 폴더는 삭제하지 않는다. 배포 대상에서만 뺀다.
- 수강료 금액을 표시하지 않는다("상담 시 안내").
- 개인정보를 받는 폼을 만들지 않는다. 전화 클릭 집계에는 날짜, 페이지 경로, 유입 호스트만 저장한다(IP, 쿠키 없음).

**설계서와 다른 점 하나:** 설계서는 전화 버튼 클릭을 Cloudflare Web Analytics로 센다고 했지만, Web Analytics는 사용자 정의 이벤트를 지원하지 않는다. 그래서 방문 통계는 Web Analytics로, 전화 클릭은 Worker + D1의 집계 테이블로 센다. 관리자 화면에서 보는 기능은 단계 B에서 만든다.

## Review Focus

1. **iPhone Safari에서 첫 재생**: 사용자가 탭하기 전에는 자동재생하지 않고, 탭 한 번에 바로 재생되며, 화면을 잠가도 계속 재생되고 잠금화면에 곡 제목이 떠야 한다. (Task 7 e2e + 수동 점검 Task 13)
2. **재생 중 페이지 이동**: 메뉴와 곡 링크로 다섯 번 이동해도 소리가 끊기지 않고 진행 바가 이어져야 한다. 브라우저 뒤로 가기도 같다. (Task 7 e2e)
3. **음원 로드 실패**(R2 주소 오류, 네트워크 끊김): 플레이어가 멈춘 채로 "재생할 수 없습니다"를 보여주고, 다음 곡으로 넘어가거나 무한 재시도하지 않아야 한다. (Task 6 단위 테스트)
4. **한글·특수문자 파일명**(`[24년 하반기 송캠프] 18.5(김민규,…) - burn up! (feat.신하영).mp3`, `We Don’t Give Up`의 굽은 따옴표, 이중 공백): 모든 곡이 겹치지 않는 영문 slug를 받고, 원래 한글 제목이 그대로 보존돼야 한다. (Task 3 단위 테스트)
5. **자바스크립트 없이 수집되는 HTML**: 네이버 Yeti처럼 JS를 실행하지 않는 수집기가 받는 HTML에 제목, 설명, 곡 목록, 학원 주소·전화가 모두 들어 있어야 한다. (Task 11 빌드 검사)

---

### Task 1: 개발 환경과 Astro 골격

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.nvmrc`(`22`), `src/pages/index.astro`(임시)
- Modify: `.gitignore`(`node_modules/`, `dist/`, `.wrangler/`, `.astro/` 추가), `.assetsignore` 삭제(Worker 자산 디렉터리가 `dist`로 바뀌므로 불필요)
- Delete: `index.html`, `css/`, `js/`, `image/`(로고 포함), 기존 `wrangler.jsonc`(Task 12에서 새로 작성). **`audio/`는 건드리지 않는다.**

- [ ] **Step 1: Node.js 22 LTS 설치 (Homebrew 없음, Intel Mac)**

nodejs.org 공식 `node-v22.*-darwin-x64.tar.gz`를 받아 `~/.local/node`에 풀고 `~/.zprofile`의 PATH에 `~/.local/node/bin`을 추가한다(관리자 권한 불필요).
Run: `node --version`
Expected: `v22.`로 시작

- [ ] **Step 2: 기존 사이트 파일 삭제**

Run: `git rm -r -q index.html css js image wrangler.jsonc .assetsignore && ls`
Expected: `audio  docs` 만 남음(숨김 파일 제외)

- [ ] **Step 3: Astro와 개발 의존성 설치**

`npm create astro@latest . -- --template minimal --typescript strict --no-git --install`, 이어서 `npm i -D vitest @playwright/test wrangler zod`.
`astro.config.mjs`: `site: 'https://midipro.kr'`, `output: 'static'`, `trailingSlash: 'never'`, `build.format: 'file'`.

- [ ] **Step 4: 빌드 확인**

Run: `npm run build && ls dist`
Expected: `index.html` 존재, 오류 없음

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: replace legacy SPA with Astro skeleton (audio kept)"
```

---

### Task 2: 콘텐츠 스키마와 학원·입시 결과·과정 데이터

**Files:**
- Create: `src/content.config.ts`, `src/data/site.json`, `src/data/results.json`, `src/data/courses.json`, `src/data/teachers.json`(빈 배열), `src/lib/content.ts`
- Test: `tests/unit/content.test.ts`

**Interfaces:**
- Produces:
  - `type Site = { name: string; address: string; phone: string; phoneE164: string; hours: { weekdays: string; saturday: string; closed: string }; links: { blog: string; instagram: string; youtube: string }; showResultYears: boolean; slogan: string; geo?: { lat: number; lng: number } }`
  - `type ResultSchool = { school: string; entries: { name: string; major: string; year: number }[] }` — `results.json`은 `ResultSchool[]`, 순서 = 표시 순서
  - `type Course = { id: 'hobby' | 'basic' | 'complete' | 'release-grad' | 'release-adult'; name: string; target: string; composition: string; role: string }`
  - `type Teacher = { name: string; subjects: string[]; bio: string; photo?: string }`
  - `src/lib/content.ts`: `getSite(): Site`, `getResults(): ResultSchool[]`, `getCourses(): Course[]`, `getTeachers(): Teacher[]` — 각 JSON을 Zod로 검증해 반환, 실패 시 빌드 중단

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('site.json matches spec values', () => {
  const s = getSite();
  expect(s.phone).toBe('041-558-3101');
  expect(s.phoneE164).toBe('+82-41-558-3101');
  expect(s.address).toBe('충청남도 천안시 서북구 불당21로 65, 6층');
  expect(s.links.instagram).toBe('https://www.instagram.com/midipro__/');
  expect(s.showResultYears).toBe(true);
});
test('results.json holds the spec appendix A data in order', () => {
  const r = getResults();
  expect(r.map(x => x.school)).toEqual(['동아방송예술대학교','백석예술대학교','국제예술대학교','호원대학교','백석대학교','백제예술대학교','백석문화대학교','정화예술대학교','한국영상대학교']);
  expect(r.flatMap(x => x.entries)).toHaveLength(34);
  expect(r[1].entries[0]).toEqual({ name: '김현서', major: '뮤직테크놀로지', year: 2023 });
});
test('courses have no price field', () => {
  for (const c of getCourses()) expect(JSON.stringify(c)).not.toMatch(/원|price|₩/);
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/unit/content.test.ts` / Expected: FAIL(모듈 없음)

- [ ] **Step 3: 데이터와 로더 구현**

`results.json`은 설계서 부록 A를 그대로 옮긴다. `courses.json`은 로드맵의 상품표 다섯 줄(취미·중학생 단과, 입시 기본, 입시 종합, 합격생 음원 발매 과정, 성인 3개월 발매 패키지)의 대상·구성·역할 문구를 쓴다. `teachers.json`은 `[]`.

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run tests/unit/content.test.ts` / Expected: PASS

- [ ] **Step 5: Commit** — `git commit -m "feat: add validated site, results, courses data"`

---

### Task 3: 음원 목록 생성 스크립트 (slug, 길이, 파형)

**Files:**
- Create: `scripts/lib/parse-filename.ts`, `scripts/lib/romanize.ts`, `scripts/build-tracks.ts`, `src/data/tracks.json`(생성물, 커밋), `src/data/peaks/<slug>.json`(생성물, 커밋), `src/lib/tracks.ts`
- Test: `tests/unit/parse-filename.test.ts`, `tests/unit/romanize.test.ts`, `tests/unit/tracks.test.ts`

**Interfaces:**
- Produces:
  - `type Track = { slug: string; title: string; artists: string[]; team?: string; category: 'admissions' | 'songcamp' | 'release'; label: string; year: number; season?: string; file: string; duration: number; featured: boolean; links: Record<string,string>; sourceFile: string }`
  - `parseFilename(category: 'admissions'|'songcamp', fileName: string): Omit<Track,'slug'|'file'|'duration'|'featured'|'links'|'sourceFile'>`
  - `romanizeName(korean: string): string` (성 + 이름, 하이픈 연결), `romanizeText(s: string): string` (slug용)
  - `src/lib/tracks.ts`: `getTracks(): Track[]`(정렬: 연도 내림차순, 같은 연도는 원래 순서), `getTrack(slug): Track | undefined`, `getPeaks(slug): number[]`(길이 120, 0~1), `CATEGORY_LABEL: Record<Track['category'], string>` = `{admissions:'입시곡', songcamp:'송캠프', release:'발매곡'}`
- `scripts/build-tracks.ts`는 **이미 `tracks.json`에 있는 slug는 덮어쓰지 않고** 새 파일만 추가한다(사람이 고친 제목·slug 보존). 파형과 길이는 항상 다시 계산한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// romanize.test.ts
expect(romanizeName('황시윤')).toBe('hwang-siyun');
expect(romanizeName('이승연')).toBe('lee-seungyeon');
expect(romanizeName('김선우')).toBe('kim-seonu');
expect(romanizeName('목서연')).toBe('mok-seoyeon');
expect(romanizeText('잔향')).toBe('janhyang');
expect(romanizeText('burn up! (feat.신하영)')).toBe('burn-up-feat-sinhayeong');

// parse-filename.test.ts
expect(parseFilename('admissions','24_김선우_정시.mp3')).toMatchObject({ title:'김선우 입시곡 (정시)', artists:['김선우'], year:2024, label:'입시곡', category:'admissions' });
expect(parseFilename('admissions','25_황시윤_입시곡.mp3')).toMatchObject({ title:'황시윤 입시곡', year:2025 });
expect(parseFilename('songcamp','[24년 하반기 송캠프] 18.5(김민규,안세린,권주연,장효정) - burn up! (feat.신하영).mp3'))
  .toMatchObject({ title:'burn up! (feat.신하영)', team:'18.5', artists:['김민규','안세린','권주연','장효정'], year:2024, season:'하반기', label:'송캠프' });
expect(parseFilename('songcamp','[21년 2분기 송캠프] 이윤아,강온유,윤하영  -  Fly Away.mp3'))
  .toMatchObject({ title:'Fly Away', artists:['이윤아','강온유','윤하영'], year:2021, season:'2분기' });
expect(parseFilename('songcamp','[22년 하반기 싸이퍼] 김서진,김민혁,김종후 - High!.mp3')).toMatchObject({ label:'싸이퍼', title:'High!' });
expect(parseFilename('songcamp','[22년 상반기 성인 송캠프] 최연주,정결,조성수 - Personal Color.mp3')).toMatchObject({ label:'성인 송캠프' });

// tracks.test.ts  (생성된 tracks.json 검증)
const t = getTracks();
expect(t).toHaveLength(78);
expect(new Set(t.map(x=>x.slug)).size).toBe(78);
for (const x of t) { expect(x.slug).toMatch(/^[a-z0-9-]+$/); expect(x.duration).toBeGreaterThan(30); expect(getPeaks(x.slug)).toHaveLength(120); }
expect(JSON.stringify(t)).not.toContain('합격');
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/unit/romanize.test.ts tests/unit/parse-filename.test.ts` / Expected: FAIL

- [ ] **Step 3: `romanizeName`, `romanizeText` 구현**

한글 음절을 초성·중성·종성으로 분해해 국어의 로마자 표기법으로 옮긴다(음운 변화 무시, 음절 단위). `romanizeName`은 첫 음절을 성씨로 보고 아래 관용 표기를 우선 쓴다:
`김 kim, 이 lee, 박 park, 최 choi, 정 jung, 강 kang, 조 cho, 윤 yoon, 장 jang, 임 lim, 한 han, 오 oh, 서 seo, 신 shin, 권 kwon, 황 hwang, 안 ahn, 송 song, 류 ryu, 유 yoo, 전 jeon, 홍 hong, 고 ko, 문 moon, 양 yang, 손 son, 배 bae, 백 baek, 허 heo, 남 nam, 심 shim, 노 noh, 하 ha, 곽 kwak, 성 sung, 차 cha, 주 joo, 우 woo, 구 koo, 목 mok, 채 chae, 맹 maeng, 방 bang, 설 seol`.
`romanizeText`는 한글을 음절 단위로 옮기고 소문자화, `[^a-z0-9]+`를 `-`로 바꾸고 양끝 하이픈 제거.

- [ ] **Step 4: `parseFilename` 구현**

입시곡: `/^(\d{2})_(.+?)_(입시곡|수시|정시)\.mp3$/` → `year = 2000 + YY`, 수시·정시는 제목 끝에 `(수시)`/`(정시)`.
송캠프: `/^\[(\d{2})년 (상반기|하반기|\d분기) (성인 송캠프|송캠프|싸이퍼)\]\s*(.+?)\s+-\s+(.+)\.mp3$/`. 앞부분이 `팀명(이름,…)`이면 팀과 이름 분리, `(팀이름팀)`처럼 괄호 안이 한 명이면 그대로 artists 1명. 굽은 따옴표와 이중 공백은 제목에서 보존하되 trim.

- [ ] **Step 5: `build-tracks.ts` 구현과 실행**

`audio/입시곡`과 `audio/송캠프`를 읽어 slug를 만든다: 입시곡 `{year}-{romanizeName}`(수시·정시면 `-susi`/`-jeongsi`), 송캠프 `songcamp-{year}-{season 영문: h1|h2|q1|q2}-{romanizeText(title)}`. 충돌하면 `-2`를 붙인다. `file`은 `{admissions|songcamp}/{slug}.mp3`. `duration`(초, 반올림)은 `music-metadata`, 파형은 `mpg123-decoder`로 디코드해 120구간 RMS를 0~1로 정규화. 최신 연도 입시곡 중 첫 곡만 `featured: true`.
Run: `npx tsx scripts/build-tracks.ts`
Expected: `78 tracks (78 new)` 출력, `src/data/tracks.json`과 `src/data/peaks/` 78개 생성

- [ ] **Step 6: 통과 확인** — Run: `npx vitest run tests/unit` / Expected: PASS

- [ ] **Step 7: Commit** — `git commit -m "feat: generate track catalog with slugs, durations, waveforms"`

---

### Task 4: R2 업로드와 미디어 주소

**Files:**
- Create: `scripts/upload-audio.ts`, `src/lib/media.ts`, `.env.example`(`PUBLIC_MEDIA_BASE=`)
- Test: `tests/unit/media.test.ts`

**Interfaces:**
- Produces: `mediaUrl(file: string): string` — `import.meta.env.PUBLIC_MEDIA_BASE`(끝 슬래시 없음) + `/` + `file`. 값이 비어 있으면 빌드 오류.

- [ ] **Step 1: 실패하는 테스트** — `mediaUrl('admissions/2025-hwang-siyun.mp3')`가 base `https://media.example`에서 `https://media.example/admissions/2025-hwang-siyun.mp3`. base가 빈 문자열이면 throw.
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/unit/media.test.ts` / Expected: FAIL
- [ ] **Step 3: `mediaUrl` 구현** 후 통과 확인
- [ ] **Step 4: Cloudflare 로그인과 버킷 생성 (사용자가 브라우저 승인)**

Run: `npx wrangler login` → `npx wrangler r2 bucket create midipro-audio` → 대시보드에서 버킷의 r2.dev 공개 접근 켜기
Expected: `Created bucket 'midipro-audio'`. r2.dev 주소를 `.env`의 `PUBLIC_MEDIA_BASE`에 기록(커밋하지 않음, Task 12에서 빌드 변수로 설정)

- [ ] **Step 5: 업로드 스크립트 구현과 실행**

`tracks.json`의 각 곡에 대해 `wrangler r2 object put midipro-audio/{file} --file "audio/…/{sourceFile}" --content-type audio/mpeg --cache-control "public, max-age=31536000, immutable" --remote`. 이미 같은 크기로 존재하면 건너뛴다(`wrangler r2 object get --pipe`가 아니라 HEAD 요청으로 확인).
Run: `npx tsx scripts/upload-audio.ts`
Expected: `uploaded 78, skipped 0`

- [ ] **Step 6: Range 재생 확인**

Run: `curl -s -o /dev/null -w "%{http_code} %{content_type}\n" -H "Range: bytes=0-1023" "$PUBLIC_MEDIA_BASE/admissions/2025-hwang-siyun.mp3"`
Expected: `206 audio/mpeg`

- [ ] **Step 7: Commit** — `git commit -m "feat: upload audio to R2 and resolve media URLs"`

---

### Task 5: 디자인 시스템과 공통 레이아웃

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/rack.css`, `src/styles/global.css`, `src/components/rack/RackUnit.astro`, `src/components/rack/Screw.astro`, `src/components/rack/Keycap.astro`, `src/components/rack/Display.astro`, `src/components/Header.astro`, `src/components/SideNav.astro`, `src/components/BottomBar.astro`, `src/components/Footer.astro`, `src/layouts/Base.astro`, `scripts/build-logo.ts`, `src/assets/logo.svg`(생성물), `public/fonts/*`
- Test: `tests/e2e/layout.spec.ts`, `playwright.config.ts`

**Interfaces:**
- Produces:
  - `<RackUnit units?={1|2|3} tone?="metal"|"dark" screws?={2|4} slots?={0|1|2} as?="section"|"div">` — 좌우 16px 랙 귀, 6px 나사(각도는 `seed` prop 또는 인스턴스 순번으로 결정되는 고정값; 빌드마다 같아야 함), 장착 슬롯
  - `<Keycap variant="primary"|"secondary" href? icon?>` — 밝은/어두운 금속 키캡
  - `<Display>` — 오목한 디스플레이 창
  - `<Base title description path ogImage? noindex? jsonLd?={object[]}>` — 모든 페이지의 레이아웃. Task 10의 `<SeoHead>`를 `<head>`에 넣는다. `<slot />` 아래에 `<Player transition:persist>`(Task 7)와 `<BottomBar>`를 둔다.
  - `NAV: { href: string; label: string; hidden?: boolean }[]` in `src/lib/nav.ts` — 홈, 입시 결과, 과정 소개, 음원, 강사진(`hidden: getTeachers().length === 0`), 오시는 길, 상담 안내

- [ ] **Step 1: 로고 SVG 생성**

`scripts/build-logo.ts`: `@fontsource/jost`의 500 weight 글꼴 파일을 opentype.js로 열어 `MIDIPRO`를 자간 0.42em으로 배치한 윤곽선 path를 `src/assets/logo.svg`(fill `currentColor`, `role="img"`, `aria-label="MIDIPRO"`)와 `src/assets/mark.svg`(`M` 한 글자, 정사각형)로 저장한다.
Run: `npx tsx scripts/build-logo.ts && grep -c "<path" src/assets/logo.svg`
Expected: 1 이상, 파일에 `<text>`나 `font-family` 없음

- [ ] **Step 2: 글꼴 자체 호스팅**

Pretendard(가변 woff2 서브셋)와 IBM Plex Mono 400·500(woff2)을 `public/fonts`에 두고 `global.css`에서 `@font-face`, `font-display: swap`. Pretendard는 KS X 1001 2,350자 서브셋을 쓴다.

- [ ] **Step 3: 토큰과 랙 스타일 작성**

`tokens.css`의 값은 `rack-v6.html`의 `:root`와 랙 규칙에서 그대로 가져온다(나사 6px, 귀 16px, 모서리 ≤3px, 강조 `#5B7CFA→#8F63F0`, 노이즈 오버레이 opacity 0.16). 글로우 `box-shadow` 금지.

- [ ] **Step 4: 레이아웃 e2e 테스트 작성**

```ts
test('mobile layout has fixed call keycap and no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const call = page.getByRole('link', { name: '전화 상담' });
  await expect(call).toHaveAttribute('href', 'tel:0415583101');
  await expect(call).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
test('desktop shows side nav with every visible NAV item', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  for (const label of ['홈','입시 결과','과정 소개','음원','오시는 길','상담 안내'])
    await expect(page.getByRole('navigation').getByRole('link', { name: label })).toBeVisible();
  await expect(page.getByRole('link', { name: '강사진' })).toHaveCount(0);
});
```
`playwright.config.ts`: `webServer: { command: 'npm run build && npx astro preview --port 4321', url: 'http://localhost:4321' }`, 프로젝트 `iPhone 13`(webkit)과 `Desktop Chrome`.

- [ ] **Step 5: 실패 확인** — Run: `npx playwright install webkit chromium && npx playwright test tests/e2e/layout.spec.ts` / Expected: FAIL

- [ ] **Step 6: 컴포넌트와 `Base` 레이아웃 구현**, 홈은 임시 내용으로 두고 통과 확인

- [ ] **Step 7: Commit** — `git commit -m "feat: rack hardware design system, logo and base layout"`

---

### Task 6: 플레이어 상태 로직 (순수 모듈)

**Files:**
- Create: `src/lib/player/queue.ts`, `src/lib/player/controller.ts`
- Test: `tests/unit/player.test.ts`

**Interfaces:**
- Produces:
  - `type QueueItem = { slug: string; title: string; subtitle: string; src: string; duration: number }`
  - `class PlayerController { constructor(audio: HTMLAudioElement-like, mediaSession?: MediaSession-like); playList(items: QueueItem[], startIndex: number): Promise<void>; toggle(): void; next(): void; prev(): void; seek(seconds: number): void; get state(): { current?: QueueItem; index: number; status: 'idle'|'loading'|'playing'|'paused'|'error'; position: number }; subscribe(fn: (s) => void): () => void }`
  - `prev()`는 현재 위치가 3초를 넘으면 0초로, 아니면 이전 곡으로.
  - 곡이 끝나면 다음 곡, 마지막 곡이 끝나면 `paused`로 멈춘다(반복 없음).
  - 오디오 `error` 이벤트 → `status: 'error'`, 자동으로 다음 곡으로 넘어가지 않고 재시도하지 않는다.
  - `mediaSession`이 있으면 `metadata`(title, artist=subtitle, album='MIDIPRO')와 `play/pause/previoustrack/nexttrack/seekto` 핸들러 등록.

- [ ] **Step 1: 실패하는 테스트 작성** (가짜 audio 객체: `play()`가 resolve, `dispatch('ended'|'error'|'timeupdate')`)

```ts
test('ended advances to next, last ended pauses', ...);       // index 0 → 1, 마지막 → status 'paused'
test('error sets error status and does not advance', ...);     // index 유지, play 호출 횟수 증가 없음
test('prev restarts when position > 3s, else goes back', ...);
test('mediaSession metadata reflects current track', ...);     // title === items[1].title after next()
test('playList replaces queue', ...);
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/unit/player.test.ts` / Expected: FAIL
- [ ] **Step 3: `PlayerController` 구현** — DOM 접근 없이 생성자로 받은 객체만 사용
- [ ] **Step 4: 통과 확인** — Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "feat: player controller with queue, errors, media session"`

---

### Task 7: 끊기지 않는 플레이어 UI

**Files:**
- Create: `src/components/player/Player.astro`(미니 플레이어 1U 모듈 + `<audio preload="none">`), `src/components/player/player-client.ts`, `src/components/TrackList.astro`, `src/components/Waveform.astro`
- Modify: `src/layouts/Base.astro`(ClientRouter, `<Player transition:persist="player" />`)
- Test: `tests/e2e/player.spec.ts`

**Interfaces:**
- Consumes: `PlayerController`(Task 6), `getTracks`, `getPeaks`, `mediaUrl`, `CATEGORY_LABEL`
- Produces:
  - `<TrackList tracks={Track[]} listId={string}>` — `<ol>`, 각 행에 `CH01` 채널 번호, 제목, `{year} · {label}`, `m:ss`. 행의 재생 버튼은 `data-play-list={listId}` `data-index={i}`, 제목은 `/music/{slug}` 링크. 목록 데이터는 `<script type="application/json" id="list-{listId}">`로 HTML에 넣는다.
  - `<Waveform slug progress?>` — `getPeaks` 값으로 그린 SVG(빌드 시 정적 렌더). 재생 중이면 클라이언트가 재생 구간에 그라데이션 클래스를 입힌다.
  - 문서 어디서든 `[data-play-list]` 클릭 → 해당 목록 전체를 큐로 `playList`.
  - 재생 중인 행에 `aria-current="true"`와 강조색 채널 번호.
  - 미니 플레이어 오류 문구: `재생할 수 없습니다`

- [ ] **Step 1: 실패하는 e2e 테스트 작성**

```ts
test('playback survives five navigations', async ({ page }) => {
  await page.goto('/music');
  await page.locator('[data-play-list]').first().click();
  await expect(page.getByTestId('mini-player')).toContainText('입시곡');
  const t0 = await page.evaluate(() => (document.querySelector('audio') as HTMLAudioElement).currentTime);
  for (const label of ['입시 결과','과정 소개','오시는 길','상담 안내','음원'])
    await page.getByRole('link', { name: label }).first().click();
  await page.goBack();
  const a = await page.evaluate(() => { const el = document.querySelector('audio') as HTMLAudioElement; return { paused: el.paused, t: el.currentTime }; });
  expect(a.paused).toBe(false); expect(a.t).toBeGreaterThan(t0);
});
test('no autoplay before user gesture', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => (document.querySelector('audio') as HTMLAudioElement).paused)).toBe(true);
});
test('broken source shows error message', async ({ page }) => {
  await page.route('**/*.mp3', r => r.abort());
  await page.goto('/music');
  await page.locator('[data-play-list]').first().click();
  await expect(page.getByTestId('mini-player')).toContainText('재생할 수 없습니다');
});
```
e2e용으로 `PUBLIC_MEDIA_BASE`가 R2를 가리키므로 첫 테스트는 네트워크가 필요하다. CI가 없으므로 로컬 실행 기준.

- [ ] **Step 2: 실패 확인** — Run: `npx playwright test tests/e2e/player.spec.ts` / Expected: FAIL
- [ ] **Step 3: 구현** — `player-client.ts`는 `astro:page-load`마다 `[data-play-list]` 위임 핸들러와 `aria-current` 표시를 갱신하고, 컨트롤러는 모듈 스코프 싱글턴으로 한 번만 만든다.
- [ ] **Step 4: 통과 확인** — Expected: PASS (webkit, chromium 모두)
- [ ] **Step 5: Commit** — `git commit -m "feat: persistent mini player and track lists"`

---

### Task 8: 홈, 음원, 곡 상세 페이지

**Files:**
- Create/Modify: `src/pages/index.astro`, `src/pages/music/index.astro`, `src/pages/music/[slug].astro`, `src/components/FeaturedTrack.astro`
- Test: `tests/e2e/pages-music.spec.ts`

**Interfaces:**
- Consumes: `TrackList`, `Waveform`, `RackUnit`, `Keycap`, `getTracks`, `getTrack`, `getResults`, `getSite`
- Produces: 홈 구성 순서(시안 `rack-v6.html`과 같음) — 1U 헤더, 타이틀 모듈(라벨 `MP-01 · CHEONAN BUNDANG`, 타이틀·설명은 Global Constraints 문구), 대표곡 모듈(`featured` 곡, 디스플레이 창 속 파형, 트랜스포트 키캡), 음원 모듈(입시곡 최신 4곡, 탭: 입시곡·송캠프·발매곡 — 발매곡 곡이 0개면 탭 숨김), 입시 결과 모듈(학교 정식 명칭만 ` · `로 나열, 숫자 없음, `/results` 링크), 정보 모듈(ADDR·HOURS·TEL), 슬로건
- 음원 페이지: 카테고리 탭은 `/music`, `/music?c=songcamp`가 아니라 **페이지 안 앵커 섹션**(`#admissions`, `#songcamp`)으로 둬서 모든 곡이 정적 HTML에 들어가게 한다.
- 곡 상세: 제목(h1), 참여 학생, `{year} · {label}`(송캠프는 시즌·팀 포함), 큰 파형과 재생 버튼, 같은 카테고리의 같은 연도 곡 최대 5곡. 입시 결과 링크 없음.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('home copy and no forbidden words', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('곡으로 합격을만드는 학원.');
  const text = await page.locator('body').innerText();
  for (const w of ['합격곡','1등','최고']) expect(text).not.toContain(w);
  expect(text).not.toMatch(/\d+\s*(곳|건|명)/);
  await expect(page.getByText('빛나는 곳에서 연주하기보단 내가 연주하는 곳이 빛나게 되길')).toBeVisible();
});
test('music page lists all 78 tracks in HTML', async ({ request }) => {
  const html = await (await request.get('/music')).text();
  expect((html.match(/data-track-row/g) ?? []).length).toBe(78);
});
test('track page exists for every slug and has no results link', async ({ page }) => {
  await page.goto('/music/2025-hwang-siyun');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('황시윤 입시곡');
  await expect(page.locator('a[href^="/results"]')).toHaveCount(0);
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx playwright test tests/e2e/pages-music.spec.ts` / Expected: FAIL
- [ ] **Step 3: 페이지 구현**
- [ ] **Step 4: 통과 확인** — Expected: PASS
- [ ] **Step 5: Commit** — `git commit -m "feat: home, music index and track pages"`

---

### Task 9: 입시 결과, 과정 소개, 강사진, 오시는 길, 상담 안내, 개인정보, 404

**Files:**
- Create: `src/pages/results.astro`, `src/pages/courses.astro`, `src/pages/teachers.astro`, `src/pages/location.astro`, `src/pages/contact.astro`, `src/pages/privacy.astro`, `src/pages/404.astro`, `src/lib/maps.ts`
- Test: `tests/e2e/pages-info.spec.ts`, `tests/unit/maps.test.ts`

**Interfaces:**
- Produces:
  - `naverMapUrl(address: string): string` = `https://map.naver.com/p/search/` + `encodeURIComponent(address)`; `kakaoMapUrl(address)` = `https://map.kakao.com/link/search/` + `encodeURIComponent(address)`
  - `/results`: h1 `입시 결과`, 학교마다 RackUnit, 그 안에 `이름 (학과) 연도` 줄(`site.showResultYears`가 false면 연도 생략). 요약 숫자 없음.
  - `/courses`: h1 `과정 소개`, 과정 5개 모듈(대상·구성), 각 모듈 하단에 `수강료는 상담 시 안내합니다` + 전화 키캡.
  - `/teachers`: 강사 목록을 렌더한다. `getTeachers()`가 빈 배열이면 이 페이지에 `noindex`를 달고, `NAV`(Task 5)와 sitemap(Task 10)에서 뺀다.
  - `/location`: 주소, 운영시간, 주차(`site.json`의 `parking` 필드가 없으면 줄 생략), 네이버 지도·카카오맵 키캡(새 탭, `rel="noopener"`).
  - `/contact`: h1 `상담 안내`, 전화 키캡, 상담 가능 시간(운영시간과 같음), "상담 전에 준비하면 좋은 것" 목록(희망 학교·전공, 지금까지 배운 것, 만든 곡이 있다면 파일). 폼 없음.
  - `/privacy`: 처리 항목(계정: 아이디·이름·출생연도·역할, 평가 결과), 목적, 보관 기간(계정 삭제 시까지), 14세 미만 보호자 동의, 문의처 전화. 시행일 `2026-10-09`.
  - `/404`: 홈과 음원 키캡.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('results grouped by school in data order with years', async ({ page }) => {
  await page.goto('/results');
  const schools = await page.locator('[data-school]').allInnerTexts();
  expect(schools[0]).toContain('동아방송예술대학교');
  await expect(page.getByText('김민규 (전자음악) 2023')).toBeVisible();
  expect(await page.locator('body').innerText()).not.toMatch(/\d+\s*(곳|건)/);
});
test('contact has phone and no form', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.locator('a[href="tel:0415583101"]').first()).toBeVisible();
});
test('courses show no prices', async ({ page }) => {
  await page.goto('/courses');
  expect(await page.locator('main').innerText()).not.toMatch(/\d[\d,]*\s*원/);
});
```
`maps.test.ts`: `naverMapUrl('천안시 서북구 불당21로 65')`가 `https://map.naver.com/p/search/%EC%B2%9C…`로 시작.

- [ ] **Step 2: 실패 확인** / **Step 3: 구현** / **Step 4: 통과 확인**
- [ ] **Step 5: 외부 링크 생존 확인**

Run: `for u in https://blog.naver.com/midi-pro https://www.instagram.com/midipro__/ https://www.youtube.com/@midipro_159sound; do curl -sL -o /dev/null -w "%{http_code} $u\n" "$u"; done`
Expected: 세 줄 모두 `200`

- [ ] **Step 6: Commit** — `git commit -m "feat: results, courses, location, contact, privacy, 404 pages"`

---

### Task 10: SEO 헤드, 구조화 데이터, sitemap, robots, RSS

**Files:**
- Create: `src/lib/seo.ts`, `src/components/SeoHead.astro`, `src/pages/robots.txt.ts`, `src/pages/rss.xml.ts`
- Modify: `astro.config.mjs`(`@astrojs/sitemap`, `filter`로 `/teachers`(강사 0명일 때), `/404` 제외)
- Test: `tests/unit/seo.test.ts`

**Interfaces:**
- Produces:
  - `pageTitle(title?: string): string` — 홈은 `미디프로실용음악학원 | 천안 불당동 미디 입시`, 그 외 `${title} | 미디프로실용음악학원`
  - `schoolJsonLd(site: Site): object` — `@type: ['MusicSchool','LocalBusiness']`, `name`, `telephone`(E.164), `address`(PostalAddress: `addressRegion: '충청남도'`, `addressLocality: '천안시 서북구'`, `streetAddress: '불당21로 65, 6층'`, `addressCountry: 'KR'`), `openingHoursSpecification`(월–금 13:00–22:00, 토 09:00–18:00), `sameAs`(3개 링크), `url`, `logo`, `geo`는 `site.geo`가 있을 때만
  - `trackJsonLd(track: Track, url: string): object` — `@type: 'MusicRecording'`, `name`, `byArtist`(Person 배열), `duration`(ISO 8601, 예 `PT2M48S`), `datePublished`(`${year}`), `inAlbum`은 넣지 않음
  - `breadcrumbJsonLd(items: {name: string; url: string}[]): object`
  - `<SeoHead title description path ogImage noindex jsonLd>` — `<title>`, `meta description`, `link canonical`(`https://midipro.kr` + path), `og:type/title/description/image/url/locale(ko_KR)/site_name`, `twitter:card=summary_large_image`, `theme-color`, 파비콘 링크(Task 11 파일), `naver-site-verification`과 `google-site-verification`은 `PUBLIC_NAVER_VERIFY`/`PUBLIC_GOOGLE_VERIFY` 환경변수가 있을 때만, JSON-LD `<script type="application/ld+json">`
  - 페이지별 `description`(80자 이내)과 목표 검색어는 설계서 3장 표를 따른다.
  - robots.txt:
    ```
    User-agent: *
    Allow: /
    Disallow: /admin
    Disallow: /my
    Disallow: /login
    Disallow: /api/
    Sitemap: https://midipro.kr/sitemap-index.xml
    ```
  - RSS: 최근 추가 곡 20개(`tracks.json` 배열 끝에서부터), 항목 링크 `/music/{slug}`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
expect(pageTitle()).toBe('미디프로실용음악학원 | 천안 불당동 미디 입시');
expect(pageTitle('입시 결과')).toBe('입시 결과 | 미디프로실용음악학원');
const ld = schoolJsonLd(getSite());
expect(ld['@type']).toEqual(['MusicSchool','LocalBusiness']);
expect(ld.telephone).toBe('+82-41-558-3101');
expect(ld.sameAs).toHaveLength(3);
expect(ld).not.toHaveProperty('geo');
expect(trackJsonLd({ ...getTrack('2025-hwang-siyun')!, duration: 168 }, 'u').duration).toBe('PT2M48S');
```

- [ ] **Step 2: 실패 확인** / **Step 3: 구현하고 `Base`에 연결** / **Step 4: 통과 확인**
- [ ] **Step 5: Commit** — `git commit -m "feat: SEO head, JSON-LD, sitemap, robots, RSS"`

---

### Task 11: 파비콘, OG 이미지, 빌드 검사

**Files:**
- Create: `scripts/build-icons.ts`, `public/favicon.ico`, `public/favicon.svg`, `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png`, `public/site.webmanifest`, `src/lib/og.ts`, `src/pages/og/default.png.ts`, `src/pages/og/music/[slug].png.ts`, `scripts/check-build.ts`
- Test: `tests/unit/og.test.ts`

**Interfaces:**
- Produces:
  - `renderOg(opts: { eyebrow: string; title: string; sub?: string }): Promise<Buffer>` — satori(Pretendard OTF + IBM Plex Mono)로 1200×630 PNG. 디자인: 랙 모듈 배경, 좌우 귀와 나사 4개, 왼쪽 상단 LED 선, `logo.svg`, 제목.
  - 기본 OG: eyebrow `MP-01 · CHEONAN BUNDANG`, title `곡으로 합격을 만드는 학원.`
  - 곡 OG: eyebrow `{year} · {label}`, title = 곡 제목, sub = 참여 학생 ` · ` 연결
  - `site.webmanifest`: `name: 미디프로실용음악학원`, `short_name: MIDIPRO`, `theme_color`/`background_color: #111112`, `display: browser`, 아이콘 192·512
  - 아이콘 원본은 `src/assets/mark.svg`를 `#111112` 바탕 위 `#ECEBE7` 글자로 합성(sharp), ico는 16·32·48 포함
  - `scripts/check-build.ts`: `dist/**/*.html` 전체에 대해 아래를 검사하고 하나라도 어기면 exit 1
    - `<title>`, `meta[name=description]`, `link[rel=canonical]`, `og:image` 존재(404 제외)
    - 같은 `<title>`이 두 페이지에 없음
    - 본문 텍스트에 `합격곡`, `1등`, `최고` 없음
    - **JS 없이** 홈 HTML에 주소·전화·메인 타이틀·곡 제목 4개 이상이 텍스트로 있음
    - `/admin`, `/my`, `/login` 링크가 공개 페이지에 없음
    - 이미지 `alt` 누락 없음
  - `package.json` `"build"`: `astro build && tsx scripts/check-build.ts`

- [ ] **Step 1: 실패하는 테스트** — `renderOg({eyebrow:'2025 · 입시곡', title:'황시윤 입시곡'})` 결과가 PNG 시그니처(`89 50 4E 47`)로 시작하고 `sharp(buf).metadata()`가 1200×630.
- [ ] **Step 2: 실패 확인** / **Step 3: 구현** / **Step 4: 통과 확인**
- [ ] **Step 5: 전체 빌드 검사**

Run: `npm run build`
Expected: `check-build: 0 problems in N pages` (N = 8개 정적 페이지 + 78개 곡 + 404, 강사 0명이면 `/teachers` 포함 여부와 무관하게 sitemap에는 없음)

- [ ] **Step 6: Commit** — `git commit -m "feat: favicons, OG images and build-time SEO checks"`

---

### Task 12: Worker, 전화 클릭 집계, 미리보기 배포

**Files:**
- Create: `worker/index.ts`, `worker/calls.ts`, `migrations/0001_call_clicks.sql`, `wrangler.jsonc`, `src/components/call-beacon.ts`
- Test: `tests/worker/calls.test.ts`, `vitest.workers.config.ts`

**Interfaces:**
- Produces:
  - `wrangler.jsonc`: `name: "midipro"`, `main: "worker/index.ts"`, `compatibility_date: "2026-09-01"`, `assets: { directory: "./dist", binding: "ASSETS", not_found_handling: "404-page", run_worker_first: true }`, `d1_databases: [{ binding: "DB", database_name: "midipro" }]`, `build: { command: "npm run build" }`
  - `migrations/0001_call_clicks.sql`: `CREATE TABLE call_clicks (day TEXT NOT NULL, path TEXT NOT NULL, ref_host TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, path, ref_host));`
  - `POST /api/call` body `{ path: string; ref: string }` → `ref`에서 호스트만 추출(없거나 자기 사이트면 `direct`), `day`는 Asia/Seoul 기준 `YYYY-MM-DD`, upsert `count + 1`, 응답 204. `path`는 `/`로 시작하고 200자 이하가 아니면 400. 다른 메서드 405.
  - Worker가 모든 요청을 먼저 받는다. `/api/*`가 아니면 `env.ASSETS.fetch`로 넘기고, 요청 호스트가 `midipro.kr`가 아니면 응답에 `X-Robots-Tag: noindex`를 붙인다.
  - `call-beacon.ts`: `a[href^="tel:"]` 클릭 시 `navigator.sendBeacon('/api/call', JSON.stringify({ path: location.pathname, ref: document.referrer }))`. 쿠키·식별자 없음.
  - Cloudflare Web Analytics: `PUBLIC_CF_BEACON_TOKEN`이 있을 때만 `Base`에 공식 비컨 스크립트 삽입.

- [ ] **Step 1: 실패하는 테스트 작성** (`@cloudflare/vitest-pool-workers`, D1 마이그레이션 적용)

```ts
test('counts a call per day/path/host', async () => {
  await SELF.fetch('https://x/api/call', { method:'POST', body: JSON.stringify({ path:'/courses', ref:'https://search.naver.com/x?q=1' }) });
  await SELF.fetch('https://x/api/call', { method:'POST', body: JSON.stringify({ path:'/courses', ref:'https://search.naver.com/y' }) });
  const row = await env.DB.prepare('SELECT ref_host, count FROM call_clicks').first();
  expect(row).toEqual({ ref_host:'search.naver.com', count:2 });
});
test('rejects bad path', async () => { expect((await SELF.fetch('https://x/api/call',{method:'POST',body:JSON.stringify({path:'x',ref:''})})).status).toBe(400); });
test('preview host gets noindex', async () => { expect((await SELF.fetch('https://midipro.example.workers.dev/')).headers.get('x-robots-tag')).toBe('noindex'); });
test('production host has no noindex', async () => { expect((await SELF.fetch('https://midipro.kr/')).headers.get('x-robots-tag')).toBeNull(); });
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run -c vitest.workers.config.ts` / Expected: FAIL
- [ ] **Step 3: 구현** / **Step 4: 통과 확인**
- [ ] **Step 5: D1 생성과 마이그레이션**

Run: `npx wrangler d1 create midipro` → 출력된 `database_id`를 `wrangler.jsonc`에 기록 → `npx wrangler d1 migrations apply midipro --remote`
Expected: `0001_call_clicks.sql ✅`

- [ ] **Step 6: 미리보기 배포**

`PUBLIC_MEDIA_BASE`를 지정해 빌드 후 `npx wrangler deploy`.
Expected: `https://midipro.<계정>.workers.dev` 주소 출력. `curl -sI` 결과에 `x-robots-tag: noindex`.

- [ ] **Step 7: Commit** — `git commit -m "feat: worker with call counter, noindex on preview, deploy config"`

---

### Task 13: 미리보기 점검과 GitHub 연결

**Files:** 없음(점검과 설정)

- [ ] **Step 1: 실제 기기 크기 점검 (내장 브라우저, 375×812 / 1280×800)**

체크: 첫 탭에 재생, 다섯 번 이동 후에도 재생, 하단 전화 키캡이 `tel:` 링크, 가로 스크롤 없음, 나사·귀·키캡이 `rack-v6.html`과 같은 크기.

- [ ] **Step 2: Lighthouse 모바일**

Run: `npx lighthouse https://midipro.<계정>.workers.dev --form-factor=mobile --only-categories=performance,seo,accessibility,best-practices --quiet --output=json --output-path=./.lighthouse.json && node -e "const r=require('./.lighthouse.json');for(const[k,v]of Object.entries(r.categories))console.log(k,Math.round(v.score*100))"`
Expected: 네 항목 모두 90 이상. (`seo`는 `noindex` 때문에 감점될 수 있으므로 `--extra-headers`로 판단하지 말고, `is-crawlable` 항목만 예외로 기록한다.)

- [ ] **Step 3: iPhone 실기 점검 (원장님 휴대폰)**: 잠금화면 재생 조작, 이어폰 버튼, 전화 연결

- [ ] **Step 4: GitHub 자동 배포 연결**: Cloudflare 대시보드 → Workers → `midipro` → Settings → Builds에서 `arkarkarkarking-hash/midipro`의 `main` 연결, 빌드 변수 `PUBLIC_MEDIA_BASE`, `PUBLIC_CF_BEACON_TOKEN` 설정. 브랜치를 PR로 올려 병합하는 것은 사용자 확인 후.

- [ ] **Step 5: 사용자 검수 요청**: 문구(과정 소개, 상담 안내, 개인정보처리방침) 검수 목록 전달

---

## 단계 A 이후: 도메인 이전 (설계서 8장, 별도 진행)

카페24 네임서버 → Cloudflare, `midipro.kr`와 `media.midipro.kr` 연결, `www` 301, `PUBLIC_MEDIA_BASE`를 `https://media.midipro.kr`로 바꿔 재배포, 네이버 서치어드바이저·구글 서치콘솔 등록과 `sitemap-index.xml`·`rss.xml` 제출, 카페24 호스팅 해지. 사용자의 카페24·Cloudflare 계정 조작이 필요하므로 그때 단계별로 안내한다.
