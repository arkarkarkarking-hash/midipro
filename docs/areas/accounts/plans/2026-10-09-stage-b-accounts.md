# 단계 B: 로그인, 수강생 마이페이지, 관리자 화면 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 만든 계정으로 로그인하고, 수강생은 마이페이지에서 자기 곡을 듣고, 관리자는 계정과 곡 연결을 관리하며 전화 클릭 집계를 본다.

**Architecture:** 단계 A의 Worker(`worker/index.ts`)에 인증 API를 더한다. `/login`, `/admin`, `/my`는 Astro가 만든 정적 껍데기 페이지이고, 데이터는 모두 세션 쿠키로 보호된 `/api/*`에서 받는다. 계정·세션·곡 연결은 D1에 저장한다.

**Tech Stack:** 단계 A와 같음 + Cloudflare Turnstile, Web Crypto PBKDF2, `@cloudflare/vitest-pool-workers`

**Spec:** `docs/project/2026-10-09-site-redesign-design.md` (6장)

**전제:** 단계 A 계획 완료(Worker, D1 `midipro`, `tracks.json`, 디자인 컴포넌트, 플레이어가 존재).

## Global Constraints

- 역할: `admin`, `teacher`, `student`. 회원가입·비밀번호 변경·비밀번호 찾기 없음.
- 계정 저장 항목은 아이디, 이름, 출생연도, 역할, 비밀번호 해시, 상태뿐이다. 연락처·이메일 등 다른 항목을 추가하지 않는다.
- 비밀번호: PBKDF2-SHA256, 반복 100,000회, 사용자별 16바이트 무작위 솔트, 32바이트 키. 저장 형식 `pbkdf2$100000$<salt b64>$<hash b64>`. 비교는 상수 시간.
- 세션: 32바이트 무작위 토큰(base64url), D1에는 토큰의 SHA-256만 저장. 쿠키 `mp_session`, `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`. 유효기간 7일.
- 잠금: 같은 계정 5회 연속 실패 시 15분 잠금. 잠긴 동안은 비밀번호가 맞아도 거부. 성공하면 실패 횟수 0.
- 로그인 실패 메시지는 항상 `아이디 또는 비밀번호가 올바르지 않습니다.`(계정 존재 여부를 드러내지 않음). 잠금 시 `잠시 후 다시 시도해 주세요.`
- Turnstile은 로그인에만. 서버에서 `https://challenges.cloudflare.com/turnstile/v0/siteverify`로 검증.
- 상태를 바꾸는 API는 POST만 받고 `Origin` 헤더가 요청 호스트와 같아야 한다(다르면 403).
- `/login`, `/admin`, `/my`: `<meta name="robots" content="noindex">`, sitemap 제외, 공개 페이지에서 링크는 헤더의 [로그인] 키캡 하나만.
- 관리자는 모든 화면과 API에 접근한다. 강사는 1차에서 `/my`의 "준비 중"만 본다. 수강생은 자기에게 연결된 곡만 조회한다.
- 마이페이지에서 내용이 없는 항목은 화면에 넣지 않는다("준비 중" 빈 칸 금지). 단, 연결된 곡이 0개인 수강생에게는 `아직 연결된 곡이 없습니다.` 한 줄을 보여준다.
- 디자인은 단계 A의 랙 컴포넌트만 쓴다.

## Review Focus

1. **잠금 시간 경계**: 15분이 막 지난 직후에는 로그인이 되어야 하고, 잠금 중 시도는 실패 횟수를 늘리지 않아야 한다. (Task 2 테스트)
2. **비활성화된 계정의 살아 있는 세션**: 관리자가 비활성화하면 그 계정의 기존 세션이 즉시 무효가 되어야 한다. (Task 3 테스트)
3. **수강생이 다른 수강생 곡 목록을 요청**: `/api/my/tracks`는 쿼리나 본문의 사용자 ID를 무시하고 세션의 사용자만 쓴다. 관리자 API를 수강생 쿠키로 부르면 403. (Task 3 테스트)
4. **`tracks.json`에서 사라진 곡이 D1 연결에 남은 경우**: 마이페이지는 그 곡을 조용히 건너뛰고 오류를 내지 않는다. 관리자 화면에는 `삭제된 곡` 표시. (Task 5 테스트)
5. **아이디 중복과 공백**: 아이디는 소문자로 저장하고 앞뒤 공백을 제거하며, 대소문자만 다른 중복을 거부한다. 형식 `^[a-z0-9_]{4,20}$`. (Task 4 테스트)

---

### Task 1: D1 스키마

**Files:**
- Create: `migrations/0002_accounts.sql`
- Test: `tests/worker/schema.test.ts`

**Interfaces:**
- Produces:
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
(시각은 모두 Unix 초)

- [ ] **Step 1: 테스트** — 마이그레이션 적용 후 `role='guest'` 삽입이 실패하고, 같은 `login_id` 두 번 삽입이 실패한다.
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run -c vitest.workers.config.ts tests/worker/schema.test.ts` / Expected: FAIL
- [ ] **Step 3: SQL 작성** / **Step 4: 통과 확인**
- [ ] **Step 5: Commit** — `git commit -m "feat: accounts schema"`

---

### Task 2: 비밀번호, 세션, 로그인 API

**Files:**
- Create: `worker/auth/password.ts`, `worker/auth/session.ts`, `worker/auth/turnstile.ts`, `worker/routes/auth.ts`, `worker/http.ts`
- Modify: `worker/index.ts`(라우팅 추가)
- Test: `tests/worker/password.test.ts`, `tests/worker/auth.test.ts`

**Interfaces:**
- Produces:
  - `hashPassword(plain: string): Promise<string>`, `verifyPassword(plain: string, stored: string): Promise<boolean>`
  - `createSession(db: D1Database, userId: number, now: number): Promise<string>`(토큰 원문 반환), `getSessionUser(db, token: string, now: number): Promise<SessionUser | null>` — 만료·비활성 계정이면 null, `deleteSession(db, token)`, `deleteUserSessions(db, userId)`
  - `type SessionUser = { id: number; loginId: string; name: string; role: 'admin'|'teacher'|'student' }`
  - `verifyTurnstile(secret: string, token: string, ip: string | null): Promise<boolean>`
  - `requireUser(req, env, roles?: SessionUser['role'][]): Promise<SessionUser | Response>` in `worker/http.ts` — 쿠키 없음/무효 401, 역할 불일치 403
  - `checkOrigin(req): Response | null` — POST의 Origin 불일치 시 403 응답
  - `POST /api/auth/login` `{ loginId, password, turnstileToken }` → 200 `{ role, name }` + `Set-Cookie`; 실패 401 `{ error }`; 잠금 429 `{ error }`
  - `POST /api/auth/logout` → 204, 쿠키 삭제(`Max-Age=0`)
  - `GET /api/auth/me` → 200 `SessionUser` 또는 401
  - Env: `TURNSTILE_SECRET`(Secret). 테스트는 Cloudflare 공식 항상 통과 키 `1x0000000000000000000000000000000AA`와 항상 실패 키 `2x0000000000000000000000000000000AA` 사용.
  - 라우트 핸들러는 현재 시각을 `now: number`(Unix 초) 인자로 받는다. `worker/index.ts`만 `Math.floor(Date.now() / 1000)`을 넘기고, 테스트는 고정값을 넘긴다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('hash roundtrip and format', async () => {
  const h = await hashPassword('pass1234');
  expect(h).toMatch(/^pbkdf2\$100000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  expect(await verifyPassword('pass1234', h)).toBe(true);
  expect(await verifyPassword('pass1235', h)).toBe(false);
});
test('login sets HttpOnly cookie and /me returns user', ...);
test('wrong password returns generic message', ...);           // 존재하지 않는 아이디와 같은 응답 본문
test('5 failures lock for 15 minutes', ...);                    // 5회 실패 → 6회째 맞는 비번도 429
test('lock attempts do not extend lock; login works at +900s', ...);
test('turnstile failure returns 401 without counting failure', ...);
test('cross-origin POST is 403', ...);
test('expired session is rejected', ...);                        // now + 604801
test('logout deletes session', ...);
```

- [ ] **Step 2: 실패 확인** / **Step 3: 구현** / **Step 4: 통과 확인**
- [ ] **Step 5: Commit** — `git commit -m "feat: password hashing, sessions, login API"`

---

### Task 3: 관리자 계정 API

**Files:**
- Create: `worker/routes/admin-users.ts`, `worker/validate.ts`
- Test: `tests/worker/admin-users.test.ts`

**Interfaces:**
- Consumes: `requireUser(req, env, ['admin'])`, `hashPassword`, `deleteUserSessions`
- Produces (모두 admin 전용):
  - `GET /api/admin/users` → `{ users: { id, loginId, name, birthYear, age, role, status, lastLoginAt }[] }` — `age = 올해(Asia/Seoul) - birthYear`(birthYear 없으면 null)
  - `POST /api/admin/users` `{ loginId, name, birthYear?, role, password }` → 201 `{ id }`; 중복 409 `{ error: '이미 사용 중인 아이디입니다.' }`
  - `POST /api/admin/users/:id/password` `{ password }` → 204, 그 사용자의 모든 세션 삭제, 실패 횟수와 잠금 해제
  - `POST /api/admin/users/:id/status` `{ status: 'active'|'disabled' }` → 204, `disabled`면 세션 모두 삭제. 자기 자신을 비활성화하려 하면 400.
  - `validateUserInput(body): { ok: true; value } | { ok: false; error: string }` in `worker/validate.ts`:
    - loginId: trim, 소문자, `^[a-z0-9_]{4,20}$`
    - name: trim, 1~20자
    - birthYear: 정수, 1940 ≤ y ≤ 올해
    - password: 4~64자 (관리자가 지정하는 값이므로 복잡도 규칙 없음)
    - role: 세 값 중 하나

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('student cookie gets 403 on admin API', ...);
test('creates user with lowercased trimmed loginId', ...);       // ' Kim_01 ' → 'kim_01'
test('rejects case-only duplicate', ...);                         // 'kim_01' 있을 때 'KIM_01' → 409
test('age computed from birthYear', ...);
test('disable kills existing session immediately', ...);          // 비활성화 후 그 쿠키로 /api/auth/me → 401
test('password reset clears lock and sessions', ...);
test('admin cannot disable self', ...);
```

- [ ] **Step 2: 실패 확인** / **Step 3: 구현** / **Step 4: 통과 확인**
- [ ] **Step 5: Commit** — `git commit -m "feat: admin user management API"`

---

### Task 4: 곡 연결 API와 내 곡 API, 전화 클릭 조회

**Files:**
- Create: `worker/routes/admin-tracks.ts`, `worker/routes/my.ts`, `worker/tracks-index.ts`, `worker/routes/admin-calls.ts`
- Test: `tests/worker/tracks.test.ts`, `tests/worker/admin-calls.test.ts`

**Interfaces:**
- Consumes: `src/data/tracks.json`(Worker 번들에 import), `requireUser`
- Produces:
  - `trackIndex: Map<string, { slug; title; label; year; file; duration }>` in `worker/tracks-index.ts`
  - `GET /api/admin/users/:id/tracks` → `{ tracks: { slug, title, missing: boolean }[] }`(사라진 곡은 `title: '삭제된 곡'`, `missing: true`)
  - `POST /api/admin/users/:id/tracks` `{ slugs: string[] }` → 204, 해당 사용자의 연결을 이 목록으로 **교체**. 모르는 slug가 하나라도 있으면 400. 대상이 student가 아니면 400.
  - `GET /api/my/tracks`(student, admin) → `{ name, tracks: { slug, title, label, year, src, duration }[] }` — `src`는 `env.MEDIA_BASE` + `/` + `file`. 사라진 곡은 결과에서 제외. 세션 사용자 기준만(쿼리 파라미터 무시).
  - `GET /api/admin/calls?from=YYYY-MM-DD&to=YYYY-MM-DD` → `{ byDay: {day,count}[], byPath: {path,count}[], byRef: {refHost,count}[] }`(기본: 최근 30일)
  - Env: `MEDIA_BASE`(vars, 단계 A의 `PUBLIC_MEDIA_BASE`와 같은 값)

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('student sees only own tracks, ignores ?userId', ...);
test('missing slug is skipped for student and flagged for admin', ...);  // D1에 'gone-slug' 직접 삽입
test('replace links rejects unknown slug', ...);
test('linking to teacher account is 400', ...);
test('calls summary aggregates by ref host', ...);
```

- [ ] **Step 2: 실패 확인** / **Step 3: 구현** / **Step 4: 통과 확인**
- [ ] **Step 5: Commit** — `git commit -m "feat: track linking, my tracks and call summary APIs"`

---

### Task 5: 로그인, 마이페이지, 관리자 화면

**Files:**
- Create: `src/pages/login.astro`, `src/pages/my.astro`, `src/pages/admin.astro`, `src/components/account/*.ts`(화면별 클라이언트 스크립트), `src/lib/api-client.ts`
- Modify: `src/components/Header.astro`(로그인 상태면 [로그인] 키캡 대신 [마이페이지] 또는 [관리자]), `astro.config.mjs` sitemap 필터에 세 경로 추가
- Test: `tests/e2e/accounts.spec.ts`

**Interfaces:**
- Consumes: Task 2~4의 API, 단계 A의 `RackUnit`, `Keycap`, `TrackList` 마크업 규칙과 `data-play-list`(플레이어가 그대로 재생)
- Produces:
  - `/login`: 아이디, 비밀번호, Turnstile 위젯(`PUBLIC_TURNSTILE_SITEKEY`), [로그인] 키캡. 성공 시 admin → `/admin`, 그 외 → `/my`. 이미 로그인 상태로 오면 바로 이동.
  - `/my` (student): `{name}님`, 1U 모듈 "내 곡" — API 결과로 `TrackList`와 같은 마크업을 그리고 `<script type="application/json" id="list-my">`를 주입해 재생 연결. 0곡이면 `아직 연결된 곡이 없습니다.`
  - `/my` (teacher): `{name}님`, `강사 기능은 준비 중입니다.`, [로그아웃]
  - `/admin`: 세 모듈 — ① 계정(목록 표, [계정 만들기] 폼: 아이디·이름·출생연도·역할·비밀번호, 행마다 [비밀번호 재지정] [비활성화/활성화] [곡 연결]) ② 곡 연결(선택한 수강생의 곡 체크리스트, `tracks.json` 전체를 카테고리·연도별로 묶고 검색 입력으로 필터, [저장]) ③ 전화 클릭(최근 30일 합계, 유입 호스트별·페이지별 상위 10)
  - 401을 받으면 `/login`으로, 403이면 `/my`로 이동
  - 세 페이지 모두 `noindex`, ClientRouter 전환 시에도 플레이어 유지

- [ ] **Step 1: 실패하는 e2e 테스트 작성** (로컬 `wrangler dev`에 테스트 계정 시드: admin `admin_test`, student `stu_test` + 곡 2개 연결, Turnstile 테스트 사이트키 `1x00000000000000000000AA`)

```ts
test('student logs in and plays own track', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('아이디').fill('stu_test'); await page.getByLabel('비밀번호').fill('pass1234');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).toHaveURL('/my');
  await expect(page.locator('[data-track-row]')).toHaveCount(2);
});
test('student cannot open admin', async ({ page }) => { /* 로그인 후 /admin → /my 로 이동 */ });
test('admin creates student and links a track', async ({ page }) => { /* 폼 제출 → 목록에 행 → 곡 1개 체크 저장 → 다시 열면 체크 유지 */ });
test('account pages are noindex', async ({ request }) => {
  for (const p of ['/login','/my','/admin']) expect(await (await request.get(p)).text()).toContain('content="noindex"');
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx playwright test tests/e2e/accounts.spec.ts` / Expected: FAIL
- [ ] **Step 3: 구현** / **Step 4: 통과 확인**
- [ ] **Step 5: Commit** — `git commit -m "feat: login, my page and admin screens"`

---

### Task 6: 첫 관리자 계정과 배포

**Files:**
- Create: `scripts/create-admin.ts`
- Modify: `wrangler.jsonc`(`vars.MEDIA_BASE`), `docs/operations.md`(새 파일: 계정 만들기, 곡 연결, 곡 추가 절차)

**Interfaces:**
- Produces: `npx tsx scripts/create-admin.ts --login <id> --name <이름>` — 비밀번호를 터미널에서 숨김 입력받아 `hashPassword`와 같은 형식으로 해시하고 `wrangler d1 execute midipro --remote --command "INSERT …"`를 실행. 비밀번호는 화면·파일·셸 기록에 남기지 않는다.

- [ ] **Step 1: 마이그레이션 적용** — Run: `npx wrangler d1 migrations apply midipro --remote` / Expected: `0002_accounts.sql ✅`
- [ ] **Step 2: Turnstile 위젯 생성(사용자, 대시보드)** 후 비밀 키 등록 — Run: `npx wrangler secret put TURNSTILE_SECRET` / Expected: `Success`
- [ ] **Step 3: 첫 관리자 생성(원장님이 직접 비밀번호 입력)** — Run: `npx tsx scripts/create-admin.ts --login <원장님 아이디> --name <이름>` / Expected: `admin created`
- [ ] **Step 4: 배포와 실기 점검** — `npx wrangler deploy` 후 휴대폰에서 로그인 → 관리자 화면 → 수강생 계정 생성 → 곡 연결 → 수강생으로 로그인해 재생
- [ ] **Step 5: Commit** — `git commit -m "chore: admin bootstrap script and operations guide"`

---

## 단계 C (별도 계획)

월말고사·모의고사 양식 파일을 받으면 `exam_results` 스키마, 관리자 입력 화면, 마이페이지 조회 화면을 설계하고 이 형식으로 계획을 쓴다.
