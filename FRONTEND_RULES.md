# 프론트엔드 개발 규칙

## 1. 스타일링
모든 UI/UX는 Tailwind CSS 기반으로 작성
커스텀 스타일이 필요한 경우 @apply 지시문 사용
글로벌 스타일은 src/app/globals.css에서 관리
일관된 색상 시스템 및 디자인 토큰 사용

## 2. 컴포넌트

버튼, 카드, 섹션, 모달 등 기본 컴포넌트
커스텀 컴포넌트는 shadcn/ui 스타일 가이드라인 준수
React 컴포넌트는 /components 폴더에 구조화
공통 컴포넌트: /components/ui
페이지별 컴포넌트: /components/(dashboard), /components/(result) 등
차트 컴포넌트: /components/charts
레이아웃 컴포넌트: /components/layout

## 3. 라우팅 & 페이지 구조
Next.js App Router 사용
페이지는 /app/(section)/page.tsx 형식으로 구성
마케팅 페이지: /app/(marketing)
대시보드 페이지: /app/(app)/dashboard
검사 결과 페이지: /app/(app)/result
리포트 페이지: /app/(app)/report
인증서 페이지: /app/(app)/certificate

33 4. 상태 관리
서버 컴포넌트 우선 사용
React Query 사용하여 API 데이터 관리
클라이언트 상태는 Context API 또는 Zustand 사용
Firebase 연동을 위한 상태 관리 패턴 구현

## 5. API 연동
모든 API 호출은 /lib/api 모듈에서 관리
React Query hooks는 /hooks/api 디렉토리에 정의
API 응답 타입은 /types/api.ts에 정의
API 호출 실패 시 적절한 폴백 UI 구현

## 6. 아이콘 & 디자인 자산
모든 아이콘은 Lucide-react 사용
아이콘 컴포넌트는 /components/icons에서 확장/관리
디자인 에셋은 /public/assets 디렉토리에 체계적으로 관리

## 7. 국제화
i18n 지원 구현
다국어 텍스트는 /locales 디렉토리에 관리
useTranslation 훅으로 번역 사용

##8. 성능 최적화
이미지 최적화 (Next.js Image 컴포넌트 사용)
코드 스플리팅
지연 로딩 구현
Firebase Firestore 쿼리 최적화

##9. 차트 & 데이터 시각화
/components/charts 디렉토리에 모든 차트 컴포넌트 구성
검사 결과 시각화 컴포넌트 구현
리포트 데이터 시각화 컴포넌트 구현

##10. 접근성
ARIA 레이블 사용
키보드 네비게이션 지원
색상 대비 준수
반응형 디자인 (모바일 퍼스트)

##11. 테스트
주요 컴포넌트 단위 테스트 작성
핵심 페이지 E2E 테스트 구현
Firebase 연동 로직 테스