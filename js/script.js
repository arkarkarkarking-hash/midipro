// 전역에서 사용할 오디오 플레이어 관련 변수 선언
let audioElement, playPauseBtn, currentTrackSpan;
let audioInitialized = false;  // 오디오 플레이어가 초기화되었는지 여부

document.addEventListener('DOMContentLoaded', () => {
  /* -------------------------------------------------
     1) SPA 라우팅을 위한 HTML 템플릿 정의
  ------------------------------------------------- */
  const routes = {
    home: `
      <section id="home-content">
    <div class="swiper myDynamicSwiper">
    <div class="swiper-wrapper">
      <div class="swiper-slide"><img src="image/swiper1.jpg" alt="홈">Dynamic Slide 1</div>
      <div class="swiper-slide"><img src="image/swiper2.jpg" alt="홈">Dynamic Slide 2</div>
    </div>
    <!-- 동적 페이지네이션 -->
    <div class="swiper-pagination"></div>
  </div>

  <div class="card-grid">
<!-- Broken bell -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1573767291321-c0af2eaf5266?q=80&w=2036&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Broken bell"> 
    <div class="card-info">
      <h3 class="card-title">Broken bell</h3> 
      <p class="card-creator">[24년 하반기 송캠프] Swag(김주빈,장정민)</p>
    </div>
</div>
<!-- Metrospect -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1552072232-059f1a5d76c5?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Metrospect"> 
    <div class="card-info">
      <h3 class="card-title">Metrospect</h3> 
      <p class="card-creator">[24년 하반기 송캠프] Nock(한건희,정하윤,박수빈)</p>
    </div>
</div>
<!-- 온기 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1505995433366-e12047f3f144?q=80&w=2038&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="온기"> 
    <div class="card-info">
      <h3 class="card-title">온기</h3> 
      <p class="card-creator">[24년 하반기 송캠프] 우리들(김승연,정지윤,맹지환)</p>
    </div>
</div>
<!-- 잔향 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1584385002340-d886f3a0f097?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="잔향"> 
    <div class="card-info">
      <h3 class="card-title">잔향</h3> 
      <p class="card-creator">[24년 하반기 송캠프] 무드먼트(이성민,안예진,박시은)</p>
    </div>
</div>
<!-- Search An Answer -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1597589827317-4c6d6e0a90bd?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Search An Answer"> 
    <div class="card-info">
      <h3 class="card-title">Search An Answer</h3> 
      <p class="card-creator">[24년 하반기 송캠프] 갈팡질팡(김준우,박종한,박상혁)</p>
    </div>
</div>
<!-- burn up! (feat.신하영) -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1556703588-6eae2585e025?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="burn up! (feat.신하영)"> 
    <div class="card-info">
      <h3 class="card-title">burn up! (feat.신하영)</h3> 
      <p class="card-creator">[24년 하반기 송캠프] 18.5(김민규,안세린,권주연,장효정)</p>
    </div>
</div>
<!-- Prehnite&Morganite_PERSONA -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1451187863213-d1bcbaae3fa3?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Prehnite&Morganite_PERSONA"> 
    <div class="card-info">
      <h3 class="card-title">Prehnite&Morganite_PERSONA</h3> 
      <p class="card-creator">[24년 상반기 송캠프] PERSONA(이태환,성우혁)</p>
    </div>
</div>
<!-- 불빛 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1658227075465-020d5b11de9b?q=80&w=2114&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="불빛"> 
    <div class="card-info">
      <h3 class="card-title">불빛</h3> 
      <p class="card-creator">[24년 상반기 송캠프] GMKID(하민호,한건희)</p>
    </div>
</div>
<!-- illusion -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1508033245-496a38c4b1b4?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="illusion"> 
    <div class="card-info">
      <h3 class="card-title">illusion</h3> 
      <p class="card-creator">[24년 상반기 송캠프] 어차피우리가1등(김주빈,신이섭)</p>
    </div>
</div>
<!-- Summer night -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1703750960156-b8e765f5543c?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Summer night"> 
    <div class="card-info">
      <h3 class="card-title">Summer night</h3> 
      <p class="card-creator">[24년 상반기 송캠프] 불당공팔(방인준,오승연)</p>
    </div>
</div>
<!-- 파도 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1606234942951-b10a5b373ff0?q=80&w=2121&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="파도"> 
    <div class="card-info">
      <h3 class="card-title">파도</h3> 
      <p class="card-creator">[24년 상반기 송캠프] 고래(백서아,김민규)</p>
    </div>
</div>
<!-- 첫사랑 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1519001904187-92788a1b784d?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="첫사랑"> 
    <div class="card-info">
      <h3 class="card-title">첫사랑</h3> 
      <p class="card-creator">[24년 상반기 송캠프] 검은물(장효정,이성민)</p>
    </div>
</div>
<!-- Headache -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1701344176327-5f6c5163ec73?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Headache"> 
    <div class="card-info">
      <h3 class="card-title">Headache</h3> 
      <p class="card-creator">[23년 상반기 송캠프] PH(박시은팀)</p>
    </div>
</div>
<!-- 평행우주 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1562237329-3ce123028958?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="평행우주"> 
    <div class="card-info">
      <h3 class="card-title">평행우주</h3> 
      <p class="card-creator">[23년 상반기 송캠프] 하루살이(강윤우팀)</p>
    </div>
</div>
<!-- One-sided Love -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1732928730388-c61932f73a45?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="One-sided Love"> 
    <div class="card-info">
      <h3 class="card-title">One-sided Love</h3> 
      <p class="card-creator">[23년 상반기 송캠프] 작곡밥(이승연팀)</p>
    </div>
</div>
<!-- High! -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1685708525394-8824dc35c671?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="High!"> 
    <div class="card-info">
      <h3 class="card-title">High!</h3> 
      <p class="card-creator">[22년 하반기 싸이퍼] 김서진,김민혁,김종후</p>
    </div>
</div>
<!-- Present -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1623772201658-9ccee1223113?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Present"> 
    <div class="card-info">
      <h3 class="card-title">Present</h3> 
      <p class="card-creator">[22년 하반기 송캠프] 하민호,김서진,김민혁</p>
    </div>
</div>
<!-- (untitled) -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1701159850298-35999c07acca?q=80&w=2073&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="(untitled)"> 
    <div class="card-info">
      <h3 class="card-title">(untitled)</h3> 
      <p class="card-creator">[22년 하반기 송캠프] 김주빈,변동찬,김나영</p>
    </div>
</div>
<!-- 더위 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1712170472890-5af19d61f43a?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="더위"> 
    <div class="card-info">
      <h3 class="card-title">더위</h3> 
      <p class="card-creator">[22년 상반기 송캠프] M4 (김선우,권혜찬,김지윤,곽승민)</p>
    </div>
</div>
<!-- OceanWorld -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1630739190907-f1f30318b7c4?q=80&w=2049&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="OceanWorld"> 
    <div class="card-info">
      <h3 class="card-title">OceanWorld</h3> 
      <p class="card-creator">[22년 상반기 송캠프] Fantastic 4 (유호준,이종호,류인화,홍다연)</p>
    </div>
</div>
<!-- BOY -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1657344956545-8f49e1b1f661?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="BOY"> 
    <div class="card-info">
      <h3 class="card-title">BOY</h3> 
      <p class="card-creator">[22년 상반기 송캠프] 탬버린을 딩동딩동 (정우영,이훈,김이건)</p>
    </div>
</div>
<!-- Summer Night -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1708391603264-c01704b8c83c?q=80&w=2112&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Summer Night"> 
    <div class="card-info">
      <h3 class="card-title">Summer Night</h3> 
      <p class="card-creator">[22년 상반기 송캠프] 크로아상 (이서진,김지형,설다빈)</p>
    </div>
</div>
<!-- Personal Color -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1623665866030-529261da5d96?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Personal Color"> 
    <div class="card-info">
      <h3 class="card-title">Personal Color</h3> 
      <p class="card-creator">[22년 상반기 성인 송캠프] 최연주,정결,조성수</p>
    </div>
</div>
<!-- Fly Away -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1700295490741-c88afec82d85?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Fly Away"> 
    <div class="card-info">
      <h3 class="card-title">Fly Away</h3> 
      <p class="card-creator">[21년 2분기 송캠프] 이윤아,강온유,윤하영</p>
    </div>
</div>
<!-- 끝 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1628489481436-e8cb20576a9b?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="끝"> 
    <div class="card-info">
      <h3 class="card-title">끝</h3> 
      <p class="card-creator">[21년 2분기 송캠프] 이승민,전정병,김태현</p>
    </div>
</div>
<!-- Untitled -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1730641320179-a29b144810d8?q=80&w=2136&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Untitled"> 
    <div class="card-info">
      <h3 class="card-title">Untitled</h3> 
      <p class="card-creator">[21년 2분기 송캠프] 김선우,김민기,김호찬</p>
    </div>
</div>
<!-- Back Call Me -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Back Call Me"> 
    <div class="card-info">
      <h3 class="card-title">Back Call Me</h3> 
      <p class="card-creator">[21년 1분기 송캠프] 이윤아,김태현,김선호</p>
    </div>
</div>
<!-- Star of Sea -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1588260692987-01360da8185b?q=80&w=2026&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Star of Sea"> 
    <div class="card-info">
      <h3 class="card-title">Star of Sea</h3> 
      <p class="card-creator">[21년 1분기 송캠프] 윤하영,김우솔,이승민</p>
    </div>
</div>
<!-- We Don’t Give Up -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1531489956451-20957fab52f2?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="We Don’t Give Up"> 
    <div class="card-info">
      <h3 class="card-title">We Don’t Give Up</h3> 
      <p class="card-creator">[21년 1분기 송캠프] 강온유,전정병,김민기</p>
    </div>
</div>

<!-- 25_황시윤_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1628847355639-fa98190efc79?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="25_황시윤_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">25_황시윤_입시곡</h3> 
      <p class="card-creator">황시윤</p>
    </div>
</div>

<!-- 25_한건희_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1698732308311-98592dadedcc?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="25_한건희_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">25_한건희_입시곡</h3> 
      <p class="card-creator">한건희</p>
    </div>
</div>

<!-- 25_최가희_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1644860500493-5d118e2cc80a?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="25_최가희_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">25_최가희_입시곡</h3> 
      <p class="card-creator">최가희</p>
    </div>
</div>

<!-- 25_이승연_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1639768506860-2985d640c307?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="25_이승연_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">25_이승연_입시곡</h3> 
      <p class="card-creator">이승연</p>
    </div>
</div>

<!-- 25_김혜민_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1613142289371-766e4f568cff?q=80&w=2032&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="25_김혜민_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">25_김혜민_입시곡</h3> 
      <p class="card-creator">김혜민</p>
    </div>
</div>

<!-- 25_김지현_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1701687743136-6845cebda2d8?q=80&w=2131&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="25_김지현_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">25_김지현_입시곡</h3> 
      <p class="card-creator">김지현</p>
    </div>
</div>

<!-- 25_김승연_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1592920704646-99d0d6792133?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="25_김승연_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">25_김승연_입시곡</h3> 
      <p class="card-creator">김승연</p>
    </div>
</div>

<!-- 24_정우영_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1606498236653-daa6690c21ba?q=80&w=2055&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="24_정우영_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">24_정우영_입시곡</h3> 
      <p class="card-creator">정우영</p>
    </div>
</div>

<!-- 24_이훈_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1543347150-cc060bd84845?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="24_이훈_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">24_이훈_입시곡</h3> 
      <p class="card-creator">이훈</p>
    </div>
</div>

<!-- 24_이종호_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1636569518379-27fc9bdf16c4?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="24_이종호_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">24_이종호_입시곡</h3> 
      <p class="card-creator">이종호</p>
    </div>
</div>

<!-- 24_이서진_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1699604800237-95c3a4eae016?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="24_이서진_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">24_이서진_입시곡</h3> 
      <p class="card-creator">이서진</p>
    </div>
</div>

<!-- 24_이교빈_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1674668920910-85b8d3c187ca?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="24_이교빈_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">24_이교빈_입시곡</h3> 
      <p class="card-creator">이교빈</p>
    </div>
</div>

<!-- 24_유호준_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1737662374367-8fb0d598041d?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="24_유호준_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">24_유호준_입시곡</h3> 
      <p class="card-creator">유호준</p>
    </div>
</div>

<!-- 24_류인화_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1597754432231-f989c0a8d5cc?q=80&w=2054&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="24_류인화_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">24_류인화_입시곡</h3> 
      <p class="card-creator">류인화</p>
    </div>
</div>

<!-- 24_김지형_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1637514122357-abb455ced272?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="24_김지형_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">24_김지형_입시곡</h3> 
      <p class="card-creator">김지형</p>
    </div>
</div>

<!-- 24_김지윤_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1733837947585-77924c9d2826?q=80&w=2104&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="24_김지윤_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">24_김지윤_입시곡</h3> 
      <p class="card-creator">김지윤</p>
    </div>
</div>

<!-- 24_김이건_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1443181994330-3e365ff8949e?q=80&w=2081&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="24_김이건_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">24_김이건_입시곡</h3> 
      <p class="card-creator">김이건</p>
    </div>
</div>

<!-- 24_김선우_정시 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1689445418939-867178546d41?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="24_김선우_정시"> 
    <div class="card-info">
      <h3 class="card-title">24_김선우_정시</h3> 
      <p class="card-creator">김선우</p>
    </div>
</div>

<!-- 24_김선우_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/25/tower-section.jpg?q=80&w=2048&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="24_김선우_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">24_김선우_입시곡</h3> 
      <p class="card-creator">김선우</p>
    </div>
</div>

<!-- 24_김선우_수시 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1734614361637-cbf46608b858?q=80&w=2075&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="24_김선우_수시"> 
    <div class="card-info">
      <h3 class="card-title">24_김선우_수시</h3> 
      <p class="card-creator">김선우</p>
    </div>
</div>

<!-- 24_김서연_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1546237769-db6351c228d0?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="24_김서연_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">24_김서연_입시곡</h3> 
      <p class="card-creator">김서연</p>
    </div>
</div>

<!-- 24_곽승민_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1737592576772-e7e8889e8347?q=80&w=2079&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="24_곽승민_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">24_곽승민_입시곡</h3> 
      <p class="card-creator">곽승민</p>
    </div>
</div>

<!-- 23_허지영_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1585645909732-7bf0ceb138e0?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="23_허지영_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">23_허지영_입시곡</h3> 
      <p class="card-creator">허지영</p>
    </div>
</div>

<!-- 23_채민기_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1723138568430-797454947772?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="23_채민기_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">23_채민기_입시곡</h3> 
      <p class="card-creator">채민기</p>
    </div>
</div>

<!-- 23_김현서_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1598124686140-72793b30e144?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="23_김현서_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">23_김현서_입시곡</h3> 
      <p class="card-creator">김현서</p>
    </div>
</div>

<!-- 23_김민규_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1452687459977-921193bf89b2?q=80&w=2046&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="23_김민규_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">23_김민규_입시곡</h3> 
      <p class="card-creator">김민규</p>
    </div>
</div>

<!-- 23_권휘성_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1737207553492-446ab24bc8ac?q=80&w=2060&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="23_권휘성_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">23_권휘성_입시곡</h3> 
      <p class="card-creator">권휘성</p>
    </div>
</div>

<!-- 22_전정병_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1684741892777-f8e824722ceb?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="22_전정병_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">22_전정병_입시곡</h3> 
      <p class="card-creator">전정병</p>
    </div>
</div>

<!-- 22_이윤아_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1675757275576-c387423d1391?q=80&w=2059&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="22_이윤아_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">22_이윤아_입시곡</h3> 
      <p class="card-creator">이윤아</p>
    </div>
</div>

<!-- 22_이승민_정시 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1600813547757-39c40da12c8d?q=80&w=2022&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="22_이승민_정시"> 
    <div class="card-info">
      <h3 class="card-title">22_이승민_정시</h3> 
      <p class="card-creator">이승민</p>
    </div>
</div>

<!-- 22_이승민_수시 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1712488079891-50cc1dba8aab?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="22_이승민_수시"> 
    <div class="card-info">
      <h3 class="card-title">22_이승민_수시</h3> 
      <p class="card-creator">이승민</p>
    </div>
</div>

<!-- 22_윤하영_정시 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1721539584865-134ea847dbaf?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="22_윤하영_정시"> 
    <div class="card-info">
      <h3 class="card-title">22_윤하영_정시</h3> 
      <p class="card-creator">윤하영</p>
    </div>
</div>

<!-- 22_윤하영_수시 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1661071671858-f854163e9d21?q=80&w=2092&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="22_윤하영_수시"> 
    <div class="card-info">
      <h3 class="card-title">22_윤하영_수시</h3> 
      <p class="card-creator">윤하영</p>
    </div>
</div>

<!-- 22_윤상현_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1608878189616-775400b16034?q=80&w=2089&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="22_윤상현_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">22_윤상현_입시곡</h3> 
      <p class="card-creator">윤상현</p>
    </div>
</div>

<!-- 22_박채웅_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1637761566180-9dbde4fdab77?q=80&w=2081&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="22_박채웅_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">22_박채웅_입시곡</h3> 
      <p class="card-creator">박채웅</p>
    </div>
</div>

<!-- 22_김호찬_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1645390747771-6e5a4397c4cd?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="22_김호찬_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">22_김호찬_입시곡</h3> 
      <p class="card-creator">김호찬</p>
    </div>
</div>

<!-- 22_김태현_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1601277881984-b160c9322ce9?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="22_김태현_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">22_김태현_입시곡</h3> 
      <p class="card-creator">김태현</p>
    </div>
</div>

<!-- 22_김우솔_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1712205925288-631adbb2dc9f?q=80&w=2085&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="22_김우솔_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">22_김우솔_입시곡</h3> 
      <p class="card-creator">김우솔</p>
    </div>
</div>

<!-- 22_김선호_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1722746123752-62bb3286a543?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="22_김선호_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">22_김선호_입시곡</h3> 
      <p class="card-creator">김선호</p>
    </div>
</div>

<!-- 22_김민기_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1655308976421-346b8abf50e2?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="22_김민기_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">22_김민기_입시곡</h3> 
      <p class="card-creator">김민기</p>
    </div>
</div>

<!-- 22_고필승_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1567607662209-76227e6f940e?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="22_고필승_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">22_고필승_입시곡</h3> 
      <p class="card-creator">고필승</p>
    </div>
</div>

<!-- 22_강온유_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1590292889777-f22fb1046670?q=80&w=2086&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="22_강온유_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">22_강온유_입시곡</h3> 
      <p class="card-creator">강온유</p>
    </div>
</div>

<!-- 21_강하늘_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1515985177081-3d606b747649?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="21_강하늘_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">21_강하늘_입시곡</h3> 
      <p class="card-creator">강하늘</p>
    </div>
</div>

<!-- 21_고필승_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1545125610-f55ef71bfd1f?q=80&w=2107&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="21_고필승_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">21_고필승_입시곡</h3> 
      <p class="card-creator">고필승</p>
    </div>
</div>

<!-- 21_목서연_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1567320743368-9db24e12ebf0?q=80&w=2039&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="21_목서연_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">21_목서연_입시곡</h3> 
      <p class="card-creator">목서연</p>
    </div>
</div>

<!-- 21_박채웅_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1532085755448-a67fd3b518b2?q=80&w=2074&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="21_박채웅_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">21_박채웅_입시곡</h3> 
      <p class="card-creator">박채웅</p>
    </div>
</div>

<!-- 21_양한나_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1617103539311-b92a6d2c0c1c?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="21_양한나_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">21_양한나_입시곡</h3> 
      <p class="card-creator">양한나</p>
    </div>
</div>

<!-- 21_유동건_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1741945939193-0293c3c9e87f?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="21_유동건_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">21_유동건_입시곡</h3> 
      <p class="card-creator">유동건</p>
    </div>
</div>

<!-- 21_이강민_입시곡 -->
<div class="card">
    <img src="https://images.unsplash.com/photo-1630739190907-f1f30318b7c4?q=80&w=2049&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="21_이강민_입시곡"> 
    <div class="card-info">
      <h3 class="card-title">21_이강민_입시곡</h3> 
      <p class="card-creator">이강민</p>
    </div>
</div>


  <!-- 카드 개수는 필요에 따라 추가 -->
</div>
      </section>
    `,
    album: `
    <section class="album-content">
      <h2>앨범발매</h2>
      <p>최근 유통된 앨범을 소개합니다.</p>
      <img src="image/swiper1.jpg" style="width:100%; height:auto; max-width:1200px;" alt="앨범발매">
    </section>
  `,
    gallery: `
    <section class="gallery-content">
      <h2>수업소개</h2>
      <p>음악이 흐르는 공간</p>
      <img src="image/swiper2.jpg" style="width:100%; height:auto; max-width:1200px;" alt="악기수업">
      <img src="image/swiper3.jpg" style="width:100%; height:auto; max-width:1200px;" alt="미디수업">
    </section>
  `,
  
  instructors: `
  <section class="instructors-content">
    <h2>아티스트</h2>
    <p>전문가와 함께하는 음악 여정</p>
  </section>
`,

    admissions: `
      <section class="admissions-content">
        <h2>입시현황</h2>
        <p>꿈을 현실로 만든 성공 사례</p>
        <div class="accordion">
          <div class="accordion-item">
            <div class="accordion-header">2025년도 합격 현황</div>
            <div class="accordion-content">
              <p>2025년도 다양한 전공 분야에서 우수한 성적으로 합격한 학생들이 있습니다.</p>
            </div>
          </div>
          <div class="accordion-item">
            <div class="accordion-header">학생 인터뷰</div>
            <div class="accordion-content">
              <p>"MIDIPRO실용음악학원에서의 교육이 제 음악적 꿈을 이룰 수 있게 도와주었습니다."</p>
                    <div class="instructor-videos">
        <iframe width="300" height="200"
          src="https://youtu.be/EZ46v7oM4xY?si=Ro3PKarSMZg1U_MD"
          title="YouTube video player" frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
        <iframe width="300" height="200"
          src="https://youtu.be/mQO8v8wvHGw?si=3fHLwOB0L85b3i3V"
          title="YouTube video player" frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
        <iframe width="300" height="200"
          src="https://youtu.be/e0BjfFWafdo?si=7PMHNM7058r7dxuq"
          title="YouTube video player" frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe><iframe width="300" height="200"
          src="https://youtu.be/boKWEqD18Zo?si=CzhQAme9AgXCyPAR"
          title="YouTube video player" frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe><iframe width="300" height="200"
          src="https://youtu.be/6U4Z1CvYTa4?si=pAZPpz9D6Zt9TEqa"
          title="YouTube video player" frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe><iframe width="300" height="200"
          src="https://youtu.be/mrxd3lzA1HI?si=bH-by8WJqtyIJOLr"
          title="YouTube video player" frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
      </div>
            </div>
          </div>
        </div>
      </section>
    `,
    directions: `
      <section class="directions-content">
        <h2>오는길</h2>
        <p>저희 학원의 위치 및 연락처를 확인하세요.</p>
        <div class="directions-info">
          <p><strong>주소:</strong> 충청남도 천안시 서북구 불당21로 65</p>
          <p><strong>전화번호:</strong> 041-558-3101</p>
          <p><strong>SNS:</strong> <a href="https://www.youtube.com/@midipro_159sound" target="_blank" rel="noopener noreferrer">youtube</a> | <a href="http://instagram.com/midipro__" target="_blank" rel="noopener noreferrer">Instagram</a></p>
        </div>
      </section>
    `
  };

  let currentRoute = 'home';
  const appContent = document.getElementById('app-content');

  function loadRoute(routeName) {
    const newContent = routes[routeName] || routes.home;
    appContent.innerHTML = newContent;
    currentRoute = routeName;
    if (routeName === 'admissions') {
      initAccordion();
    }
    if (routeName === 'home') {
      initSlider();
      initFullSlider();
      initCardTitleLinks();
      initAudioPlayer(); // 한 번만 초기화됨 (audioInitialized 플래그 때문에)
    }
    if (routeName === 'gallery') {
      initGalleryAccordion();
      initSlider();
      initFullSlider();
    }
    if (routeName === 'album') {
      initSlider();
      initFullSlider();
    }
  }

  loadRoute('home');

  const navLinks = document.querySelectorAll('nav ul li a[data-route]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const routeName = link.getAttribute('data-route');
      loadRoute(routeName);
    });
  });



  /* -------------------------------------------------
     2) 오디오 플레이어 초기화 및 기능 구현
  ------------------------------------------------- */
  function initAudioPlayer() {
    // 한 번 초기화되면 재실행하지 않음
    if (audioInitialized) return;
    audioInitialized = true;

    audioElement = document.getElementById("audioElement");
    playPauseBtn = document.getElementById("playPauseBtn");
    currentTrackSpan = document.getElementById("currentTrack");
    const trackList = document.getElementById("track-list");
    const seekBar = document.getElementById("seekBar");
    const volumeBar = document.getElementById("volumeBar");
    const currentTimeDisplay = document.getElementById("currentTime");

    if (audioElement && trackList) {
      const audioPrevBtn = document.getElementById("prevBtn");
      const audioNextBtn = document.getElementById("nextBtn");
      const trackListItems = trackList.querySelectorAll("li");

      const tracks = Array.from(trackListItems).map(item => ({
        src: item.getAttribute("data-audio-src"),
        title: item.textContent.trim()
      }));

      trackListItems.forEach((item, index) => {
        item.addEventListener("click", () => {
          currentTrackIndex = index;
          loadAndPlayTrack(tracks[index].src, tracks[index].title);
        });
      });

      playPauseBtn.addEventListener("click", () => {
        if (audioElement.paused) {
          audioElement.play();
          playPauseBtn.textContent = "Pause";
        } else {
          audioElement.pause();
          playPauseBtn.textContent = "Play";
        }
      });

      audioPrevBtn.addEventListener("click", () => {
        if (currentTrackIndex > 0) {
          currentTrackIndex--;
          loadAndPlayTrack(tracks[currentTrackIndex].src, tracks[currentTrackIndex].title);
        }
      });

      audioNextBtn.addEventListener("click", () => {
        if (currentTrackIndex < tracks.length - 1) {
          currentTrackIndex++;
          loadAndPlayTrack(tracks[currentTrackIndex].src, tracks[currentTrackIndex].title);
        }
      });

      audioElement.addEventListener("timeupdate", () => {
        if (audioElement.duration) {
          const progress = (audioElement.currentTime / audioElement.duration) * 100;
          seekBar.value = progress;
          let minutes = Math.floor(audioElement.currentTime / 60);
          let seconds = Math.floor(audioElement.currentTime % 60);
          if (seconds < 10) seconds = "0" + seconds;
          currentTimeDisplay.textContent = `${minutes}:${seconds}`;
        }
      });

      seekBar.addEventListener("input", () => {
        if (audioElement.duration) {
          audioElement.currentTime = (seekBar.value / 100) * audioElement.duration;
        }
      });

      volumeBar.addEventListener("input", () => {
        audioElement.volume = volumeBar.value;
      });

      function loadAndPlayTrack(src, title) {
        if (audioElement && playPauseBtn && currentTrackSpan) {
          audioElement.src = src;
          audioElement.play();
          playPauseBtn.textContent = "Pause";
          currentTrackSpan.textContent = `Now Playing: ${title}`;
          
          const trackListItems = document.querySelectorAll("#track-list li");
          trackListItems.forEach(item => item.classList.remove("active"));
          if (currentTrackIndex >= 0 && trackListItems[currentTrackIndex]) {
            trackListItems[currentTrackIndex].classList.add("active");
          }
        }
      }
      window.loadAndPlayTrack = loadAndPlayTrack;
    }
  }

  /* -------------------------------------------------
     3) 카드 제목 클릭 시 오디오 재생 (연동)
     - 카드 제목과 음원리스트 항목의 텍스트를 비교하여 일치하면 해당 트랙을 재생
  ------------------------------------------------- */
  function initCardTitleLinks() {
    const cardTitles = document.querySelectorAll('.card-title');
    const trackListItems = document.querySelectorAll('#track-list li');
    cardTitles.forEach(title => {
      title.addEventListener('click', (e) => {
        e.preventDefault();
        const cardTitleText = title.textContent.trim();
        let foundIndex = -1;
        trackListItems.forEach((item, index) => {
          if (item.textContent.trim() === cardTitleText) {
            foundIndex = index;
          }
        });
        if (foundIndex !== -1) {
          const audioSrc = trackListItems[foundIndex].getAttribute('data-audio-src');
          currentTrackIndex = foundIndex;
          loadAndPlayTrack(audioSrc, cardTitleText);
        } else {
          // Fallback: use card's data-audio-src
          const audioSrc = title.getAttribute('data-audio-src');
          if (audioSrc) {
            loadAndPlayTrack(audioSrc, cardTitleText);
          } else {
            console.warn("data-audio-src가 설정되어 있지 않습니다:", cardTitleText);
          }
        }
      });
    });
  }

  function initCardClickLinks() {
    const cards = document.querySelectorAll('.card');
    const trackListItems = document.querySelectorAll('#track-list li');
    
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        // 카드 내의 제목 요소 찾기
        const titleElement = card.querySelector('.card-title');
        if (!titleElement) return;
        
        const cardTitleText = titleElement.textContent.trim();
        let foundIndex = -1;
        
        // 음원 리스트와 제목 비교
        trackListItems.forEach((item, index) => {
          if (item.textContent.trim() === cardTitleText) {
            foundIndex = index;
          }
        });
        
        if (foundIndex !== -1) {
          const audioSrc = trackListItems[foundIndex].getAttribute('data-audio-src');
          currentTrackIndex = foundIndex;
          loadAndPlayTrack(audioSrc, cardTitleText);
        } else {
          // fallback: 카드에 직접 data-audio-src 속성이 있는 경우
          const audioSrc = card.getAttribute('data-audio-src') || titleElement.getAttribute('data-audio-src');
          if (audioSrc) {
            loadAndPlayTrack(audioSrc, cardTitleText);
          } else {
            console.warn("data-audio-src가 설정되어 있지 않습니다:", cardTitleText);
          }
        }
      });
    });
  }
  
  /* -------------------------------------------------
     4) 아코디언 초기화 (입시현황용)
  ------------------------------------------------- */
  function initAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
      header.addEventListener('click', () => {
        header.classList.toggle('active');
        const content = header.nextElementSibling;
        content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
      });
    });
  }

  /* -------------------------------------------------
     5) 슬라이더 초기화 (기존 슬라이더)
  ------------------------------------------------- */
  function initSlider() {
    const sliderContainer = document.querySelector('.slider-container');
    if (!sliderContainer) return;
    const slider = sliderContainer.querySelector('.slider');
    const slides = slider.querySelectorAll('.slide');
    const sliderPrevBtn = sliderContainer.querySelector('.slider-arrow.prev');
    const sliderNextBtn = sliderContainer.querySelector('.slider-arrow.next');
    let currentIndex = 0;
    const totalSlides = slides.length;
    
    function updateSlider() {
      slider.style.transform = `translateX(-${currentIndex * 100}%)`;
    }
    
    if (sliderPrevBtn) {
      sliderPrevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        updateSlider();
      });
    }
    if (sliderNextBtn) {
      sliderNextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % totalSlides;
        updateSlider();
      });
    }
  }

  /* -------------------------------------------------
     6) full-slider 초기화
  ------------------------------------------------- */
  function initFullSlider() {
    const fullSliderContainer = document.querySelector('.full-slider-container');
    if (!fullSliderContainer) return;
    
    const fullSlider = fullSliderContainer.querySelector('.full-slider');
    let fullSlides = fullSlider.querySelectorAll('.full-slide');
    const fullPrevBtn = fullSliderContainer.querySelector('.full-slider-arrow.full-prev');
    const fullNextBtn = fullSliderContainer.querySelector('.full-slider-arrow.full-next');
    let fullCurrentIndex = 0;
    const fullSlideWidth = 150;
    
    const originalSlideCount = fullSlides.length;
    const firstSlideClone = fullSlides[0].cloneNode(true);
    fullSlider.appendChild(firstSlideClone);
    
    fullSlides = fullSlider.querySelectorAll('.full-slide');
    const totalSlides = fullSlides.length;
    
    fullSlider.style.width = `${totalSlides * fullSlideWidth}px`;
    
    function updateFullSlider(animate = true) {
      fullSlider.style.transition = animate ? 'transform 0.5s ease-in-out' : 'none';
      fullSlider.style.transform = `translateX(-${fullCurrentIndex * fullSlideWidth}px)`;
    }
    
    fullNextBtn.addEventListener('click', () => {
      fullCurrentIndex++;
      updateFullSlider();
      if (fullCurrentIndex === totalSlides - 1) {
        fullSlider.addEventListener('transitionend', function handler() {
          fullSlider.removeEventListener('transitionend', handler);
          fullCurrentIndex = 0;
          updateFullSlider(false);
        });
      }
    });
    
    fullPrevBtn.addEventListener('click', () => {
      if (fullCurrentIndex === 0) {
        fullCurrentIndex = totalSlides - 1;
        updateFullSlider(false);
        setTimeout(() => {
          fullCurrentIndex--;
          updateFullSlider();
        }, 20);
      } else {
        fullCurrentIndex--;
        updateFullSlider();
      }
    });
  }

  /* -------------------------------------------------
     7) swiper 슬라이더 (mySwiper & myDynamicSwiper)
  ------------------------------------------------- */
  var swiper = new Swiper(".mySwiper", {
    loop: true,
    slidesPerView: 5,
    spaceBetween: 30,
    freeMode: true,
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    scrollbar: {
      el: ".swiper-scrollbar",
    },
  });
 
  var dynamicSwiper = new Swiper('.myDynamicSwiper', {
    loop: true,
    slidesPerView: 1,
    spaceBetween: 20,
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
      dynamicBullets: true,
    }
  });
});

  /* -------------------------------------------------
     8) 모바일 환경에서 음원리스트 열고 닫힘.
  ------------------------------------------------- */



document.addEventListener('DOMContentLoaded', () => {
  if (window.innerWidth <= 768) {
    // 네비게이션 토글 버튼 생성
    const navToggle = document.createElement('button');
    navToggle.id = 'nav-toggle';
    navToggle.textContent = '네비게이션 열기';
    document.body.appendChild(navToggle);
    
    const navElement = document.querySelector('nav');
    
    navToggle.addEventListener('click', () => {
      navElement.classList.toggle('open');
      navToggle.textContent = navElement.classList.contains('open') ? '네비게이션 닫기' : '네비게이션 열기';
    });
    
    // 음원 리스트 토글 버튼 생성
    const trackListToggle = document.createElement('button');
    trackListToggle.id = 'track-list-toggle';
    trackListToggle.textContent = '음원리스트 열기';
    document.body.appendChild(trackListToggle);
    
    const trackList = document.getElementById('track-list');
    
    trackListToggle.addEventListener('click', () => {
      trackList.classList.toggle('open');
      trackListToggle.textContent = trackList.classList.contains('open') ? '음원리스트 닫기' : '음원리스트 열기';
    });
  }
});
