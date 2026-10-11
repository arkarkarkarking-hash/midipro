# 영역: 로그인·관리자

**상태 (2026-10-11):** 구현 완료(브랜치 `area/accounts-login`), 배포 준비 중. 원격 DB 표 만들기 완료(2026-10-11). 남은 일은 Turnstile 키 등록·첫 관리자 생성·main 합치기.

- 계획: `plans/2026-10-09-stage-b-accounts.md` (Task 1~6)
- 운영 안내(원장님용): `operations.md`
- 범위: 관리자가 만든 계정(아이디·이름·출생연도·역할)으로 로그인, 비밀번호 변경 없음(관리자가 재지정), 관리자는 전체 접근, 수강생 마이페이지(내 곡), 강사는 "준비 중", 관리자 화면(계정·곡 연결·전화 클릭 집계)
- 2차로 미룬 것: 강사 화면, 관리자·강사 공유 주간 코멘트(수강생에게 비공개)

## 구조

- 서버: `worker/accounts/` (`/api/accounts/*`), 세션·Origin 확인은 `worker/core/session.ts`, `worker/core/http.ts`(시험 영역도 `requireUser`를 쓴다)
- 화면: `src/pages/login|my|admin.astro`, 스크립트·스타일 `src/features/accounts/`
- DB: `migrations/0002_accounts.sql` (`users`, `sessions`, `user_tracks`)
- 첫 관리자·비상 비밀번호 재설정: `scripts/create-admin.ts`
- 설정: Worker 변수 `MEDIA_BASE`(wrangler.jsonc), 비밀 `TURNSTILE_SECRET`(wrangler secret), 빌드 변수 `PUBLIC_TURNSTILE_SITEKEY`(.env.production)

## 결정 (2026-10-11)

- 헤더의 [로그인] 키캡은 그대로 둔다. 로그인한 사람이 `/login`에 오면 바로 `/admin` 또는 `/my`로 보낸다(모든 페이지에서 로그인 확인 요청을 하지 않기 위해).
- e2e는 `astro preview`로 돌기 때문에 API를 가짜 응답으로 바꿔 화면만 확인한다. 서버 동작은 `tests/worker/accounts/`가 맡는다.
- 공용 부품 변경: `Keycap`에 `type="submit"`이 먹도록 고침.
