# 백엔드 개발 규칙

## 1. 아키텍처 분리
- Next.js API Route는 외부 API 호출만 담당

## 2. API 엔드포인트
사용자 인증 API
POST /api/auth/register - 사용자 등록
POST /api/auth/login - 로그인
POST /api/auth/logout - 로그아웃
GET /api/auth/me - 현재 사용자 정보
데이터 API
GET /api/data - 사용자의 모든 데이터 가져오기
POST /api/meals - 식사 기록 추가
PUT /api/meals/:id - 식사 기록 업데이트
GET /api/meals/date/:date - 특정 날짜의 식사 기록
GET /api/meals/week/:date - 특정 주의 식사 기록
POST /api/sleep - 수면 기록 추가
PUT /api/sleep/:id - 수면 기록 업데이트
GET /api/sleep/date/:date - 특정 날짜의 수면 기록
GET /api/sleep/week/:date - 특정 주의 수면 기록
POST /api/checkins - 체크인 추가
GET /api/checkins/date/:date - 특정 날짜의 체크인
GET /api/checkins/week/:date - 특정 주의 체크인
POST /api/wellness-reports - 웰니스 리포트 추가
GET /api/wellness-reports - 모든 웰니스 리포트
GET /api/wellness-reports/latest - 최신 웰니스 리포트

## 3. Cursor 작업 범위 제한
- 랜딩 페이지 및 마케팅용 프론트엔드 개발
- UI 컴포넌트 설계 및 구현
- 외부 API 연동 및 호출 로직
- 평가 기능은 API 호출만 구현 (내부 로직 제외)

## 4. 제외 항목 (명시적 배제)
- GPT API 연동 및 구현
- 데이터베이스 설계 및 관리
- 서버 사이드 비즈니스 로직

## 5. API 연동 규칙
환경 변수를 통한 API 키 관리
API 응답 타입 정의 및 타입 안전성 보장
에러 핸들링 및 로깅 구현
API 호출 실패 시 적절한 폴백 처리
요청/응답 표준 포맷 정의

## 6. 보안
API 키 및 민감 정보는 환경 변수로 관리
CORS 설정 및 보안 헤더 적용
API 요청 인증 및 권한 검증
JWT 기반 토큰 인증 시스템 구현

## 7. 문서화
API 엔드포인트 문서화
요청/응답 스키마 정의
에러 코드 및 메시지 정의
Swagger 또는 유사 도구로 API 문서 자동화

## 8. DB저장 환경
Firebase Firestore를 주요 데이터베이스로 사용
데이터 구조 최적화 (컬렉션 및 문서 설계)
인덱싱 및 쿼리 최적화
데이터 백업 및 복구 전략