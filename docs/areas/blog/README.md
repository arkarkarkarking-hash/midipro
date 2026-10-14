# 영역: 블로그

**상태 (2026-10-14):** 홈페이지 블로그·원고 도구 구현 완료(브랜치 `area/blog-setup`, main 반영 전 — 첫 글 승인 대기). 설계: [specs/2026-10-14-blog-automation-design.md](specs/2026-10-14-blog-automation-design.md), 계획: [plans/2026-10-14-blog-site-and-tools.md](plans/2026-10-14-blog-site-and-tools.md).

## 운영 요약
- 주 3회(월·수·금), 원고 하나 → 네이버용·홈페이지용 두 버전. 네이버 본문 800~1,200자 필수.
- 매주 순서: [weekly.md](weekly.md). 재료는 `~/Desktop/블로그재료/`.
- 홈페이지 먼저 발행, 네이버는 원장님이 붙여넣고 첫·마지막 문단을 직접 고쳐 발행.

## 만든 것
| 무엇 | 위치 |
|---|---|
| 목록·글 화면, 분류(현장/정보) | `src/pages/blog/`, `src/features/blog/` |
| 원고 형식(머리말 검사) | `src/content.config.ts`, `src/features/blog/posts.ts` |
| 대표 이미지 자동 생성 | `src/pages/og/blog/[slug].png.ts` |
| RSS(블로그 + 음원), 메뉴 "블로그" | `src/pages/rss.xml.ts`, `src/lib/nav.ts` |
| 네이버 원고 검사 | `npm run check:blog` (`scripts/check-blog.ts`, `scripts/lib/naver.ts`) |
| 미리보기 페이지(복사 버튼) | `scripts/blog-preview.ts` |
| 사진 손질·얼굴 흐림·R2 업로드 | `npm run blog:photos` (`scripts/blog-photos.ts`, `scripts/lib/blur-faces.swift`) |

## 남은 일
- 첫 글 `2026-10-19-blog-start` 원장님 승인 → main 반영.
- 8월 모의고사 글: 네이버 원고 완료, 홈페이지 버전 미작성(사진 R2 업로드 필요).
- 첫 달 주제표 `content/blog/plan/`, 예약 작업 2개(토 03:05 주간 초안, 매달 1일 보고서).
