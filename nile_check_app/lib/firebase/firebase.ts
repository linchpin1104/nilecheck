import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 설정 로깅
console.log("[Firebase] 환경 변수 설정 확인:", {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "설정됨" : "누락",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "누락",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "누락",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "누락",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? "설정됨" : "누락",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "설정됨" : "누락",
});

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  if (!getApps().length) {
    console.log("[Firebase] 새 Firebase 앱 인스턴스 초기화 중");
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      console.error("[Firebase] 중요 환경 변수 누락: API Key 또는 Project ID가 설정되지 않았습니다");
    }
    app = initializeApp(firebaseConfig);
  } else {
    console.log("[Firebase] 기존 Firebase 앱 인스턴스 사용");
    app = getApp();
  }

  db = getFirestore(app);
  auth = getAuth(app);
  console.log("[Firebase] 초기화 성공. Firestore와 Auth 준비됨.");
  
  // Firestore 연결 확인
  try {
    // 테스트 컬렉션 참조만 확인
    collection(db, 'test_connection');
    console.log("[Firebase] Firestore 연결 확인: 성공");
  } catch (connectionError) {
    console.error("[Firebase] Firestore 연결 테스트 실패:", connectionError);
  }

  // Enable offline persistence for Firestore
  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db)
      .then(() => console.log("Firestore offline persistence enabled."))
      .catch((err) => {
        if (err.code == 'failed-precondition') {
          console.log('Offline persistence failed: Multiple tabs open.');
        } else if (err.code == 'unimplemented') {
          console.log('Offline persistence failed: Browser does not support.');
        } else {
          console.error('Offline persistence failed with error:', err);
        }
      });
  }
} catch (error) {
  console.error("Error during Firebase initialization:", error);
  // To prevent further errors if initialization fails, assign placeholder values
  // @ts-expect-error - app may be undefined, assigning default value
  app = app || null;
  // @ts-expect-error - db may be undefined, assigning default value
  db = db || null;
  // @ts-expect-error - auth may be undefined, assigning default value
  auth = auth || null;
}

export { app, db, auth }; 