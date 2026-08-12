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
