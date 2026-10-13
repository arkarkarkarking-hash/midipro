# 블로그 화면 + 원고 도구 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** midipro.kr에 블로그(목록·글·대표 이미지·RSS·메뉴)를 만들고, 주간 초안 작업에 쓸 도구 세 가지(네이버 원고 검사, 미리보기 페이지 생성, 사진 손질·업로드)를 만든다.

**Architecture:** 홈페이지용 원고는 `content/blog/*.md`를 Astro 콘텐츠 컬렉션(glob 로더)으로 읽어 정적 페이지로 만든다. 네이버용 원고(`content/blog/naver/`)는 사이트에 올리지 않고 `scripts/`의 도구들만 읽는다. 순수 함수는 `src/lib/blog.ts`·`scripts/lib/`에 두고 단위 테스트, 화면은 Playwright로 검사한다.

**Tech Stack:** Astro 5 (content collections, glob loader), TypeScript, zod, satori/resvg(기존 `renderOg`), sharp, wrangler(R2), vitest, Playwright.

**Spec:** `docs/areas/blog/specs/2026-10-14-blog-automation-design.md` (5~8장, 11장 3~5번)

## Global Constraints

- 금지어: "합격곡", "1등", "최고" (사이트·네이버 공통). 네이버 원고는 "추천"도 금지. 숫자 요약 `/\d+\s*(곳|건)/` 금지.
- 수강료 금액 금지, 연락은 전화(`tel:0415583101`)만. 폼 없음.
- 외부 이미지 금지: 원고의 이미지 URL은 `https://media.midipro.kr/blog/` 로 시작하거나 생성 OG 이미지만.
- 강조색 `#F25C2A`(`var(--sig)`)는 전화 상담 버튼에만. 기존 부품(`RackUnit`, `Keycap`, `PageHead`, `Base`) 재사용.
- `draft: true` 글은 빌드 결과(페이지·사이트맵·RSS·OG)에 절대 나오지 않는다.
- 분류 값은 `field`(현장) / `guide`(정보) 두 개뿐.
- 공용 파일(`src/components/Header` 쪽 `src/lib/nav.ts`, `src/lib/seo.ts`, `src/pages/rss.xml.ts`, `scripts/check-build.ts`)을 바꾸는 커밋은 메시지에 이유를 적고 `npm test && npm run build && npm run test:e2e` 전체를 돌린다.
- `main` 반영은 원장님이 첫 글(Task 3의 `2026-10-19-blog-start.md`)을 승인한 뒤에만.

## Review Focus

1. 머리말이 틀린 원고(분류 오타, 날짜 형식 오류, `cover`가 외부 주소) → 빌드가 원고 파일 이름과 함께 실패해야 한다. (Task 1 테스트)
2. `draft: true` 글이 사이트맵·RSS·OG 경로로 새어 나감 → 어디에도 없어야 한다. (Task 3 e2e)
3. 같은 분류 글이 1편뿐이거나 없음 → 관련 글 영역이 빈 채로 그려지지 않고 사라져야 한다. (Task 1 테스트, Task 2 마크업 조건)
4. 아이폰 HEIC 사진, 세로로 찍은 사진(EXIF 회전) → JPEG로 바뀌고 똑바로 서 있어야 하며, GPS가 남지 않아야 한다. (Task 6 테스트)
5. 네이버 원고에 사진 자리 표시(`[[사진 03]]`)와 실제 사진 수가 안 맞음 → 검사가 실패해야 한다. (Task 4 테스트)

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| `src/content.config.ts` (새) | `blog` 컬렉션 정의, 머리말 스키마 |
| `src/lib/blog.ts` (새) | 순수 함수: 정렬·초안 거르기·관련 글·분류 이름 |
| `src/pages/blog/index.astro` (새) | 목록 + 분류 거르기 |
| `src/pages/blog/[slug].astro` (새) | 글 화면 |
| `src/pages/og/blog/[slug].png.ts` (새) | 글별 대표 이미지 |
| `src/lib/seo.ts` (수정) | `articleJsonLd` 추가, 빵부스러기에 블로그 |
| `src/lib/nav.ts` (수정) | "블로그" 메뉴 |
| `src/pages/rss.xml.ts` (수정) | 블로그 글 + 음원 합친 RSS |
| `scripts/lib/copy-rules.ts` (새) | 금지어·숫자 요약 규칙 (check-build와 check-blog 공유) |
| `scripts/lib/naver.ts` (새) | 네이버 원고 파싱, 검사, 깨끗한 HTML 변환 |
| `scripts/check-blog.ts` (새) | 네이버 원고 검사 CLI |
| `scripts/blog-preview.ts` (새) | 주간 미리보기 HTML 생성 CLI |
| `scripts/lib/photo.ts` (새) | 사진 손질 순수 함수 |
| `scripts/blog-photos.ts` (새) | 사진 손질·번호 붙이기·R2 업로드 CLI |
| `docs/areas/blog/weekly.md` (새) | 주간 초안 작업 절차서 (예약 작업이 읽음) |

---

### Task 1: 블로그 콘텐츠 모델

**Files:**
- Create: `src/content.config.ts`, `src/lib/blog.ts`
- Test: `tests/unit/blog.test.ts`

**Interfaces:**
- Produces:
  - `type BlogCategory = 'field' | 'guide'`
  - `const CATEGORY_LABEL: Record<BlogCategory, string>` = `{ field: '현장', guide: '정보' }`
  - `const BlogFrontmatter` (zod 스키마): `title: string(1..60)`, `description: string(1..160)`, `date: z.coerce.date()`, `category: enum`, `tags: string[] (기본 [])`, `cover?: string` (반드시 `https://media.midipro.kr/blog/` 로 시작), `draft: boolean (기본 false)`
  - `interface PostMeta { slug: string; title: string; description: string; date: Date; category: BlogCategory; tags: string[]; cover?: string; draft: boolean }`
  - `publishedPosts(all: PostMeta[]): PostMeta[]` — draft 제외, 날짜 내림차순, 같은 날짜면 slug 오름차순
  - `relatedPosts(posts: PostMeta[], current: PostMeta, n = 2): PostMeta[]` — 같은 분류, 자기 제외, `posts` 순서 유지
  - `postOgImage(p: PostMeta): string` — `cover` 있으면 그대로, 없으면 `/og/blog/${slug}.png`
  - `getPosts(): Promise<PostMeta[]>` — `getCollection('blog')` → `PostMeta` 변환 후 `publishedPosts`. slug는 파일 이름(`2026-10-19-blog-start`).

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/unit/blog.test.ts`
  - `publishedPosts`: draft 1편 + 날짜 다른 3편 → draft 빠지고 최신순 3편.
  - `relatedPosts`: field 3편·guide 1편, 현재 guide → `[]`; 현재 field → 나머지 field 2편.
  - `postOgImage`: cover 없음 → `/og/blog/a.png`, cover 있음 → cover.
  - `BlogFrontmatter.safeParse`: `category: 'notice'` 실패, `cover: 'https://example.com/x.jpg'` 실패, `date: '2026-10-19'` 성공(Date로 바뀜), `draft` 생략 시 `false`.
- [ ] **Step 2: `npx vitest run tests/unit/blog.test.ts` → 모듈 없음으로 FAIL**
- [ ] **Step 3: `src/lib/blog.ts` 구현.** `BlogFrontmatter`는 `zod`에서 만든다(`astro:content`의 `z` 아님 — 단위 테스트에서 import 가능해야 함). `getPosts`만 `astro:content`를 동적 import 없이 쓰되, 순수 함수와 같은 파일에 두면 vitest가 `astro:content`를 못 찾으므로 **`getPosts`는 `src/lib/blog-collection.ts`에 분리**한다.
- [ ] **Step 4: `src/content.config.ts`** — `defineCollection({ loader: glob({ pattern: '[0-9]*.md', base: './content/blog' }), schema: BlogFrontmatter })`. 패턴이 `README.md`·`naver/`·`plan/`을 제외한다.
- [ ] **Step 5: 테스트 PASS 확인 + `npx astro check` 오류 없음**
- [ ] **Step 6: 커밋** `feat(blog): content collection and post helpers`

### Task 2: 글 화면 + 대표 이미지 + 구조화 데이터

**Files:**
- Create: `src/pages/blog/[slug].astro`, `src/pages/og/blog/[slug].png.ts`
- Modify: `src/lib/seo.ts` (공용)
- Test: `tests/unit/seo.test.ts`, `tests/e2e/blog.spec.ts`

**Interfaces:**
- Consumes: `getPosts`, `relatedPosts`, `postOgImage`, `CATEGORY_LABEL` (Task 1), `renderOg({ eyebrow, title, sub })`, `absolute(path)`.
- Produces: `articleJsonLd(p: PostMeta, url: string, image: string): object` — `@type: 'BlogPosting'`, `headline`, `description`, `datePublished`(YYYY-MM-DD), `image`(절대 주소), `author`/`publisher` = `{ '@type': 'EducationalOrganization', name: '미디프로실용음악학원' }`, `mainEntityOfPage: url`.

- [ ] **Step 1: 테스트 작성**
  - `seo.test.ts`: `articleJsonLd`가 위 필드를 정확한 값으로 돌려준다 (`datePublished: '2026-10-19'`).
  - `blog.spec.ts`(Task 3에서 쓰는 첫 글 slug `2026-10-19-blog-start`): h1이 제목, `main a[href="tel:0415583101"]` 1개, `meta[property="og:image"]`가 `/og/blog/2026-10-19-blog-start.png`로 끝남, `script[type="application/ld+json"]` 중 `BlogPosting` 포함, 빵부스러기 `Home / 블로그`.
- [ ] **Step 2: unit FAIL 확인** (e2e는 Task 3 첫 글 이후 통과)
- [ ] **Step 3: `articleJsonLd` 구현**, `SeoHead.astro` 빵부스러기에 `path.startsWith('/blog/')` → `{ name: '블로그', url: absolute('/blog') }` 추가.
- [ ] **Step 4: `[slug].astro`** — `getStaticPaths`는 `getPosts()`, 본문은 `render(entry)`. 구성: 빵부스러기(`crumbs label`, 음원 글 화면과 같은 방식) → `PageHead code={CATEGORY_LABEL} title={title}` + 고정폭 날짜 라벨 → 본문(`RackUnit` 안 `.prose`, 이미지 `max-width:100%`) → 전화 상담 `RackUnit`(contact 페이지의 `Keycap variant="primary" icon="phone" data-call` 그대로) → `relatedPosts`가 비어 있지 않을 때만 "같은 분류 글" 목록.
- [ ] **Step 5: OG 라우트** — `renderOg({ eyebrow: \`${YYYY.MM.DD} · ${CATEGORY_LABEL}\`, title, sub: '미디프로 블로그' })`. `cover` 있는 글도 경로는 만든다(공유용 대체).
- [ ] **Step 6: unit PASS, 커밋** `feat(blog): post page, OG image, BlogPosting JSON-LD` (seo.ts 공용 변경 이유 기재)

### Task 3: 목록 화면 + 메뉴 + RSS + 첫 글

**Files:**
- Create: `src/pages/blog/index.astro`, `content/blog/2026-10-19-blog-start.md`
- Modify: `src/lib/nav.ts`, `src/pages/rss.xml.ts` (공용), `tests/e2e/layout.spec.ts`
- Test: `tests/e2e/blog.spec.ts`

**Interfaces:**
- Consumes: `getPosts`, `CATEGORY_LABEL`, `postOgImage`.
- Produces: NAV 항목 `{ href: '/blog', label: '블로그', code: 'BLOG' }` — `'/music'` 다음, `'/teachers'` 앞.

- [ ] **Step 1: 첫 글 원고** `2026-10-19-blog-start.md` (`category: guide`, `draft: false`) — "미디프로 블로그를 시작합니다": 블로그에서 다룰 것(현장·정보), 주 3회, 상담은 전화. 금지어 규칙 준수. **원장님 승인 전까지 main에 합치지 않음.**
- [ ] **Step 2: e2e 테스트 추가** (`blog.spec.ts`)
  - `/blog`: h1 "블로그", `[data-post]` ≥ 1, 첫 카드에 날짜·제목·설명. 분류 버튼 `전체 / 현장 / 정보`; "정보" 클릭 → `[data-post][data-category="field"]`가 숨겨짐(guide만 보임). JS 없이도 전체 목록이 보이는 마크업.
  - 초안 누출: 테스트용으로 `draft: true` 원고를 두지 않는다 — 대신 `/sitemap-0.xml`·`/rss.xml`의 `/blog/` 주소 수 == `/blog`의 `[data-post]` 수.
  - `/rss.xml`에 `/blog/2026-10-19-blog-start` 포함, 채널 제목 `미디프로실용음악학원`.
  - `layout.spec.ts`의 메뉴 라벨 목록에 `'블로그'` 추가. 아이폰 가로 스크롤 없음은 기존 테스트에 `/blog` 경로 하나 추가.
- [ ] **Step 3: 목록 화면** — 음원 목록처럼 `RackUnit` 머리(제목 + 분류 버튼), 카드: 대표 이미지(`postOgImage`, `loading="lazy"`, alt=제목), `YYYY.MM.DD · 분류` 고정폭 라벨, 제목, 설명. 분류 버튼은 `<button data-filter>` + 짧은 인라인 스크립트로 `hidden` 토글. 글이 없으면 "첫 글을 준비하고 있습니다." 한 줄.
- [ ] **Step 4: NAV에 블로그 추가, RSS 수정** — 채널 제목 `미디프로실용음악학원`, 설명 `미디프로 블로그와 학생 음원`; 블로그 글(`pubDate = date`) + 기존 음원 항목을 합쳐 `pubDate` 내림차순 상위 30개.
- [ ] **Step 5: `npm run build && npm run test:e2e` 전부 PASS** (데스크톱 메뉴 8칸이 1280px에서 줄바꿈 없이 보이는지 스크린샷 확인)
- [ ] **Step 6: 커밋** `feat(blog): list page, nav item, RSS` (nav·rss 공용 변경 이유 기재)

### Task 4: 금지어 규칙 공유 + 네이버 원고 검사

**Files:**
- Create: `scripts/lib/copy-rules.ts`, `scripts/lib/naver.ts`, `scripts/check-blog.ts`, `content/blog/naver/.gitkeep`
- Modify: `scripts/check-build.ts` (공용), `package.json` (`"check:blog": "tsx scripts/check-blog.ts"`)
- Test: `tests/unit/naver.test.ts`

**Interfaces:**
- Produces:
  - `copy-rules.ts`: `BANNED = ['합격곡', '1등', '최고']`, `NAVER_BANNED = [...BANNED, '추천']`, `NUMERIC_SUMMARY = /\d+\s*(곳|건)/`, `PRICE = /\d[\d,]*\s*원/`, `copyProblems(text: string, banned: string[]): string[]`
  - 네이버 원고 형식 (`content/blog/naver/<홈페이지와 같은 slug>.md`):
    ```
    ---
    title: "[천안 미디학원] ..."
    tags: [천안미디학원, 미디입시]
    photos: 6            # 사진 폴더의 01.jpg~06.jpg 개수
    ---
    본문. 소제목은 "## ", 굵게는 "**...**", 사진 자리는 한 줄에 "[[사진 02]]".
    마지막 줄: https://midipro.kr/blog/<slug>
    ```
  - `naver.ts`: `parseNaver(src: string): { title: string; tags: string[]; photos: number; body: string }`; `naverProblems(n, slug): { errors: string[]; warnings: string[] }`; `naverBodyLength(body): number` (공백 포함, 마크다운 기호·사진 자리 제외).
- 검사 규칙: errors = 금지어(`NAVER_BANNED`), 숫자 요약, 금액, 외부 링크 2개 이상, 링크가 `https://midipro.kr/blog/<slug>`가 아님, 사진 자리 번호가 1..photos를 빠짐·중복 없이 한 번씩 쓰지 않음, 이미지 마크다운(`![`) 사용. warnings = 본문 800자 미만·1,200자 초과, 소제목 3~4개 아님.

- [ ] **Step 1: 테스트 작성** — 위 규칙마다 1개씩: "추천" 포함 → error, `[[사진 01]]`·`[[사진 03]]`에 `photos: 3` → error(02 빠짐), 외부 링크 `https://blog.naver.com/x` → error, 정상 원고 → errors 0, 700자 → warning만.
- [ ] **Step 2: FAIL 확인**
- [ ] **Step 3: `copy-rules.ts`·`naver.ts` 구현, `check-build.ts`가 `BANNED`·`NUMERIC_SUMMARY`를 `copy-rules.ts`에서 가져오게 변경** (동작 동일)
- [ ] **Step 4: `check-blog.ts`** — 인자 없으면 `content/blog/naver/*.md` 전부, 인자 있으면 그 파일. 파일별로 errors/warnings 출력, error 있으면 exit 1. 같은 slug의 홈페이지 원고(`content/blog/<slug>.md`)가 없으면 error. 홈페이지 원고 본문에도 `copyProblems(BANNED)`를 돌린다(초안은 빌드 검사를 안 거치므로).
- [ ] **Step 5: `npm test && npm run build && npm run check:blog` PASS**
- [ ] **Step 6: 커밋** `feat(blog): shared copy rules and Naver manuscript check` (check-build 공용 변경 이유 기재)

### Task 5: 네이버 깨끗한 HTML + 주간 미리보기 생성기

**Files:**
- Modify: `scripts/lib/naver.ts`
- Create: `scripts/blog-preview.ts`
- Test: `tests/unit/naver.test.ts`

**Interfaces:**
- Consumes: `parseNaver` (Task 4), `BlogFrontmatter` (Task 1).
- Produces:
  - `naverHtml(body: string, opts?: { images?: boolean }): string` — 허용 태그는 `<h2> <p> <b> <br>` 뿐. 빈 줄로 문단 구분, 문단 안 줄바꿈은 `<br>`, `[[사진 02]]` → `<p>📷 사진 02</p>`, 링크 줄은 텍스트 그대로(`<a>` 없이 — 네이버 편집기가 자동 링크). `class`·`style` 속성 없음. HTML 특수문자 이스케이프.
  - CLI: `npx tsx scripts/blog-preview.ts <slug> [<slug> ...] --out <파일.html>` → 한 장짜리 HTML (Artifact로 게시용).

- [ ] **Step 1: 테스트** — `naverHtml('## 소제목\n\n첫 줄\n둘째 **굵게**\n\n[[사진 01]]')` === `'<h2>소제목</h2><p>첫 줄<br>둘째 <b>굵게</b></p><p>📷 사진 01</p>'`; `<script>` 입력은 `&lt;script&gt;`; 출력에 `class=`·`style=` 없음.
- [ ] **Step 2: FAIL → 구현 → PASS**
- [ ] **Step 3: `blog-preview.ts`** — slug마다 한 구역: 상단 `발행일 · 분류`, 왼쪽 네이버용(제목, 태그, `naverHtml` 본문, 검사 warnings), 오른쪽 홈페이지용(머리말 제목·설명 + 본문을 `naverHtml(body, { images: true })`로 렌더 — 이 옵션일 때만 `![alt](url)`을 `<img alt src>`로 바꾼다. 네이버용 호출에서는 Task 4 검사가 `![`를 막으므로 옵션 없이 쓴다). 버튼 3개 `제목 복사 / 본문 복사 / 태그 복사`: 본문은 `navigator.clipboard.write([new ClipboardItem({ 'text/html': ..., 'text/plain': ... })])`, 태그는 `#태그 ` 공백 구분 텍스트. 디자인: 흑연 배경 `#16171a`, 글자 `#e8e3d9`, 복사 버튼만 `#F25C2A`, 모바일 1단·데스크톱 2단, `:root` 색 토큰 + 다크/라이트 규칙(Artifact 규약). 외부 스크립트 없음.
- [ ] **Step 4: 수동 확인** — 샘플 네이버 원고 하나로 HTML을 만들어 브라우저 패널에서 열고, "본문 복사" 후 붙여넣은 HTML에 `<h2>`·`<b>`만 남는지 `javascript_tool`로 클립보드 대신 생성 문자열 확인. 샘플 원고는 커밋하지 않는다.
- [ ] **Step 5: 커밋** `feat(blog): clean Naver HTML and weekly preview page`

### Task 6: 사진 손질 + R2 업로드

**Files:**
- Create: `scripts/lib/photo.ts`, `scripts/blog-photos.ts`
- Modify: `package.json` (`"blog:photos": "tsx scripts/blog-photos.ts"`)
- Test: `tests/unit/photo.test.ts`

**Interfaces:**
- Produces:
  - `processPhoto(input: Buffer): Promise<Buffer>` — `sharp(input).rotate()`(EXIF 방향 적용) → 긴 변 1,600px 이하로 `resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })` → `jpeg({ quality: 82, mozjpeg: true })`. `withMetadata` 쓰지 않음 → EXIF·GPS 제거.
  - CLI: `npm run blog:photos -- --src "<재료 폴더>" --slug <slug> --files a.jpg,c.HEIC,b.jpg [--upload]`
    - `--files` 순서대로 `<src>/_out/01.jpg`, `02.jpg` … 생성 (네이버용 사진 묶음).
    - `.heic`/`.HEIC`는 먼저 macOS `sips -s format jpeg <in> --out <임시>`로 변환 (`execFileSync`).
    - `--upload`: `_out`의 파일을 R2 `midipro-audio` 버킷 `blog/<slug>/NN.jpg`로 `wrangler r2 object put … --content-type image/jpeg --cache-control "public, max-age=31536000, immutable" --remote` (`upload-audio.ts`와 같은 방식, 같은 크기면 건너뜀). 끝나면 `https://media.midipro.kr/blog/<slug>/NN.jpg` 목록 출력.
- 어떤 사진을 고를지(동의 없는 얼굴 제외)는 Claude가 사진을 보고 `--files`로 정한다. 스크립트는 고르지 않는다.

- [ ] **Step 1: 테스트** — sharp로 3000×2000 JPEG + EXIF(`withMetadata({ exif: { IFD0: { Make: 'TestCam' }, IFD3: { GPSLatitude: '36/1 48/1 0/1' } }, orientation: 6 })`)를 만든 뒤 `processPhoto` 결과: `metadata().exif` undefined, `orientation` undefined, 회전 반영으로 `width < height`(2000→1067×1600), 형식 `jpeg`. 400×300 입력은 확대되지 않음.
- [ ] **Step 2: FAIL → 구현 → PASS**
- [ ] **Step 3: CLI 구현.** `--files`에 없는 파일 이름 → 오류로 중단. `_out`이 이미 있으면 비우고 다시 만든다.
- [ ] **Step 4: 수동 확인** — `_사진은행`에 사진이 있으면 1장으로 `--upload` 없이 실행, `_out/01.jpg`를 `mdls`로 GPS 없음 확인. 업로드는 첫 실제 글 때 확인.
- [ ] **Step 5: 커밋** `feat(blog): photo resize/strip and R2 upload script`

### Task 7: 주간 절차서 + 영역 문서

**Files:**
- Create: `docs/areas/blog/weekly.md`
- Modify: `docs/areas/blog/README.md`, `content/blog/README.md`, `src/features/blog/CLAUDE.md`

- [ ] **Step 1: `weekly.md`** — 토요일 예약 작업이 그대로 따라 할 순서: ① `content/blog/plan/YYYY-MM.md`에서 다음 주 월·수·금 주제 확인 ② `~/Desktop/블로그재료/` 날짜 폴더·`메모.txt` 읽기, 없으면 정보 글로 대체하고 기록 ③ 사진 고르기(얼굴은 메모에 `얼굴 OK`가 있는 번호만) → `npm run blog:photos` ④ 홈페이지 원고(`draft: true`)·네이버 원고 작성(설계서 2장 표 기준) ⑤ `npm run check:blog` 통과까지 수정 ⑥ `blog-preview.ts`로 미리보기 → Artifact 게시 → 알림 ⑦ 브랜치 `area/blog-week-YYYY-MM-DD`에 커밋, main 반영은 원장님 승인 후 발행일에 `draft: false`.
- [ ] **Step 2: README 상태 갱신**(구현 완료 항목), `content/blog/README.md`에 두 원고 형식 요약, `CLAUDE.md`에 `weekly.md` 안내 한 줄.
- [ ] **Step 3: 커밋** `docs(blog): weekly runbook and area status`

---

## 이 계획 범위 밖 (설계서 11장 6~7번)

- 첫 달 주제표 `content/blog/plan/2026-10.md`·`2026-11.md` — 원장님 확정 필요.
- 예약 작업 2개 (토 03:05 주간 초안, 매달 1일 보고서) — 이 계획 완료와 `main` 반영 후 생성.
