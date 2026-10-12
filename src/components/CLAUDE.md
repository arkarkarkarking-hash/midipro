# 공용 디자인 부품

모든 영역이 함께 쓰는 부품이다(패널 `RackUnit`, 버튼 `Keycap`, 헤더·자 눈금·하단바·푸터, 플레이어, 곡 목록, 파형). 이름은 예전 랙 디자인에서 물려받았지만 지금은 설계도(블루프린트) 디자인이다.
로그인 화면이 의존하는 것: `Keycap`의 `type` 속성, `TrackList`의 `data-track-row`·`data-slug`·`data-play-list`·`data-index`·`.tl__title`·`.tl__sub`·`.tl__ch`·`.tl__dur`·`list-<id>` 스크립트, 헤더 로그인 링크의 `data-account-link`, `RackUnit`의 나머지 속성 전달.
여기를 바꾸면 웹사이트·로그인·시험·블로그 화면이 모두 바뀐다. 바꾼 뒤 `npm test && npm run build && npm run test:e2e`를 돌린다.
영역 전용 부품은 여기 말고 `src/features/<영역>/`에 만든다.
