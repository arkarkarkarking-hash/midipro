# MIDIPRO 홈페이지

천안 불당동 미디 입시 학원 미디프로의 홈페이지입니다. Astro로 만든 정적 사이트를 Cloudflare Workers에서 서빙하고, 음원은 Cloudflare R2에서 재생합니다.

- 설계서: `docs/superpowers/specs/2026-10-09-midipro-site-redesign-design.md`
- 구현 계획: `docs/superpowers/plans/`

## 다른 컴퓨터에서 빌드하기

필요한 것: Node.js 22 (`.nvmrc`), git

```bash
git clone https://github.com/arkarkarkarking-hash/midipro.git
cd midipro
git checkout redesign
npm ci
npm run build
```

`npm run build`는 사이트를 `dist/`에 만들고, 마지막에 SEO·문구 검사(`scripts/check-build.ts`)를 돌립니다. `check-build: 0 problems`가 나오면 정상입니다.

로컬에서 보기:

```bash
npm run dev        # 개발 서버 http://localhost:4321
npm run preview    # 빌드 결과 미리보기
```

음원은 `.env.production` / `.env.development`의 `PUBLIC_MEDIA_BASE`(R2 공개 주소)에서 불러옵니다.

## 테스트

```bash
npm test                     # 단위 테스트 + Worker 테스트
npx playwright install webkit chromium
npm run test:e2e             # 브라우저 테스트 (아이폰·데스크톱)
```

## 콘텐츠 수정

| 바꿀 것 | 파일 |
|---|---|
| 학원 정보, 운영시간, SNS 링크 | `src/data/site.json` |
| 입시 결과 | `src/data/results.json` |
| 과정 소개 | `src/data/courses.json` |
| 강사진 (비어 있으면 메뉴에서 숨김) | `src/data/teachers.json` |
| 곡 목록 | `audio/`에 mp3 추가 → `npx tsx scripts/build-tracks.ts` → `npx tsx scripts/upload-audio.ts` |

## 배포

`main`에 푸시하면 Cloudflare Workers Builds가 자동으로 빌드·배포합니다(Worker `midipro-preview`). 수동 배포는 Cloudflare 로그인(`npx wrangler login`) 후:

```bash
npx wrangler deploy
```
