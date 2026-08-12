# Carrier GreenON

Carrier GreenON은 캐리어 에어컨 사용자를 위한 ESG 친환경 냉방 미션 + GREEN POINT 리워드 웹앱입니다.

## 주요 기능

- 현재 날씨와 가상 Carrier 에어컨 상태 확인
- 필터 점검, 센서 오류, 미션 조건 위반 시 Red UI 표시
- GREEN MISSION 참여와 진행률 시뮬레이션
- 미션 성공 시 GREEN POINT 적립
- GREEN WALLET 포인트 내역 확인
- GREEN REWARD SHOP 상품 구매와 구매내역 확인
- Supabase Auth, RLS 기반 사용자별 데이터 분리

## 실행 방법

정적 웹앱이므로 `index.html`을 브라우저에서 열면 됩니다.

Supabase 연결은 `js/supabase-config.js`의 publishable key를 사용합니다. 브라우저 코드에는 `service_role` 또는 secret key를 넣지 않습니다.

## Render 배포

이 프로젝트는 정적 사이트로 배포합니다.

- Build Command: 비워둠
- Publish Directory: `.`
- 환경변수: `.env.example` 참고

## 보안

- Supabase public 테이블은 RLS를 활성화했습니다.
- 사용자별 데이터는 `auth.uid()`와 `user_id` 소유자 조건으로 제한합니다.
- 브라우저에는 Supabase publishable key만 사용합니다.

## External Code / Inspiration

- 출처: MDN Web Docs - `window.requestAnimationFrame()`
  - URL: https://developer.mozilla.org/docs/Web/API/Window/requestAnimationFrame
  - 참고한 기능: 마우스 이동 이벤트를 바로 DOM 업데이트로 연결하지 않고, `requestAnimationFrame`으로 묶어 렌더링 성능을 보호하는 방식
  - 수정한 내용: Carrier GreenON의 Windy 마스코트 눈동자 추적과 Hero 영역의 약한 parallax 효과에 맞게 CSS 변수 업데이트 방식으로 재구성
- 출처: MDN Web Docs - `prefers-reduced-motion`
  - URL: https://developer.mozilla.org/docs/Web/CSS/@media/prefers-reduced-motion
  - 참고한 기능: 사용자 환경 설정에 따라 불필요한 애니메이션을 줄이는 접근성 패턴
  - 수정한 내용: Windy floating, sparkle, hover transition을 reduced motion 환경에서 사실상 비활성화하도록 CSS에 적용
- 출처: MDN Web Docs - CSS `transform`
  - URL: https://developer.mozilla.org/docs/Web/CSS/transform
  - 참고한 기능: `translate`, `rotate`, `scale` 기반의 GPU 친화적인 micro interaction
  - 수정한 내용: 카드 hover, 버튼 hover, Windy 근접 반응을 Carrier GreenON UI 톤에 맞게 약한 움직임으로 조정
