# MIDIPRO 홈페이지 — 작업 안내

천안 불당동 미디 입시 학원 미디프로의 홈페이지(https://midipro.kr). Astro 정적 사이트 + Cloudflare Worker 하나(`midipro`), 음원은 R2(`media.midipro.kr`), 데이터는 D1(`midipro`).

## 소통 규칙

- 사용자(원장님)와는 한국어로, 개발 용어는 풀어서 설명한다.
- 모든 답변 끝에 **"다음 할 일"**을 원장님 / 제가로 나눠 적는다.
- 되돌릴 수 없는 작업(삭제, 기록 재작성, 도메인 변경)은 먼저 확인받는다.

## 영역 (작업은 영역 단위로 나눈다)

| 영역 | 코드 | 서버 | 문서 |
|---|---|---|---|
| 웹사이트·UI | `src/pages/*`(아래 제외), `src/data/` | `worker/site/` | `docs/areas/site/` |
| 로그인·관리자 | `src/features/accounts/`, `src/pages/login`·`admin`·`my` | `worker/accounts/` | `docs/areas/accounts/` |
| 월말고사·모의고사 | `src/features/exams/`, `src/pages/exam*` | `worker/exams/` | `docs/areas/exams/` |
| 블로그 | `src/features/blog/`, `src/pages/blog/`, 원고 `content/blog/` | — | `docs/areas/blog/` |

**공용(모든 영역이 함께 씀 — 바꾸면 전 영역에 영향):** `src/components/`(패널·버튼 부품, 헤더, 플레이어, 곡 목록), `src/layouts/`, `src/styles/`, `src/lib/`, `worker/core/`, `worker/index.ts`(라우터).

- 한 영역 작업 중 공용 부품을 바꿔야 하면, 바꾸는 이유를 커밋 메시지에 적고 전체 테스트를 돌린다.
- 각 영역 폴더의 `CLAUDE.md`와 `docs/areas/<영역>/README.md`(현재 상태)를 먼저 읽는다.
- 새 설계서·계획서는 `docs/areas/<영역>/specs/`, `docs/areas/<영역>/plans/`에 둔다. 사이트 전체 설계는 `docs/project/`.

## 작업 방식

- 영역마다 별도 Claude Code 세션 + 별도 브랜치(`area/<영역>-<작업>`)에서 작업하고, 끝나면 `main`에 합친다.
- `main`에 푸시하면 Cloudflare Workers Builds가 자동 배포한다. `wrangler.jsonc`의 `"name"`은 반드시 `midipro`.

## 명령

```bash
npm run build      # 빌드 + 검사(check-build: 금지어, 숫자 요약, localhost 주소, 메타 태그)
npm test           # 단위 + Worker 테스트
npm run test:e2e   # 브라우저 테스트 (아이폰·데스크톱)
npm run assets     # 로고·아이콘·질감 다시 생성
```

Node는 `~/.local/node/bin`(이 iMac은 Homebrew 없음, Intel).

## 반드시 지킬 것

- "합격곡" 금지 — 곡은 "입시곡", 결과는 "입시 결과". 입시 결과와 곡을 링크로 연결하지 않는다.
- 숫자 요약(학교 수, 합격 건수)과 최상급 표현("1등", "최고") 금지.
- 수강료 금액 게시 금지. 온라인 상담 폼·카카오톡 채널 없음(전화만).
- 외부 이미지 사용 금지(저작권 경고 이력). 사진은 학원 직접 촬영본만, 그래픽은 코드로 직접 생성.
- 계정에는 아이디·이름·출생연도·역할만 저장. 연락처 등 추가 금지.
- 디자인: 흑연색 설계도(블루프린트) — 격자·자 눈금·`+` 표시·고정폭 라벨, 음정·주파수 표기(예: `A4 · 440 HZ`), 코드로 그린 장비 선화. 강조색은 신호 주황 `#F25C2A` 하나(주석 상자·전화 상담·재생 표시·튜닝 표기에만). 표기는 실제 의미가 있는 것만(가짜 데이터 금지). 기준 시안 `docs/project/mockups/blueprint-v8.html`.
