# CHECKLIST.md

프로젝트 진행하면서 TO DO LIST 정리하는 체크리스트 파일입니다.

## FRONT-END

- **(2026.03.07)**
  - ✅ 프론트엔드도 페이지 별로 코드 나누기
- **(2026.03.09)**
  - ✅ 'EDIT', 'DELETE' 아이콘 넣은 button componenet화
- **(2026.03.10)**

  - ✅ Global Button Component
  - ✅ Golbal Modal Component
- **(2026.03.11)**
  - ✅ 본문 최상단 카드 width fullscreen으로 수정

- ☑️✅ File Upload Component
- ☑️✅ ScreenLoader Component
- ☑️✅ 404 Error page
- ☑️✅ 창 새로 켜도 로그인 상태 유지되게 상태관리
- ☑️✅ E2E 테스트 도입
- ☑️✅ 마우스 포인터 귀엽게 만들기

---

### HEADER

- **(2026.03.04)**

  - ✅ 탭 정보에 들어가는 로고 및 헤더 로고 변경
  - ✅ 글씨체 바꾸기
  - ✅ 헤더 스타일링 다시 하기

- **(2026.03.11)**

  - ✅ key color 변경
  - ️✅ 지금은 Logout 버튼으로 되어 있는데 이걸 프로필 사진 동그라미로 바꾸고 그걸 클릭하면 로그아웃이랑 나오게 바꾸기
  - ️✅ 저렇게 바꾸고 나면 My Page랑 Admin랑 Logout이랑 이렇게 세 개가 그 안으로 들어가면 될 듯

---

### FOOTER

- **(2026.03.10)**

  - ✅ Footer 초기 디자인
    - FOOTER에 들어가야 하는 정보  
      [https://blog.duda.co/website-footer-design-best-practices-examples](https://blog.duda.co/website-footer-design-best-practices-examples)

- ☑️✅ Privacy, Terms에 들어가는 정보 만들기

---

## BACK-END

- **(2026.03.07)**

  - ✅ NGR 백엔드 쪽 코드 분리 로직 보기
  - ✅ VONE-API 쪽 코드 분리 로직 보기

- ☑️✅ DB 호스팅
- ☑️✅ 도메인 설정
- ☑️✅ 이미지 호스팅 할 곳 찾아보기
- ☑️✅ init.sql 관련해서 데이터 미리 넣어주는 부분들 다 없애기(코드 보면 정보 다 알 수 있으니까 아무래도... 근데 그럼 여태까지 된 것들은...? 그건 어쩔 수 없겠죠... Well... Anyway...)
- ☑️✅ 배포

---

### DESIGN

- **(2026.03.04)**
  - ✅ 프로젝트 글로벌 컬러 스타일 파일 생성 \*`**TwistersTheme.ts`\*\*\*
- **(2026.03.08)**
  - ✅ Stitch AI 활용하여 각 페이지 디자인

---

### LOGIN

- **(2026.03.07)**
  - ✅ 유저가 signup을 했을 때 바로 가입이 되는 게 아니라 허가하면 가입을 할 수 있게 변경
  - ✅ singup 로직 변경하며 데이터베이스 구조에도 변경이 들어가야 함 (isAllowed 같은 column 추가)
  - ✅ Google OAuth 로그인
  - ✅ KakaoTalk OAuth 로그인
- **(2026.03.08)**
  - ✅ 가입할 때 유저네임이 "TEST"로 시작하면 테스트 계정으로 분리
- **(2026.03.09)**

  - ✅ 메인 페이지 스타일링 조정(언어, 버튼 위치 등)
  - ✅ 카카오톡 아이콘 가져오기

- ☑️✅ 비밀번호 제한사항 걸고 정규식으로 체크 (체크하는 거 유저에게 보이게 UI/UX적으로 깔끔하게 보이게)
- ☑️✅ 같은 사람이 Google로도 가입하고 Kakao로도 가입했을 때, 이 두 사용자는 현실에서는 동일인지만 DB에서는 다른 사람임.
  이걸 어떻게 처리해야 할까 흠... 이게 Member로도 연결되는 거라서 조금 까다롭네.

- 배포 이후
  - ☑️✅ 이메일 인증
  - ☑️✅ 회원가입 승인이 완료되면 이메일로 알림 보내기

---

### HOME

- ☑️✅ 뭐가 들어가야 하는지 컨텐츠 정하기
  - ☑️✅ 사진 여러 장이 들어가면 좋을 것 같음.
- ☑️✅ 와이어 프레임 및 디자인 필요

---

### MEMBER

- **(2026.03.04)**
  - ✅ settlement 에서 전체를 불러와서 "회비"라는 것만 떼어내어갖고 만드는 API 가 필요함
- **(2026.03.08)**
  - ✅ 테스트 유저일 때 test_member DB에서 쿼리해 와서 정보 보여주기
  - ✅ Stitch AI로 디자인 완료
- **(2026.03.10)**

  - ✅ Global Modal로 변경
  - ✅ birthDate 필드 추가

- ☑️✅ member DB에서 role, description 컬럼 제거
- ☑️✅ member DB에 birthDate 컬럼 추가
- ☑️✅ JOINED AT에 대한 생각 필요. 내가 가입하는 모든 유저들이 멤버에 추가되는 게 아니라, 연결시킬려고 했었는데 이 부분에 대한 정확한 기획이 필요.
- ☑️✅ 모임 참가 여부 2025년부터 체크해서 보여주는 필드 추가(근데 이걸 어디서 manage 해야 하지? 정산처럼 settlement에서 가져올 수는 없고 그냥 users의 컬럼에 넣거나 아니면... 어케야 하나 흠... 조금 더 생각이 필요함)

---

### NOTICE

- **(2026.03.08)**
  - ✅ 테스트 유저일 때 test_notice DB에서 쿼리해 와서 정보 보여주기
  - ✅ Stitch AI로 디자인 완료
- **(2026.03.10)**
  - ✅ Global Modal로 변경
  - ️✅ notice DB에 noticeImage 컬럼 추가
  - ️✅ content에 bulletpoint를 넣을 수 있을까?

---

### SETTLEMENT

- **(2026.03.08)**
  - ✅ 테스트 유저일 때 test_settlement DB에서 쿼리해 와서 정보 보여주기
  - ✅ Stitch AI로 디자인 완료
- **(2026.03.10)**
  - ✅ Global Modal로 변경

---

### BOARD

- **(2026.03.08)**
  - ✅ 테스트 유저일 때 test_board DB에서 쿼리해 와서 정보 보여주기
  - ✅ 멤버들이 게시글 올릴 수 있는 게시판 페이지 필요
  - ✅ Stitch AI로 디자인 완료
- **(2026.03.10)**
  - ✅ Global Modal로 변경

---

### MY PAGE

- ☑️✅ 뭐가 들어가야 하는지 컨텐츠 정하기
- ☑️✅ 와이어 프레임 및 디자인 필요

---

### FLOW CHART

- **(2026.03.11)**
  - ️✅ TEST 계정이거나 ADMIN 계정이면 route 노출

- ☑️✅ 유저 타입 구분해서 플로우 차트 그리기
- ☑️✅ 플로우 차트 embed || 이미지로 첨부 (이건 해 보고 생각해보기) 

---

### ADMIN

- **(2026.03.07)**

  - ✅ 회원가입한 유저를 허가하는 로직을 만들어야 함
  - ✅ Stitch AI로 디자인 완료

- ☑️✅ 회원가입 승인 버튼만 있고 거절 버튼은 없어서 "DECLINE" 버튼 추가
- ☑️✅ 사용자 삭제 기능 도입
- ☑️✅ TEST_ADMIN 계정일 때 test_member 계정에서 member query 해오기
