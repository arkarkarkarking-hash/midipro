# 주간 초안 작업 절차서

토요일 03:05 예약 작업(또는 원장님이 "이번 주 초안"이라고 할 때)이 이 순서를 그대로 따른다. 설계서: `specs/2026-10-14-blog-automation-design.md`.

모든 명령은 저장소 루트에서, `export PATH=~/.local/node/bin:$PATH` 후 실행한다.

## 0. 준비

- `git switch main && git pull` 후 `git switch -c area/blog-week-YYYY-MM-DD` (다음 주 월요일 날짜).
- 이번 주 발행일: 다음 주 **월·수·금**. 파일 이름의 날짜 = 발행일.

## 1. 주제 정하기

- `content/blog/plan/YYYY-MM.md`에서 그 주 월·수·금 주제를 확인한다.
- 현장 글 주제는 `~/Desktop/블로그재료/` 안의 날짜 폴더와 `메모.txt`가 있어야 쓴다. 없으면 같은 주의 정보 글로 바꾸고, 바꿨다는 사실을 알림과 미리보기 맨 위에 적는다.
- 사실은 메모와 원장님 답변에 있는 것만 쓴다. 모르는 사실(날짜, 대상, 내용)은 지어내지 말고 원장님께 질문으로 남긴다.

## 2. 사진

- 모든 사진을 열어 본다. 얼굴이 보이는 사진은 메모에 `얼굴 OK: N번`이 있을 때만 그대로 쓰고, 나머지는 흐림 처리하거나 뺀다.
- 다른 가게 간판·전화번호, 학생 이름이 보이는 화면도 `--box`로 가린다.
- 찍은 날짜(`mdls -name kMDItemContentCreationDate`)를 확인해 글 내용과 시점이 맞는지 본다.
- 현장 글 네이버 6~10장, 정보 글 3~5장. 정보 글 사진은 `_사진은행`에서 고르고, 쓴 사진은 `_사진은행/_사용함/`으로 옮긴다.

```bash
npm run blog:photos -- --src "<재료 폴더>" --slug <slug> --files a.jpg,b.HEIC --blur a.jpg [--nobody b.HEIC] [--box "b.HEIC=x,y,w,h"] --upload
```

- 결과 `네이버용/NN.jpg`를 한 장씩 열어 얼굴·간판이 다 가려졌는지 눈으로 확인한다. 자동 인식은 옆얼굴·작은 얼굴을 놓친다.

## 3. 원고

- 홈페이지용: `content/blog/<slug>.md`, `draft: true`. 이미지는 업로드된 `https://media.midipro.kr/blog/<slug>/NN.jpg`만, `![설명](주소)`.
- 네이버용: `content/blog/naver/<slug>.md` — 머리말 `title`, `tags`, `photos`; 소제목 `## ` 3~4개, 사진 자리 `[[사진 NN]]`, 마지막 줄 `https://midipro.kr/blog/<slug>`.
- 네이버 본문은 **800~1,200자 필수**. 짧으면 사실에 근거해 채운다(지어내기 금지).
- 두 버전은 같은 사실, 다른 문장. 네이버는 친근한 말투 + 지역 키워드 제목, 홈페이지는 정리된 설명체.

## 4. 검사

```bash
npm run check:blog
```

오류가 0이 될 때까지 고친다.

## 5. 미리보기와 알림

```bash
npx tsx scripts/blog-preview.ts <월 slug> <수 slug> <금 slug> --out <파일.html> --photo-base "photos/"
```

- 사진을 `photos/<NN>.jpg` 대신 글마다 다른 폴더에 두려면 글 하나씩 미리보기를 만든다.
- 비공개 Artifact로 게시하고(사진은 `files`로 함께), 원장님께 알림: "이번 주 초안 3편 준비됨 + 링크 + 원장님께 확인할 질문".

## 6. 커밋과 발행

- 초안을 브랜치에 커밋한다(`content(blog): week of YYYY-MM-DD drafts`). `main`에는 올리지 않는다.
- 원장님이 승인하면 발행일마다: 홈페이지 원고 `draft: false` → `npm test && npm run build` → `main`에 합치기(자동 배포) → 원장님이 네이버에 올린다.
