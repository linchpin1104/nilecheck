# 더나일체크 환경 설정 가이드

더나일체크 애플리케이션을 실행하기 위해서는 몇 가지 환경 변수를 설정해야 합니다. 이 문서는 필요한 환경 변수와 설정 방법을 설명합니다.

## 환경 변수 설정하기

프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:

```
# Firebase 설정
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_FIREBASE_MEASUREMENT_ID

# OpenAI API 설정 (맞춤형 제안 기능용)
OPENAI_API_KEY=YOUR_OPENAI_API_KEY

# 기타 환경변수
NEXT_PUBLIC_APP_URL=http://localhost:3000
```