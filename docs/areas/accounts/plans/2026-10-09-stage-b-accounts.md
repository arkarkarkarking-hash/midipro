# 단계 B: 로그인, 수강생 마이페이지, 관리자 화면 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 만든 계정으로 로그인하고, 수강생은 마이페이지에서 자기 곡을 듣고, 관리자는 계정과 곡 연결을 관리하며 전화 클릭 집계를 본다.

**Architecture:** 단계 A의 Worker(`worker/index.ts`)에 `/api/accounts/*` 한 줄을 연결하고, 처리는 `worker/accounts/`에 둔다. 세션 확인·Origin 확인처럼 다른 영역(시험)도 쓸 코드는 `worker/core/`에 둔다. `/login`, `/admin`, `/my`는 Astro가 만든 정적 껍데기 페이지이고, 데이터는 모두 세션 쿠키로 보호된 API에서 받는다. 화면 스크립트는 `src/features/accounts/`.

**Tech Stack:** 단계 A와 같음 + Cloudflare Turnstile, Web Crypto PBKDF2. Worker 테스트는 `tests/worker/helpers.ts`의 `makeEnv()`(wrangler `getPlatformProxy` + 임시 D1)로 돌린다. `@cloudflare/vitest-pool-workers`는 vitest 5와 맞지 않아 쓰지 않는다.

**Spec:** `docs/project/2026-10-09-site-redesign-design.md` (6장)

**변경 이력:** 2026-10-11 — 결정 반영(출생연도, 관리자 전체 접근, 수강생 내 곡, 전화 클릭 집계), 영역 폴더 구조(`worker/accounts`, `worker/core`, `src/features/accounts`)와 `/api/accounts/*` 경로로 정리, 테스트 방식(getPlatformProxy, e2e는 API 가짜 응답), 배포 방식(main 푸시 자동 배포) 반영, 헤더는 바꾸지 않기로 함.

## Global Constraints

- 역할: `admin`, `teacher`, `student`. 회원가입·비밀번호 변경·비밀번호 찾기 없음. 비밀번호는 관리자가 재지정한다.
- 계정 저장 항목은 아이디, 이름, 출생연도, 역할, 비밀번호 해시, 상태(+잠금용 실패 횟수·잠금 시각, 생성·마지막 로그인 시각)뿐이다. 연락처·이메일 등 추가 금지.
- 비밀번호: PBKDF2-SHA256, 반복 100,000회(Workers 상한), 사용자별 16바이트 무작위 솔트, 32바이트 키. 저장 형식 `pbkdf2$100000$<salt b64>$<hash b64>`. 비교는 상수 시간. 없는 아이디로 로그인해도 같은 시간이 걸리도록 가짜 해시 비교를 한 번 한다.
- 세션: 32바이트 무작위 토큰(base64url), D1에는 토큰의 SHA-256만 저장. 쿠키 `mp_session`, `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`. 유효기간 7일. 로그아웃하면 D1에서 삭제.
- 잠금: 같은 계정 5회 연속 실패 시 15분 잠금. 잠긴 동안은 비밀번호가 맞아도 거부하고 실패 횟수를 늘리지 않는다. 성공하면 실패 횟수 0.
- 로그인 실패 메시지는 항상 `아이디 또는 비밀번호가 올바르지 않습니다.`(계정 존재 여부·비활성 여부를 드러내지 않음). 잠금 시 `잠시 후 다시 시도해 주세요.`
- Turnstile은 로그인에만. 서버에서 `https://challenges.cloudflare.com/turnstile/v0/siteverify`로 검증. 테스트에서는 `fetch`를 가짜로 바꿔 네트워크 없이 돈다.
- 상태를 바꾸는 API는 POST만 받고 `Origin` 헤더의 호스트가 요청 호스트와 같아야 한다(없거나 다르면 403).
- `/login`, `/admin`, `/my`: `<meta name="robots" content="noindex">`, sitemap 제외(이미 `astro.config.mjs`에 있음), robots.txt 차단(이미 있음). API 응답은 `Cache-Control: no-store`.
- 관리자는 모든 화면과 API에 접근한다. 강사는 1차에서 `/my`의 "준비 중"만 본다. 수강생은 자기에게 연결된 곡만 조회한다.
- 마이페이지에서 내용이 없는 항목은 화면에 넣지 않는다. 단, 연결된 곡이 0개인 수강생에게는 `아직 연결된 곡이 없습니다.` 한 줄을 보여준다.
- 디자인은 단계 A의 랙 부품(`RackUnit`, `Keycap`, `Display`, `TrackList` 마크업 규칙)만 쓴다. 공용 부품(`src/components/`)과 헤더는 바꾸지 않는다. 헤더의 [로그인] 키캡은 그대로 두고, 이미 로그인한 사람이 `/login`에 오면 바로 `/admin` 또는 `/my`로 보낸다.

## Review Focus

1. **잠금 시간 경계**: 15분이 막 지난 직후에는 로그인이 되어야 하고, 잠금 중 시도는 실패 횟수를 늘리지 않아야 한다. (Task 2)
2. **비활성화된 계정의 살아 있는 세션**: 관리자가 비활성화하면 그 계정의 기존 세션이 즉시 무효가 되어야 한다. (Task 3)
3. **수강생이 다른 수강생 곡 목록을 요청**: `/api/accounts/my/tracks`는 쿼리나 본문의 사용자 ID를 무시하고 세션의 사용자만 쓴다. 관리자 API를 수강생 쿠키로 부르면 403. (Task 3, 4)
4. **`tracks.json`에서 사라진 곡이 D1 연결에 남은 경우**: 마이페이지는 그 곡을 조용히 건너뛰고, 관리자 화면에는 `삭제된 곡` 표시. (Task 4)
5. **아이디 중복과 공백**: 아이디는 소문자로 저장하고 앞뒤 공백을 제거하며, 대소문자만 다른 중복을 거부한다. 형식 `^[a-z0-9_]{4,20}$`. (Task 3)

## 파일 배치

```
migrations/0002_accounts.sql
worker/core/env.ts            (수정: TURNSTILE_SECRET, MEDIA_BASE 추가)
worker/core/http.ts           json(), checkOrigin(), readJson(), 쿠키 읽기
worker/core/session.ts        createSession, getSessionUser, deleteSession, deleteUserSessions, requireUser
worker/accounts/password.ts   hashPassword, verifyPassword (Node 스크립트에서도 import)
worker/accounts/turnstile.ts  verifyTurnstile
worker/accounts/auth.ts       login / logout / me
worker/accounts/validate.ts   validateUserInput
worker/accounts/users.ts      관리자 계정 API
worker/accounts/tracks.ts     곡 연결 API, 내 곡 API, trackIndex
worker/accounts/calls.ts      전화 클릭 집계 API
worker/accounts/index.ts      handleAccounts(req, env, now) — /api/accounts/* 분기
worker/index.ts               (수정: /api/accounts/ 한 줄)
src/features/accounts/api.ts  fetch 래퍼(401 → /login, 403 → /my)
src/features/accounts/login.ts, my.ts, admin.ts   화면 스크립트
src/pages/login.astro, my.astro, admin.astro
scripts/create-admin.ts
tests/worker/accounts/*.test.ts, tests/e2e/accounts.spec.ts
```

---

### Task 1: D1 스키마

**Files:**
- Create: `migrations/0002_accounts.sql`
- Test: `tests/worker/accounts/schema.test.ts`

**Interfaces:**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  login_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  birth_year INTEGER,
  role TEXT NOT NULL CHECK (role IN ('admin','teacher','student')),
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  failed_count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE user_tracks (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_slug TEXT NOT NULL,
  PRIMARY KEY (user_id, track_slug)
);
```
(시각은 모두 Unix 초. 테스트 헬퍼가 `;`로 나눠 실행하므로 SQL 안에 주석·트리거를 넣지 않는다.)

- [x] **Step 1: 테스트** — `role='guest'` 삽입 실패, 같은 `login_id` 두 번 삽입 실패.
- [x] **Step 2: 실패 확인** — `npx vitest run -c vitest.workers.config.ts tests/worker/accounts/schema.test.ts`
- [x] **Step 3: SQL 작성** / **Step 4: 통과 확인**
- [x] **Step 5: Commit** — `feat(accounts): schema`

---

### Task 2: 비밀번호, 세션, 로그인 API

**Files:**
- Create: `worker/accounts/password.ts`, `worker/accounts/turnstile.ts`, `worker/accounts/auth.ts`, `worker/accounts/index.ts`, `worker/core/http.ts`, `worker/core/session.ts`
- Modify: `worker/index.ts`, `worker/core/env.ts`, `tests/worker/helpers.ts`(env에 `TURNSTILE_SECRET`, `MEDIA_BASE` 테스트 값 추가) — 공용 파일이므로 커밋 메시지에 이유를 적고 전체 테스트를 돌린다.
- Test: `tests/worker/accounts/password.test.ts`, `tests/worker/accounts/auth.test.ts`

**Interfaces:**
- `hashPassword(plain): Promise<string>`, `verifyPassword(plain, stored): Promise<boolean>`
- `createSession(db, userId, now): Promise<string>`(토큰 원문), `getSessionUser(db, token, now): Promise<SessionUser | null>` — 만료·비활성 계정이면 null, `deleteSession(db, token)`, `deleteUserSessions(db, userId)`
- `type SessionUser = { id: number; loginId: string; name: string; role: 'admin'|'teacher'|'student' }`
- `requireUser(req, env, now, roles?): Promise<SessionUser | Response>` — 쿠키 없음/무효 401, 역할 불일치 403
- `checkOrigin(req): Response | null`
- `verifyTurnstile(secret, token, ip): Promise<boolean>`
- `POST /api/accounts/login` `{ loginId, password, turnstileToken }` → 200 `{ role, name }` + `Set-Cookie`; 실패 401 `{ error }`; 잠금 429 `{ error }`
- `POST /api/accounts/logout` → 204, 쿠키 삭제(`Max-Age=0`)
- `GET /api/accounts/me` → 200 `SessionUser` 또는 401
- 핸들러는 현재 시각 `now`(Unix 초)를 인자로 받는다. `worker/index.ts`만 `Math.floor(Date.now()/1000)`을 넘긴다.

- [x] **Step 1: 실패하는 테스트** — hash 형식·왕복 / 로그인 → HttpOnly 쿠키 → /me / 틀린 비번과 없는 아이디의 응답 본문이 같음 / 비활성 계정도 같은 메시지 / 5회 실패 → 맞는 비번도 429 / 잠금 중 시도는 잠금을 늘리지 않고 +900초에 로그인됨 / Turnstile 실패는 401이고 실패 횟수 안 늘림 / 다른 출처 POST 403 / 만료 세션(+604801초) 거부 / 로그아웃 후 세션 삭제
- [x] **Step 2: 실패 확인** / **Step 3: 구현** / **Step 4: 통과 확인**
- [x] **Step 5: Commit** — `feat(accounts): password hashing, sessions, login API`

---

### Task 3: 관리자 계정 API

**Files:**
- Create: `worker/accounts/users.ts`, `worker/accounts/validate.ts`
- Test: `tests/worker/accounts/users.test.ts`

**Interfaces (모두 admin 전용):**
- `GET /api/accounts/admin/users` → `{ users: { id, loginId, name, birthYear, age, role, status, lastLoginAt }[] }` — `age = 올해(Asia/Seoul) - birthYear`(없으면 null)
- `POST /api/accounts/admin/users` `{ loginId, name, birthYear?, role, password }` → 201 `{ id }`; 중복 409 `{ error: '이미 사용 중인 아이디입니다.' }`; 형식 오류 400 `{ error }`
- `POST /api/accounts/admin/users/:id/password` `{ password }` → 204, 그 사용자의 세션 모두 삭제, 실패 횟수·잠금 해제
- `POST /api/accounts/admin/users/:id/status` `{ status }` → 204, `disabled`면 세션 모두 삭제. 자기 자신 비활성화는 400.
- `validateUserInput(body, thisYear)`: loginId trim·소문자 `^[a-z0-9_]{4,20}$` / name trim 1~20자 / birthYear 정수 1940~올해(선택) / password 4~64자 / role 세 값 중 하나

- [x] **Step 1: 실패하는 테스트** — 수강생 쿠키 403 / `' Kim_01 '` → `kim_01` / `KIM_01` 중복 409 / 나이 계산 / 비활성화 즉시 세션 무효 / 비번 재지정이 잠금·세션 해제 / 자기 비활성화 400
- [x] **Step 2~4** / **Step 5: Commit** — `feat(accounts): admin user management API`

---

### Task 4: 곡 연결, 내 곡, 전화 클릭 집계 API

**Files:**
- Create: `worker/accounts/tracks.ts`, `worker/accounts/calls.ts`
- Modify: `wrangler.jsonc`(`vars.MEDIA_BASE = "https://media.midipro.kr"`)
- Test: `tests/worker/accounts/tracks.test.ts`, `tests/worker/accounts/calls.test.ts`

**Interfaces:**
- `trackIndex: Map<slug, { slug, title, label, category, year, file, duration }>` — `src/data/tracks.json`을 Worker 번들에 import
- `GET /api/accounts/admin/users/:id/tracks` → `{ tracks: { slug, title, missing }[] }`(사라진 곡은 `title: '삭제된 곡'`, `missing: true`)
- `POST /api/accounts/admin/users/:id/tracks` `{ slugs }` → 204, 연결을 이 목록으로 **교체**. 모르는 slug 400, 대상이 student가 아니면 400.
- `GET /api/accounts/my/tracks`(student, admin) → `{ name, tracks: { slug, title, label, year, src, duration }[] }` — `src = MEDIA_BASE + '/' + file`, 사라진 곡 제외, 세션 사용자 기준만.
- `GET /api/accounts/admin/calls?from=YYYY-MM-DD&to=YYYY-MM-DD` → `{ from, to, total, byDay, byPath, byRef }`(기본 최근 30일, 페이지·유입은 상위 10). 기존 `call_clicks` 테이블을 읽기만 한다.

- [x] **Step 1: 실패하는 테스트** — 수강생은 자기 곡만(`?userId` 무시) / 사라진 곡은 수강생 결과에서 빠지고 관리자에겐 표시 / 모르는 slug 400 / 강사 계정 연결 400 / 집계가 유입 호스트별로 합쳐짐
- [x] **Step 2~4** / **Step 5: Commit** — `feat(accounts): track linking, my tracks, call summary APIs`

---

### Task 5: 로그인, 마이페이지, 관리자 화면

**Files:**
- Create: `src/pages/login.astro`, `src/pages/my.astro`, `src/pages/admin.astro`, `src/features/accounts/*.ts`
- Test: `tests/e2e/accounts.spec.ts`

**화면:**
- `/login`: 아이디, 비밀번호, Turnstile 위젯(`PUBLIC_TURNSTILE_SITEKEY`), [로그인] 키캡. 성공 시 admin → `/admin`, 그 외 → `/my`. 이미 로그인 상태면 바로 이동.
- `/my` (student·admin): `{name}님`, "내 곡" 모듈 — `TrackList`와 같은 마크업을 그리고 `list-my` JSON을 주입해 기존 플레이어로 재생. 0곡이면 `아직 연결된 곡이 없습니다.` 관리자에게는 [관리자 화면] 키캡도 보인다. [로그아웃].
- `/my` (teacher): `{name}님`, `강사 기능은 준비 중입니다.`, [로그아웃]
- `/admin`: ① 계정(목록 표: 아이디·이름·나이·역할·상태·마지막 로그인, [계정 만들기] 폼, 행마다 [비밀번호 재지정] [비활성화/활성화] [곡 연결]) ② 곡 연결(선택한 수강생의 체크리스트, 카테고리·연도별 묶음, 검색 필터, [저장]) ③ 전화 클릭(최근 30일 합계, 날짜별, 유입·페이지별 상위 10)
- 401 → `/login`, 403 → `/my`. 세 페이지 모두 `noindex`, 화면 전환 시 플레이어 유지.
- 전화 클릭 숫자는 로그인한 관리자에게만 브라우저에서 그려지므로 공개 페이지의 숫자 요약 금지 규칙과 무관하다(정적 HTML에는 숫자가 없어 check-build도 통과).

**e2e 방식:** e2e는 `astro preview`(Worker 없음)로 돌기 때문에 `page.route('**/api/accounts/**')`로 API를 가짜 응답으로 바꿔 화면 흐름만 확인한다. 서버 동작은 Task 2~4의 Worker 테스트가 맡는다. 실제 연결은 Task 6에서 `wrangler dev`로 한 번 손으로 확인한다.

- [x] **Step 1: 실패하는 e2e** — 수강생 로그인 → `/my`에 곡 2개 → 재생 / 수강생이 `/admin` 열면 `/my`로 / 관리자 계정 만들기 → 목록에 행 → 곡 체크 저장 요청 본문 확인 / 세 페이지 `noindex`
- [x] **Step 2: 실패 확인** — `npx playwright test tests/e2e/accounts.spec.ts`
- [x] **Step 3: 구현** / **Step 4: 통과 확인** + `npm run build`(check-build 0건)
- [x] **Step 5: Commit** — `feat(accounts): login, my page and admin screens`

---

### Task 6: 첫 관리자 계정과 배포

**Files:**
- Create: `scripts/create-admin.ts`, `docs/areas/accounts/operations.md`(계정 만들기, 곡 연결, 비밀번호 재지정 절차)
- Modify: `.env.production`(`PUBLIC_TURNSTILE_SITEKEY` — 공개 값), `docs/areas/accounts/README.md`

**Interfaces:** `npx tsx scripts/create-admin.ts --login <id> --name <이름> [--birth <연도>]` — 비밀번호를 터미널에서 숨김 입력(두 번)받아 `worker/accounts/password.ts`로 해시하고 `wrangler d1 execute midipro --remote`로 넣는다. 비밀번호는 화면·파일·셸 기록에 남기지 않는다(`--local`로 연습 가능).

- [ ] **Step 1 (원장님): Turnstile 위젯 만들기** — Cloudflare 대시보드 → Turnstile → 위젯 추가(도메인 `midipro.kr`), 사이트 키를 알려주시고, 비밀 키는 `npx wrangler secret put TURNSTILE_SECRET`로 직접 등록
- [x] **Step 2 (제가): 원격 D1에 마이그레이션 적용** — `npx wrangler d1 migrations apply midipro --remote` (자동 배포는 마이그레이션을 적용하지 않으므로 main 합치기 **전에** 한다. 새 테이블만 추가하므로 현재 사이트에 영향 없음)
- [ ] **Step 3 (원장님): 첫 관리자 만들기** — `npx tsx scripts/create-admin.ts --login <아이디> --name <이름>` 실행 후 비밀번호 직접 입력
- [ ] **Step 4: 원장님 승인 후 main에 합치기** → 자동 배포 → 휴대폰에서 로그인 → 수강생 계정 생성 → 곡 연결 → 수강생으로 로그인해 재생
- [x] **Step 5: Commit** — `chore(accounts): admin bootstrap script and operations guide`

---

## 단계 C (별도 계획, 시험 영역)

월말고사·모의고사 양식 파일을 받으면 `exam_results` 스키마, 관리자 입력 화면, 마이페이지 조회 화면을 설계한다. 세션 확인은 `worker/core/session.ts`의 `requireUser`를 그대로 쓴다.
